import { HttpBackend, HttpClient, HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, of, switchMap, throwError, timer } from 'rxjs';
import { ApiError, Db, DbActivity, DbNotification, DbRegistration, DbUser } from './mock-db';

const STORAGE_KEY = 'sdd-db-v1';
const HOUR = 3600_000;

/**
 * Simulated REST server. Seed data is loaded from JSON files with HttpClient and every
 * write (POST/PUT/DELETE) is applied here, with the same business rules a real API would enforce.
 * State is persisted in localStorage so the prototype survives page reloads.
 */
@Injectable()
export class MockBackendService {
  private readonly rawHttp: HttpClient;
  private db: Db | null = null;

  constructor(backend: HttpBackend) {
    this.rawHttp = new HttpClient(backend); // bypasses interceptors -> reads real JSON assets
    window.addEventListener('storage', e => {
      if (e.key === STORAGE_KEY) this.db = null; // another tab changed the data
    });
  }

  handle(req: HttpRequest<unknown>): Observable<HttpResponse<unknown>> {
    const latency = 200 + Math.random() * 250;
    return timer(latency).pipe(
      switchMap(() => this.loadDb()),
      switchMap(db => {
        try {
          const body = this.route(db, req);
          if (this.db === db) this.persist(db); // skipped after /reset
          return of(new HttpResponse({ status: 200, body }));
        } catch (e) {
          if (e instanceof ApiError) {
            return throwError(() => new HttpErrorResponse({ status: e.status, error: { message: e.message }, url: req.url }));
          }
          throw e;
        }
      })
    );
  }

  // ---------------------------------------------------------------- storage
  private loadDb(): Observable<Db> {
    if (this.db) return of(this.db);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.db = JSON.parse(saved) as Db;
        this.db.users.forEach(user => { user.status = user.status ?? 'approved'; });
        this.db.approvalHistory = this.db.approvalHistory ?? [];
        this.db.deletedAccounts = this.db.deletedAccounts ?? [];
        return of(this.db);
      } catch { /* corrupted -> reseed */ }
    }
    return this.seed();
  }

  private seed(): Observable<Db> {
    return forkJoin({
      users: this.rawHttp.get<DbUser[]>('data/users.json'),
      activities: this.rawHttp.get<any[]>('data/activities.json'),
      registrations: this.rawHttp.get<any[]>('data/registrations.json'),
      notifications: this.rawHttp.get<any[]>('data/notifications.json'),
      settings: this.rawHttp.get<any>('data/reminder-settings.json')
    }).pipe(
      switchMap(seed => {
        const now = Date.now();
        const iso = (ms: number) => new Date(ms).toISOString();
        const activities: DbActivity[] = seed.activities.map(a => ({
          id: a.id, ngoName: a.ngoName, title: a.title, serviceType: a.serviceType,
          description: a.description, imageUrl: a.imageUrl ?? null, location: a.location,
          startAt: iso(now + a.startsInHours * HOUR),
          endAt: iso(now + (a.startsInHours + a.durationHours) * HOUR),
          cutoffAt: iso(now + a.cutoffInHours * HOUR),
          maxParticipants: a.maxParticipants, qrToken: null, createdAt: iso(now - 20 * 24 * HOUR)
        }));
        const byId = new Map(activities.map(a => [a.id, a]));
        const registrations: DbRegistration[] = seed.registrations.map(r => ({
          id: r.id, userId: r.userId, activityId: r.activityId,
          registeredAt: iso(now - r.registeredHoursAgo * HOUR), status: 'registered', cancelledAt: null,
          checkedInAt: r.checkedInMinutesAfterStart == null
            ? null : iso(new Date(byId.get(r.activityId)!.startAt).getTime() + r.checkedInMinutesAfterStart * 60000)
        }));
        // QR codes exist for past / ongoing activities so reports & check-in can be demonstrated
        ['a6', 'a8'].forEach(id => { const a = byId.get(id); if (a) a.qrToken = this.newToken(id); });
        const notifications: DbNotification[] = seed.notifications.map(n => ({
          id: n.id, audience: n.audience, recipientIds: n.recipientIds, recipientLabel: n.recipientLabel,
          ngoName: n.ngoName, activityId: n.activityId, type: n.type, title: n.title, message: n.message,
          urgent: n.urgent, createdAt: iso(now - n.hoursAgo * HOUR), readBy: []
        }));
        this.db = {
          users: seed.users, approvalHistory: [], deletedAccounts: [], activities, registrations, notifications,
          settings: seed.settings, sentKeys: [], seq: 1000
        };
        this.persist(this.db);
        return of(this.db);
      })
    );
  }

  private persist(db: Db): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch { /* quota / private mode */ }
  }

  private nextId(db: Db, prefix: string): string {
    return `${prefix}${++db.seq}`;
  }

  private newToken(activityId: string): string {
    return `SDQR-${activityId.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  private permanentlyDeleteUser(db: Db, userId: string, email: string, name?: string, reason: string = 'Permanently deleted'): void {
    db.deletedAccounts = db.deletedAccounts ?? [];
    const normalizedEmail = email.trim().toLowerCase();
    if (!db.deletedAccounts.some(d => d.email.toLowerCase() === normalizedEmail)) {
      db.deletedAccounts.push({
        email: normalizedEmail,
        userId,
        name,
        deletedAt: new Date().toISOString(),
        reason
      });
    }
    db.users = db.users.filter(u => u.id !== userId && u.email.toLowerCase() !== normalizedEmail);
    db.registrations = db.registrations.filter(r => r.userId !== userId);
    db.notifications = db.notifications.filter(n => {
      if (Array.isArray(n.recipientIds)) {
        return !n.recipientIds.includes(userId);
      }
      return true;
    });
    if (db.approvalHistory) {
      const hist = db.approvalHistory.find(h => h.userId === userId || h.email.toLowerCase() === normalizedEmail);
      if (hist) {
        hist.accountDeleted = true;
      }
    }
  }

  // ---------------------------------------------------------------- routing
  private route(db: Db, req: HttpRequest<unknown>): unknown {
    const url = new URL(req.url, window.location.origin);
    const seg = url.pathname.replace(/^\/api\//, '').split('/').filter(Boolean);
    const body = (req.body ?? {}) as any;
    const method = req.method;

    if (seg[0] === 'auth' && seg[1] === 'login' && method === 'POST') return this.login(db, body, 'employee');
    if (seg[0] === 'auth' && seg[1] === 'admin-login' && method === 'POST') return this.login(db, body, 'admin');
    if (seg[0] === 'auth' && seg[1] === 'register' && method === 'POST') return this.register(db, body);
    if (seg[0] === 'reset' && method === 'POST') { localStorage.removeItem(STORAGE_KEY); this.db = null; return { ok: true }; }

    const me = this.currentUser(db, req);
    this.runScheduler(db);
    if (me.status === 'unapproved' || me.status === 'rejected') {
      if (!this.pendingAccountAllowed(seg, method)) {
        throw new ApiError(403, me.status === 'rejected' ? 'Your account was not approved. Review the message in Notifications.' : 'Your account is still in approval process. You cannot apply for activities until an administrator approves it.');
      }
    }
    if (seg[0] === 'users' && seg[1] === 'me' && method === 'GET') return this.publicUser(me);

    if (seg[0] === 'users' && seg[1] === 'pending' && method === 'GET') {
      this.requireAdmin(me);
      return db.users.filter(u => u.role === 'employee' && u.status === 'unapproved').map(u => this.publicUser(u));
    }
    if (seg[0] === 'users' && seg[1] && seg.length === 2 && method === 'DELETE') {
      this.requireAdmin(me);
      const user = db.users.find(u => u.id === seg[1]);
      if (!user) throw new ApiError(404, 'User not found.');
      if (user.role === 'admin') throw new ApiError(400, 'Cannot delete an administrator account.');
      this.permanentlyDeleteUser(db, user.id, user.email, user.name, 'Deleted by administrator');
      return { ok: true };
    }
    if (seg[0] === 'users' && seg[1] === 'approval-history' && method === 'GET') {
      this.requireAdmin(me);
      return db.approvalHistory ?? [];
    }
    if (seg[0] === 'users' && seg[1] === 'approval-history' && seg[2] && method === 'DELETE') {
      this.requireAdmin(me);
      const historyItem = (db.approvalHistory ?? []).find(item => item.id === seg[2]);
      if (historyItem) {
        this.permanentlyDeleteUser(db, historyItem.userId, historyItem.email, historyItem.name, 'Deleted by administrator from history');
        db.approvalHistory = (db.approvalHistory ?? []).filter(item => item.id !== seg[2]);
      }
      return { ok: true };
    }
    if (seg[0] === 'users' && seg[1] === 'rejection' && method === 'GET') {
      return this.publicUser(this.findRejectedAccount(db, me));
    }
    if (seg[0] === 'users' && seg[1] === 'rejection' && seg[2] === 'confirm' && method === 'POST') {
      const user = this.findRejectedAccount(db, me);
      this.permanentlyDeleteUser(db, user.id, user.email, user.name, 'Confirmed by user rejection');
      if (db.approvalHistory) {
        const hist = db.approvalHistory.find(h => h.userId === user.id || h.email.toLowerCase() === user.email.toLowerCase());
        if (hist) {
          hist.userConfirmed = true;
          hist.accountDeleted = true;
        }
      }
      return { ok: true };
    }
    if (seg[0] === 'users' && seg[2] === 'approve' && method === 'POST') {
      this.requireAdmin(me);
      const user = db.users.find(u => u.id === seg[1] && u.role === 'employee' && u.status === 'unapproved');
      if (!user) throw new ApiError(404, 'Pending user not found.');
      const result = this.decideAccount(db, me, user, 'approved', String(body.message ?? '').trim());
      this.pushNotification(db, { audience: 'employee', recipientIds: [user.id], recipientLabel: user.name, type: 'approval', title: 'Account approved', message: body.message?.trim() || 'Your account is approved. You can now apply for activities.' });
      return result;
    }
    if (seg[0] === 'users' && seg[2] === 'reject' && method === 'POST') {
      this.requireAdmin(me);
      const user = db.users.find(u => u.id === seg[1] && u.role === 'employee' && u.status === 'unapproved');
      if (!user) throw new ApiError(404, 'Pending user not found.');
      const result = this.decideAccount(db, me, user, 'rejected', String(body.message ?? '').trim());
      this.pushNotification(db, { audience: 'employee', recipientIds: [user.id], recipientLabel: user.name, type: 'rejection', title: 'Account not approved', message: `${body.message?.trim() ? `${body.message.trim()} ` : ''}Confirming will permanently delete your account.` });
      return result;
    }

    switch (seg[0]) {
      case 'users':
        this.requireAdmin(me);
        return db.users.filter(u => u.role === 'employee' && u.status === 'approved').map(u => this.publicUser(u));
      case 'activities':
        return this.activitiesRoute(db, me, method, seg, body);
      case 'registrations':
        return this.registrationsRoute(db, me, method, seg, body, url.searchParams);
      case 'checkin':
        if (method === 'POST') return this.checkIn(db, me, body);
        break;
      case 'notifications':
        return this.notificationsRoute(db, me, method, seg, body, url.searchParams);
      case 'reminder-settings':
        if (method === 'GET') return db.settings;
        if (method === 'PUT') { this.requireAdmin(me); db.settings = { rules: body.rules, notifyNgos: !!body.notifyNgos }; return db.settings; }
        break;
    }
    throw new ApiError(404, 'Endpoint not found.');
  }

  // ---------------------------------------------------------------- auth
  private publicUser(u: DbUser) {
    const { password, ...rest } = u;
    return { ...rest, status: u.status ?? 'approved' };
  }

  private decideAccount(db: Db, admin: DbUser, user: DbUser, decision: 'approved' | 'rejected', message: string) {
    const decidedAt = new Date().toISOString();
    user.status = decision;
    user.decisionMessage = message;
    user.decisionAt = decidedAt;
    db.approvalHistory = db.approvalHistory ?? [];
    db.approvalHistory.unshift({
      id: this.nextId(db, 'ah'), userId: user.id, name: user.name, email: user.email,
      department: user.department, jobTitle: user.jobTitle, decision, message, decidedAt, decidedBy: admin.name
    });
    return this.publicUser(user);
  }

  private findRejectedAccount(db: Db, me: DbUser): DbUser {
    const user = db.users.find(item => item.id === me.id && item.role === 'employee' && item.status === 'rejected');
    if (!user) throw new ApiError(404, 'No rejected account is awaiting confirmation.');
    return user;
  }

  private register(db: Db, body: any) {
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const department = String(body.department ?? '').trim();
    const jobTitle = String(body.jobTitle ?? '').trim();
    if (!name || !email || !password || !department || !jobTitle) throw new ApiError(400, 'Complete all registration fields.');
    if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters.');
    db.deletedAccounts = db.deletedAccounts ?? [];
    if (db.deletedAccounts.some(d => d.email.toLowerCase() === email)) {
      throw new ApiError(403, 'This account has been permanently deleted and cannot be registered or used again.');
    }
    if (db.users.some(u => u.email.toLowerCase() === email)) throw new ApiError(409, 'An account with this email already exists.');
    const user: DbUser = {
      id: this.nextId(db, 'u'), name, email, password, role: 'employee', status: 'unapproved', department, jobTitle
    };
    db.users.push(user);
    return this.publicUser(user);
  }

  private login(db: Db, body: any, role: 'admin' | 'employee') {
    const email = String(body.email ?? '').trim().toLowerCase();
    db.deletedAccounts = db.deletedAccounts ?? [];
    if (db.deletedAccounts.some(d => d.email.toLowerCase() === email)) {
      throw new ApiError(403, 'This account has been permanently deleted and cannot be used or signed in again.');
    }
    const user = db.users.find(u => u.email.toLowerCase() === email && u.password === body.password && u.role === role);
    if (!user) throw new ApiError(401, 'Invalid email or password.');
    return { user: this.publicUser(user), token: `mock.${user.id}` };
  }

  private currentUser(db: Db, req: HttpRequest<unknown>): DbUser {
    const auth = req.headers.get('Authorization') ?? '';
    const id = auth.replace('Bearer mock.', '');
    const user = db.users.find(u => u.id === id);
    if (!user) {
      db.deletedAccounts = db.deletedAccounts ?? [];
      if (db.deletedAccounts.some(d => d.userId === id)) {
        throw new ApiError(401, 'This account has been permanently deleted and cannot be used.');
      }
      throw new ApiError(401, 'Please sign in again.');
    }
    return user;
  }

  private requireAdmin(me: DbUser): void {
    if (me.role !== 'admin') throw new ApiError(403, 'Administrator access required.');
  }

  /** Endpoints an account awaiting approval (or a rejected one) may still reach. */
  private pendingAccountAllowed(seg: string[], method: string): boolean {
    const readOnly = method === 'GET' && ['activities', 'registrations', 'notifications'].includes(seg[0]);
    const ownProfile = seg[0] === 'users' && seg[1] === 'me' && method === 'GET';
    const rejection = seg[0] === 'users' && seg[1] === 'rejection' && (method === 'GET' || (seg[2] === 'confirm' && method === 'POST'));
    const notificationRead = seg[0] === 'notifications' && (
      (method === 'POST' && seg[1] === 'read-all') || (method === 'PUT' && seg[2] === 'read')
    );
    return readOnly || ownProfile || rejection || notificationRead;
  }

  // ---------------------------------------------------------------- activities
  private activeCount(db: Db, activityId: string): number {
    return db.registrations.filter(r => r.activityId === activityId && r.status === 'registered').length;
  }

  private viewActivity(db: Db, a: DbActivity) {
    return { ...a, registeredCount: this.activeCount(db, a.id) };
  }

  private validateActivity(b: any): void {
    const required = ['ngoName', 'title', 'serviceType', 'description', 'location', 'startAt', 'endAt', 'cutoffAt'];
    for (const f of required) if (!String(b[f] ?? '').trim()) throw new ApiError(400, `Field "${f}" is required.`);
    if (!Number.isInteger(+b.maxParticipants) || +b.maxParticipants < 1) throw new ApiError(400, 'Maximum employees must be at least 1.');
    const s = new Date(b.startAt).getTime(), e = new Date(b.endAt).getTime(), c = new Date(b.cutoffAt).getTime();
    if (isNaN(s) || isNaN(e) || isNaN(c)) throw new ApiError(400, 'Invalid date or time.');
    if (e <= s) throw new ApiError(400, 'End time must be after the start time.');
    if (c >= s) throw new ApiError(400, 'Registration cut-off must be before the activity starts.');
  }

  private activitiesRoute(db: Db, me: DbUser, method: string, seg: string[], body: any) {
    const id = seg[1];
    if (method === 'GET' && !id) {
      return [...db.activities]
        .sort((a, b) => a.startAt.localeCompare(b.startAt))
        .map(a => this.viewActivity(db, a));
    }
    if (method === 'GET' && id) return this.viewActivity(db, this.findActivity(db, id));

    this.requireAdmin(me);

    if (method === 'POST' && !id) {
      this.validateActivity(body);
      const a: DbActivity = {
        id: this.nextId(db, 'a'), ngoName: body.ngoName.trim(), title: body.title.trim(), serviceType: body.serviceType,
        description: body.description.trim(), imageUrl: body.imageUrl || null, location: body.location.trim(), startAt: body.startAt, endAt: body.endAt,
        cutoffAt: body.cutoffAt, maxParticipants: +body.maxParticipants, qrToken: null, createdAt: new Date().toISOString()
      };
      db.activities.push(a);
      return this.viewActivity(db, a);
    }
    if (method === 'PUT' && id) {
      const a = this.findActivity(db, id);
      this.validateActivity(body);
      const taken = this.activeCount(db, id);
      if (+body.maxParticipants < taken) throw new ApiError(409, `Cannot set the maximum below the ${taken} employees already registered.`);
      const changed = (['startAt', 'endAt', 'cutoffAt', 'location', 'maxParticipants', 'title'] as const)
        .some(k => String(a[k]) !== String(body[k]));
      Object.assign(a, {
        ngoName: body.ngoName.trim(), title: body.title.trim(), serviceType: body.serviceType, description: body.description.trim(),
        location: body.location.trim(), startAt: body.startAt, endAt: body.endAt, cutoffAt: body.cutoffAt, maxParticipants: +body.maxParticipants,
        imageUrl: body.imageUrl || null
      });
      if (changed) this.notifyRegistered(db, a, 'update', 'Activity updated', `Details for "${a.title}" have changed. Please review the new schedule, location and cut-off time.`);
      this.checkLastSlots(db, a);
      return this.viewActivity(db, a);
    }
    if (method === 'DELETE' && id) {
      const a = this.findActivity(db, id);
      this.notifyRegistered(db, a, 'cancellation', 'Activity cancelled', `"${a.title}" by ${a.ngoName} is no longer available and your registration has been cancelled.`);
      db.registrations.forEach(r => {
        if (r.activityId === id && r.status === 'registered') { r.status = 'cancelled'; r.cancelledAt = new Date().toISOString(); }
      });
      db.activities = db.activities.filter(x => x.id !== id);
      return { deleted: id };
    }
    if (method === 'POST' && id && seg[2] === 'qr') {
      const a = this.findActivity(db, id);
      if (!a.qrToken || body.regenerate) a.qrToken = this.newToken(a.id);
      return this.viewActivity(db, a);
    }
    throw new ApiError(404, 'Endpoint not found.');
  }

  private findActivity(db: Db, id: string): DbActivity {
    const a = db.activities.find(x => x.id === id);
    if (!a) throw new ApiError(404, 'Activity not found.');
    return a;
  }

  // ---------------------------------------------------------------- registrations
  private viewRegistration(db: Db, r: DbRegistration) {
    const u = db.users.find(x => x.id === r.userId);
    const a = db.activities.find(x => x.id === r.activityId);
    return {
      ...r, userName: u?.name ?? 'Unknown', department: u?.department ?? '-',
      activityTitle: a?.title ?? 'Removed activity', ngoName: a?.ngoName ?? '-'
    };
  }

  private assertCanJoin(db: Db, userId: string, a: DbActivity, ignoreRegId?: string): void {
    const now = Date.now();
    if (new Date(a.cutoffAt).getTime() <= now) throw new ApiError(403, `Registration for "${a.title}" has closed.`);
    const taken = db.registrations.filter(r => r.activityId === a.id && r.status === 'registered' && r.id !== ignoreRegId).length;
    if (taken >= a.maxParticipants) throw new ApiError(409, `"${a.title}" is full. No slots are available.`);
    const mine = db.registrations.filter(r => r.userId === userId && r.status === 'registered' && r.id !== ignoreRegId);
    if (mine.some(r => r.activityId === a.id)) throw new ApiError(409, 'You are already registered for this activity.');
    const s = new Date(a.startAt).getTime(), e = new Date(a.endAt).getTime();
    const clash = mine.map(r => db.activities.find(x => x.id === r.activityId)!).find(o =>
      o && new Date(o.startAt).getTime() < e && new Date(o.endAt).getTime() > s);
    if (clash) throw new ApiError(409, `This overlaps with "${clash.title}", which you have already registered for.`);
  }

  private registrationsRoute(db: Db, me: DbUser, method: string, seg: string[], body: any, q: URLSearchParams) {
    const id = seg[1];
    if (method === 'GET') {
      let list = db.registrations.filter(r => r.status === 'registered');
      const userId = q.get('userId');
      if (me.role !== 'admin') list = list.filter(r => r.userId === me.id);
      else if (userId) list = list.filter(r => r.userId === userId);
      return list.map(r => this.viewRegistration(db, r));
    }
    if (me.role === 'admin') throw new ApiError(403, 'Only employees can register for activities.');
    if (me.status === 'unapproved' && method !== 'GET') throw new ApiError(403, 'Your account is read-only until an administrator approves it.');

    if (method === 'POST') {
      const a = this.findActivity(db, body.activityId);
      this.assertCanJoin(db, me.id, a);
      const reg: DbRegistration = {
        id: this.nextId(db, 'r'), userId: me.id, activityId: a.id, registeredAt: new Date().toISOString(),
        status: 'registered', cancelledAt: null, checkedInAt: null
      };
      db.registrations.push(reg);
      this.notifyUser(db, me.id, a, 'registration', 'Registration confirmed', `You are registered for "${a.title}" with ${a.ngoName}. You can edit or cancel until the cut-off.`);
      this.notifyNgo(db, a, 'registration', 'New volunteer registered', `${me.name} (${me.department}) registered for "${a.title}".`);
      this.checkLastSlots(db, a);
      return this.viewRegistration(db, reg);
    }

    const reg = db.registrations.find(r => r.id === id && r.status === 'registered');
    if (!reg || reg.userId !== me.id) throw new ApiError(404, 'Registration not found.');
    const current = this.findActivity(db, reg.activityId);
    if (new Date(current.cutoffAt).getTime() <= Date.now()) {
      throw new ApiError(403, 'The cut-off time has passed. You can no longer edit or cancel this registration.');
    }
    if (reg.checkedInAt) throw new ApiError(409, 'You have already checked in to this activity.');

    if (method === 'PUT') {
      const target = this.findActivity(db, body.activityId);
      if (target.id === current.id) throw new ApiError(400, 'Please choose a different activity.');
      this.assertCanJoin(db, me.id, target, reg.id);
      reg.activityId = target.id;
      reg.registeredAt = new Date().toISOString();
      this.notifyUser(db, me.id, target, 'update', 'Registration changed', `You moved from "${current.title}" to "${target.title}" (${target.ngoName}).`);
      this.notifyNgo(db, current, 'cancellation', 'Volunteer moved away', `${me.name} withdrew from "${current.title}" and joined another activity.`);
      this.notifyNgo(db, target, 'registration', 'New volunteer registered', `${me.name} (${me.department}) moved to "${target.title}".`);
      this.checkLastSlots(db, current);
      this.checkLastSlots(db, target);
      return this.viewRegistration(db, reg);
    }
    if (method === 'DELETE') {
      reg.status = 'cancelled';
      reg.cancelledAt = new Date().toISOString();
      this.notifyUser(db, me.id, current, 'cancellation', 'Registration cancelled', `You withdrew from "${current.title}". The slot is now available to others.`);
      this.notifyNgo(db, current, 'cancellation', 'Volunteer withdrew', `${me.name} cancelled their registration for "${current.title}".`);
      this.checkLastSlots(db, current);
      return { cancelled: reg.id };
    }
    throw new ApiError(404, 'Endpoint not found.');
  }

  // ---------------------------------------------------------------- check-in
  private checkIn(db: Db, me: DbUser, body: any) {
    if (me.role !== 'employee' || me.status === 'unapproved') throw new ApiError(403, 'Only approved employees can check in.');
    const code = String(body.code ?? '').trim();
    if (!code) throw new ApiError(400, 'Enter or scan a QR code.');
    const a = db.activities.find(x => x.qrToken === code);
    if (!a) throw new ApiError(404, 'This QR code is not valid.');
    const reg = db.registrations.find(r => r.activityId === a.id && r.userId === me.id && r.status === 'registered');
    if (!reg) throw new ApiError(403, `You are not registered for "${a.title}".`);
    if (reg.checkedInAt) throw new ApiError(409, 'You have already checked in for this activity.');
    const now = Date.now();
    if (now < new Date(a.startAt).getTime() - HOUR) throw new ApiError(400, 'Check-in opens 1 hour before the activity starts.');
    if (now > new Date(a.endAt).getTime()) throw new ApiError(400, 'This activity has already ended.');
    reg.checkedInAt = new Date(now).toISOString();
    this.notifyUser(db, me.id, a, 'checkin', 'Checked in', `Thank you for volunteering! Your arrival at "${a.title}" was recorded.`);
    return { registration: this.viewRegistration(db, reg), activity: this.viewActivity(db, a) };
  }

  // ---------------------------------------------------------------- notifications
  private pushNotification(db: Db, n: Partial<DbNotification> & Pick<DbNotification, 'audience' | 'type' | 'title' | 'message'>): DbNotification {
    const full: DbNotification = {
      id: this.nextId(db, 'n'), recipientIds: [], recipientLabel: '', ngoName: null, activityId: null,
      urgent: false, createdAt: new Date().toISOString(), readBy: [], ...n
    };
    db.notifications.unshift(full);
    return full;
  }

  private notifyUser(db: Db, userId: string, a: DbActivity, type: string, title: string, message: string): void {
    const u = db.users.find(x => x.id === userId);
    this.pushNotification(db, { audience: 'employee', recipientIds: [userId], recipientLabel: u?.name ?? userId, activityId: a.id, type, title, message });
  }

  private notifyNgo(db: Db, a: DbActivity, type: string, title: string, message: string): void {
    if (!db.settings.notifyNgos) return;
    this.pushNotification(db, { audience: 'ngo', ngoName: a.ngoName, recipientLabel: a.ngoName, activityId: a.id, type, title, message });
  }

  private notifyRegistered(db: Db, a: DbActivity, type: string, title: string, message: string): void {
    const ids = db.registrations.filter(r => r.activityId === a.id && r.status === 'registered').map(r => r.userId);
    if (ids.length) this.pushNotification(db, { audience: 'employee', recipientIds: ids, recipientLabel: `Registered – ${a.title}`, activityId: a.id, type, title, message });
    this.notifyNgo(db, a, type, title, message);
  }

  /** Urgent alert when only a few slots remain (sent once per remaining-count). */
  private checkLastSlots(db: Db, a: DbActivity): void {
    const left = a.maxParticipants - this.activeCount(db, a.id);
    if (left < 1 || left > 3 || new Date(a.cutoffAt).getTime() <= Date.now()) return;
    const key = `last:${a.id}:${left}`;
    if (db.sentKeys.includes(key)) return;
    db.sentKeys.push(key);
    const registered = new Set(db.registrations.filter(r => r.activityId === a.id && r.status === 'registered').map(r => r.userId));
    const ids = db.users.filter(u => u.role === 'employee' && !registered.has(u.id)).map(u => u.id);
    this.pushNotification(db, {
      audience: 'employee', recipientIds: ids, recipientLabel: `Not registered – ${a.title}`, activityId: a.id,
      type: 'urgent', urgent: true, title: `Only ${left} slot${left > 1 ? 's' : ''} left!`,
      message: `"${a.title}" with ${a.ngoName} is almost full. Register before the cut-off.`
    });
  }

  /** Simulates the server-side scheduler that sends reminders 1 week / 3 days / 1 day before. */
  private runScheduler(db: Db): void {
    const now = Date.now();
    for (const a of db.activities) {
      const start = new Date(a.startAt).getTime();
      if (start <= now) continue;
      const due = db.settings.rules.filter(r => r.enabled && now >= start - r.hoursBefore * HOUR);
      const pending = due.filter(r => !db.sentKeys.includes(`rem:${a.id}:${r.id}`));
      if (!pending.length) continue;
      due.forEach(r => { const k = `rem:${a.id}:${r.id}`; if (!db.sentKeys.includes(k)) db.sentKeys.push(k); });
      const latest = due.reduce((m, r) => (r.hoursBefore < m.hoursBefore ? r : m));
      const hasPeople = this.activeCount(db, a.id) > 0;
      if (!hasPeople) continue;
      this.notifyRegistered(db, a, 'reminder', `Reminder: ${latest.label}`,
        `"${a.title}" starts on ${new Date(a.startAt).toLocaleString()} at ${a.location}.`);
    }
  }

  private notificationsRoute(db: Db, me: DbUser, method: string, seg: string[], body: any, q: URLSearchParams) {
    if (method === 'GET') {
      if (me.role === 'admin') {
        return db.notifications.map(n => this.viewNotification(db, n, me.id));
      }
      return db.notifications
        .filter(n => n.audience === 'employee' && (n.recipientIds === 'all' || n.recipientIds.includes(me.id)))
        .map(n => this.viewNotification(db, n, me.id));
    }
    if (method === 'POST' && seg[1] === 'broadcast') {
      this.requireAdmin(me);
      return this.broadcast(db, body);
    }
    if (method === 'POST' && seg[1] === 'read-all') {
      db.notifications.forEach(n => { if (!n.readBy.includes(me.id)) n.readBy.push(me.id); });
      return { ok: true };
    }
    if (method === 'PUT' && seg[2] === 'read') {
      const n = db.notifications.find(x => x.id === seg[1]);
      if (n && !n.readBy.includes(me.id)) n.readBy.push(me.id);
      return { ok: true };
    }
    throw new ApiError(404, 'Endpoint not found.');
  }

  private viewNotification(db: Db, n: DbNotification, userId: string) {
    const { readBy, recipientIds, ...rest } = n;
    const count = recipientIds === 'all' ? db.users.filter(u => u.role === 'employee').length : recipientIds.length;
    return { ...rest, recipientCount: n.audience === 'ngo' ? 1 : count, read: readBy.includes(userId) };
  }

  private broadcast(db: Db, b: any) {
    if (!String(b.title ?? '').trim() || !String(b.message ?? '').trim()) throw new ApiError(400, 'Title and message are required.');
    const employees = db.users.filter(u => u.role === 'employee');
    let ids: string[] | 'all' = 'all';
    let label = 'All employees';
    let activityId: string | null = null;
    if (b.target !== 'all') {
      const a = this.findActivity(db, b.activityId);
      activityId = a.id;
      const registered = new Set(db.registrations.filter(r => r.activityId === a.id && r.status === 'registered').map(r => r.userId));
      if (b.target === 'registered') { ids = [...registered]; label = `Registered – ${a.title}`; }
      else { ids = employees.filter(u => !registered.has(u.id)).map(u => u.id); label = `Not registered – ${a.title}`; }
      if (!ids.length) throw new ApiError(400, 'There are no employees in the selected audience.');
    }
    const n = this.pushNotification(db, {
      audience: 'employee', recipientIds: ids, recipientLabel: label, activityId,
      type: b.type, urgent: b.type === 'urgent', title: b.title.trim(), message: b.message.trim()
    });
    return this.viewNotification(db, n, 'admin');
  }
}
