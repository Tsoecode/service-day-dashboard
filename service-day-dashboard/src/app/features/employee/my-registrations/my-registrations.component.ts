import { Component } from '@angular/core';
import { combineLatest, map } from 'rxjs';
import { Activity, Registration, getStatus, isCutoffPassed } from '../../../core/models';
import { ActivityService, ClockService, RegistrationService } from '../../../core/services';
import { RegistrationFlow } from '../services/registration-flow.service';

interface Row { reg: Registration; activity: Activity; locked: boolean; }

@Component({
  standalone: false,
  selector: 'app-my-registrations',
  templateUrl: './my-registrations.component.html'
})
export class MyRegistrationsComponent {
  changing: Row | null = null;
  cancelling: Row | null = null;
  chosen: Activity | null = null;
  busy = false;

  readonly vm$ = combineLatest([this.activities.activities$, this.registrations.registrations$, this.clock.now$]).pipe(
    map(([activities, regs, now]) => {
      const byId = new Map(activities.map(a => [a.id, a]));
      const rows: Row[] = regs
        .filter(r => byId.has(r.activityId))
        .map(r => ({ reg: r, activity: byId.get(r.activityId)!, locked: isCutoffPassed(byId.get(r.activityId)!, now) || !!r.checkedInAt }))
        .sort((a, b) => a.activity.startAt.localeCompare(b.activity.startAt));
      const mine = new Set(regs.map(r => r.activityId));
      const alternatives = activities.filter(a => getStatus(a, now) === 'open' && !mine.has(a.id));
      return { rows, alternatives, now };
    })
  );

  constructor(
    private activities: ActivityService, private registrations: RegistrationService,
    private clock: ClockService, private flow: RegistrationFlow
  ) {}

  startChange(row: Row): void { this.changing = row; this.chosen = null; }

  applyChange(): void {
    if (!this.changing || !this.chosen) return;
    this.busy = true;
    this.flow.change(this.changing.reg.id, this.chosen).subscribe(result => {
      this.busy = false;
      if (result) { this.changing = null; this.chosen = null; }
    });
  }

  applyCancel(): void {
    if (!this.cancelling) return;
    const row = this.cancelling;
    this.busy = true;
    this.flow.cancel(row.reg.id, row.activity.title).subscribe(() => { this.busy = false; this.cancelling = null; });
  }

  trackById(_: number, r: Row): string { return r.reg.id; }
}
