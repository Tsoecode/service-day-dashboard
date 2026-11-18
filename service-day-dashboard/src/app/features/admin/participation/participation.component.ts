import { Component } from '@angular/core';
import { BehaviorSubject, combineLatest, map, shareReplay } from 'rxjs';
import { Activity, BroadcastRequest, Registration, getStatus, slotsLeft, utilisation } from '../../../core/models';
import { ActivityService, ClockService, RegistrationService, SearchService, UserService } from '../../../core/services';
import { BarDatum } from '../../../shared/components/bar-chart/bar-chart.component';

@Component({
  standalone: false,
  selector: 'app-participation',
  templateUrl: './participation.component.html',
  styleUrl: './participation.component.scss'
})
export class ParticipationComponent {
  readonly utilisation = utilisation;
  readonly slotsLeft = slotsLeft;
  readonly getStatus = getStatus;
  readonly expanded$ = new BehaviorSubject<string | null>(null);
  composing: Partial<BroadcastRequest> | null = null;

  private readonly employees$ = this.users.getEmployees().pipe(shareReplay(1));

  readonly vm$ = combineLatest([
    this.activities.activities$, this.registrations.registrations$, this.employees$, this.clock.now$, this.search.term$, this.expanded$
  ]).pipe(
    map(([activities, regs, employees, now, term, expanded]) => {
      const byActivity = new Map<string, Registration[]>();
      regs.forEach(r => byActivity.set(r.activityId, [...(byActivity.get(r.activityId) ?? []), r]));
      const registeredUsers = new Set(regs.map(r => r.userId));
      const departments = [...new Set(employees.map(e => e.department))].sort();
      const deptChart: BarDatum[] = departments.map(d => ({
        label: d,
        value: new Set(regs.filter(r => r.department === d).map(r => r.userId)).size,
        total: employees.filter(e => e.department === d).length
      }));
      const rows = activities
        .filter(a => !term || `${a.title} ${a.ngoName}`.toLowerCase().includes(term))
        .map(a => ({ activity: a, people: byActivity.get(a.id) ?? [], open: expanded === a.id }));
      return {
        now, rows, deptChart, activities,
        offered: activities.reduce((s, a) => s + a.maxParticipants, 0),
        taken: activities.reduce((s, a) => s + a.registeredCount, 0),
        notRegistered: employees.filter(e => !registeredUsers.has(e.id)).length,
        totalEmployees: employees.length
      };
    })
  );

  constructor(
    private activities: ActivityService, private registrations: RegistrationService, private users: UserService,
    private clock: ClockService, private search: SearchService
  ) {}

  toggle(id: string): void { this.expanded$.next(this.expanded$.value === id ? null : id); }

  remindUnregistered(a: Activity): void {
    this.composing = {
      type: a.maxParticipants - a.registeredCount <= 3 ? 'urgent' : 'reminder', target: 'unregistered', activityId: a.id,
      title: `Join us: ${a.title}`,
      message: `${slotsLeft(a)} slot${slotsLeft(a) === 1 ? '' : 's'} left for "${a.title}" with ${a.ngoName}. Register before the cut-off.`
    };
  }

  remindRegistered(a: Activity): void {
    this.composing = {
      type: 'reminder', target: 'registered', activityId: a.id, title: `Reminder: ${a.title}`,
      message: `Don't forget "${a.title}" at ${a.location}. Please arrive on time and scan the QR code to check in.`
    };
  }

  remindEveryone(): void {
    this.composing = {
      type: 'reminder', target: 'all', title: 'Service Day: have you registered?',
      message: 'Browse the NGO activities and register for a slot before the cut-off time.'
    };
  }
}
