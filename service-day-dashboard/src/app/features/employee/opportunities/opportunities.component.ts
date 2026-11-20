import { Component } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { Activity, SERVICE_TYPES, getStatus } from '../../../core/models';
import { AuthService } from '../../../core/services';
import { ActivityService, ClockService, RegistrationService, SearchService } from '../../../core/services';
import { RegistrationFlow } from '../services/registration-flow.service';

@Component({
  standalone: false,
  selector: 'app-opportunities',
  templateUrl: './opportunities.component.html'
})
export class OpportunitiesComponent {
  readonly types = SERVICE_TYPES;
  readonly type$ = new BehaviorSubject<string>('');
  readonly availability$ = new BehaviorSubject<'all' | 'open'>('open');
  selected: Activity | null = null;
  busy = false;
  readonly readOnly: boolean;

  readonly vm$ = combineLatest([
    this.activities.activities$, this.registrations.registrations$, this.clock.now$, this.search.term$, this.type$, this.availability$
  ]).pipe(
    map(([activities, regs, now, term, type, availability]) => {
      const registeredIds = new Set(regs.map(r => r.activityId));
      const list = activities
        .filter(a => getStatus(a, now) !== 'completed')
        .filter(a => !type || a.serviceType === type)
        .filter(a => availability === 'all' || getStatus(a, now) === 'open' || registeredIds.has(a.id))
        .filter(a => !term || `${a.title} ${a.ngoName} ${a.location} ${a.serviceType} ${a.description}`.toLowerCase().includes(term));
      return { list, now, registeredIds };
    })
  );

  constructor(
    private activities: ActivityService, private registrations: RegistrationService, private clock: ClockService,
    private search: SearchService, private flow: RegistrationFlow, auth: AuthService
  ) { this.readOnly = auth.user?.status === 'unapproved'; }

  confirm(activity: Activity): void {
    this.busy = true;
    this.flow.register(activity).subscribe(result => {
      this.busy = false;
      if (result) this.selected = null;
    });
  }

  trackById(_: number, a: Activity): string { return a.id; }
}
