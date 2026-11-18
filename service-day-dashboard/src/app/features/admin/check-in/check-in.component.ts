import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { BehaviorSubject, combineLatest, distinctUntilChanged, from, map, of, switchMap } from 'rxjs';
import { Activity, Registration } from '../../../core/models';
import { ActivityService, ClockService, RegistrationService, ToastService } from '../../../core/services';

@Component({
  standalone: false,
  selector: 'app-admin-check-in',
  templateUrl: './check-in.component.html',
  styleUrl: './check-in.component.scss'
})
export class AdminCheckInComponent {
  readonly selectedId$ = new BehaviorSubject<string>('');
  generating = false;

  readonly vm$ = combineLatest([this.activities.activities$, this.registrations.registrations$, this.selectedId$, this.clock.now$]).pipe(
    map(([activities, regs, selectedId, now]) => {
      const activity = activities.find(a => a.id === selectedId) ?? this.defaultActivity(activities, now);
      const people = activity ? regs.filter(r => r.activityId === activity.id) : [];
      const checkedIn = people.filter(r => r.checkedInAt);
      const summary = activities.map(a => {
        const list = regs.filter(r => r.activityId === a.id);
        const attended = list.filter(r => r.checkedInAt).length;
        return { activity: a, registered: list.length, attended, noShow: list.length - attended, rate: list.length ? Math.round((attended / list.length) * 100) : 0 };
      });
      return {
        activities, activity, people, now, summary,
        checkedInCount: checkedIn.length,
        rate: people.length ? Math.round((checkedIn.length / people.length) * 100) : 0,
        ended: activity ? new Date(activity.endAt).getTime() < now : false
      };
    })
  );

  /** QR image is rendered client-side (dynamic import keeps it out of the main bundle). */
  readonly qr$ = this.vm$.pipe(
    map(vm => vm.activity?.qrToken ?? ''),
    distinctUntilChanged(),
    switchMap(token => (token ? from(this.render(token)) : of('')))
  );

  constructor(
    private activities: ActivityService, private registrations: RegistrationService,
    private clock: ClockService, private toast: ToastService
  ) {}

  payload(a: Activity): string { return `${window.location.origin}/employee/check-in?code=${a.qrToken}`; }

  generate(a: Activity, regenerate = false): void {
    this.generating = true;
    this.activities.generateQr(a.id, regenerate).subscribe({
      next: () => { this.generating = false; this.toast.success(regenerate ? 'A new QR code was generated. The old one no longer works.' : 'QR code generated.'); },
      error: (e: HttpErrorResponse) => { this.generating = false; this.toast.error(e.error?.message ?? 'Unable to generate QR code.'); }
    });
  }

  exportCsv(a: Activity, people: Registration[]): void {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = [
      ['Employee', 'Department', 'Registered at', 'Checked-in at', 'Attendance'],
      ...people.map(p => [p.userName, p.department, new Date(p.registeredAt).toLocaleString(), p.checkedInAt ? new Date(p.checkedInAt).toLocaleString() : '', p.checkedInAt ? 'Present' : 'No-show'])
    ];
    const blob = new Blob(['\ufeff' + rows.map(r => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance-${a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  private defaultActivity(list: Activity[], now: number): Activity | undefined {
    const ongoing = list.find(a => new Date(a.startAt).getTime() - 3600_000 <= now && new Date(a.endAt).getTime() >= now);
    return ongoing ?? list.find(a => new Date(a.endAt).getTime() >= now) ?? list[0];
  }

  private async render(token: string): Promise<string> {
    const mod: any = await import('qrcode');
    const QR = mod.default ?? mod;
    return QR.toDataURL(`${window.location.origin}/employee/check-in?code=${token}`, { width: 280, margin: 1, color: { dark: '#1c1b33', light: '#ffffff' } });
  }

  trackById(_: number, x: { id?: string; activity?: Activity }): string | undefined { return x.id ?? x.activity?.id; }
}
