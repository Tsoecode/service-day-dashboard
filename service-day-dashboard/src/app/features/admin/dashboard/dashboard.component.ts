import { Component } from '@angular/core';
import { combineLatest, map } from 'rxjs';
import { getStatus, slotsLeft, utilisation } from '../../../core/models';
import { ActivityService, ClockService, DemoService, RegistrationService, SearchService } from '../../../core/services';
import { BarDatum } from '../../../shared/components/bar-chart/bar-chart.component';

@Component({
  standalone: false,
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.component.html',
  styles: [`.admin-activity-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .admin-activity-thumb { display: block; width: 64px; height: 48px; flex: 0 0 auto; object-fit: cover; border-radius: 6px; background: #f3f4f6; }
    @media (max-width: 520px) { .admin-activity-thumb { width: 52px; height: 40px; } }`]
})
export class AdminDashboardComponent {
  readonly utilisation = utilisation;
  readonly slotsLeft = slotsLeft;
  readonly getStatus = getStatus;

  readonly vm$ = combineLatest([
    this.activities.activities$, this.registrations.registrations$, this.clock.now$, this.search.term$
  ]).pipe(
    map(([activities, regs, now, term]) => {
      const offered = activities.reduce((s, a) => s + a.maxParticipants, 0);
      const taken = activities.reduce((s, a) => s + a.registeredCount, 0);
      const chart: BarDatum[] = activities.map(a => ({ label: a.ngoName, value: a.registeredCount, total: a.maxParticipants }));
      const rows = activities.filter(a => !term || `${a.title} ${a.ngoName} ${a.location}`.toLowerCase().includes(term));
      return {
        now, rows, chart, offered, taken,
        remaining: offered - taken,
        checkedIn: regs.filter(r => r.checkedInAt).length,
        participants: new Set(regs.map(r => r.userId)).size,
        percent: offered ? Math.round((taken / offered) * 100) : 0
      };
    })
  );

  constructor(
    private activities: ActivityService, private registrations: RegistrationService, private clock: ClockService,
    private search: SearchService, private demo: DemoService
  ) {}

  resetDemo(): void {
    if (confirm('Reset all prototype data to the original JSON seed?')) this.demo.reset().subscribe(() => location.reload());
  }
}
