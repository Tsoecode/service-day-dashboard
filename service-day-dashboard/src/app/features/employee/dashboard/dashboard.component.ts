import { Component } from '@angular/core';
import { combineLatest, map } from 'rxjs';
import { Activity, getStatus, slotsLeft } from '../../../core/models';
import { ActivityService, AuthService, ClockService, NotificationService, RegistrationService, SearchService } from '../../../core/services';
import { BarDatum } from '../../../shared/components/bar-chart/bar-chart.component';
import { RegistrationFlow } from '../services/registration-flow.service';

@Component({
  standalone: false,
  selector: 'app-employee-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class EmployeeDashboardComponent {
  readonly getStatus = getStatus;
  selected: Activity | null = null;
  busy = false;
  showApprovalModal = false;
  readonly readOnly: boolean;
  readonly pendingApproval: boolean;

  readonly vm$ = combineLatest([
    this.activities.activities$, this.registrations.registrations$, this.clock.now$, this.search.term$, this.notifications.unreadCount$
  ]).pipe(
    map(([activities, regs, now, term, unread]) => {
      const upcoming = activities.filter(a => getStatus(a, now) !== 'completed');
      const open = upcoming.filter(a => getStatus(a, now) === 'open');
      const registeredIds = new Set(regs.map(r => r.activityId));
      const mine = upcoming.filter(a => registeredIds.has(a.id));
      const closingSoon = open.filter(a => new Date(a.cutoffAt).getTime() - now < 48 * 3600_000);
      const offered = upcoming.reduce((s, a) => s + a.maxParticipants, 0);
      const taken = upcoming.reduce((s, a) => s + a.registeredCount, 0);
      const chart: BarDatum[] = upcoming.slice(0, 8).map(a => ({ label: a.ngoName, value: a.registeredCount, total: a.maxParticipants }));
      const rows = upcoming.filter(a => !term || `${a.title} ${a.ngoName} ${a.location} ${a.serviceType}`.toLowerCase().includes(term));
      return {
        now, unread, registeredIds, rows, chart,
        openCount: open.length,
        openSlots: open.reduce((s, a) => s + slotsLeft(a), 0),
        myCount: mine.length,
        nextTitle: mine.length ? mine[0].title : 'No activity yet',
        closingSoon: closingSoon.length,
        percent: offered ? Math.round((taken / offered) * 100) : 0
      };
    })
  );

  constructor(
    private activities: ActivityService, private registrations: RegistrationService, private clock: ClockService,
    private search: SearchService, private notifications: NotificationService, private flow: RegistrationFlow,
    auth: AuthService
  ) {
    this.readOnly = auth.user?.status === 'unapproved' || auth.user?.status === 'rejected';
    this.pendingApproval = auth.user?.status === 'unapproved';
  }

  confirm(activity: Activity): void {
    if (this.pendingApproval) {
      this.showApprovalModal = true;
      this.selected = null;
      return;
    }
    this.busy = true;
    this.flow.register(activity).subscribe(result => {
      this.busy = false;
      if (result) this.selected = null;
    });
  }

  onAction(activity: Activity, registered: boolean, status: string): void {
    if (!registered && status === 'open' && this.pendingApproval) {
      this.showApprovalModal = true;
      return;
    }
    this.selected = activity;
  }

  trackById(_: number, a: Activity): string { return a.id; }
}
