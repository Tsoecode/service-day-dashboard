import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { combineLatest, map } from 'rxjs';
import { Activity, ActivityInput, SERVICE_TYPES, getStatus, toLocalInput } from '../../../core/models';
import { ActivityService, ClockService, SearchService, ToastService } from '../../../core/services';

/** Cut-off must be before start, and start before end. */
function scheduleValidator(group: AbstractControl): ValidationErrors | null {
  const v = group.value;
  const [s, e, c] = [v.startAt, v.endAt, v.cutoffAt].map((x: string) => (x ? new Date(x).getTime() : NaN));
  const errors: ValidationErrors = {};
  if (!isNaN(s) && !isNaN(e) && e <= s) errors['endBeforeStart'] = true;
  if (!isNaN(s) && !isNaN(c) && c >= s) errors['cutoffAfterStart'] = true;
  return Object.keys(errors).length ? errors : null;
}

@Component({
  standalone: false,
  selector: 'app-manage-ngos',
  templateUrl: './manage-ngos.component.html'
})
export class ManageNgosComponent {
  readonly types = SERVICE_TYPES;
  readonly getStatus = getStatus;
  editing: Activity | null = null;
  formOpen = false;
  deleting: Activity | null = null;
  saving = false;
  serverError = '';

  readonly form = this.fb.nonNullable.group({
    ngoName: ['', [Validators.required, Validators.maxLength(80)]],
    title: ['', [Validators.required, Validators.maxLength(100)]],
    serviceType: ['', Validators.required],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    location: ['', Validators.required],
    startAt: ['', Validators.required],
    endAt: ['', Validators.required],
    cutoffAt: ['', Validators.required],
    maxParticipants: [10, [Validators.required, Validators.min(1), Validators.max(1000)]]
  }, { validators: scheduleValidator });

  readonly vm$ = combineLatest([this.activities.activities$, this.clock.now$, this.search.term$]).pipe(
    map(([activities, now, term]) => ({
      now,
      rows: activities.filter(a => !term || `${a.title} ${a.ngoName} ${a.location} ${a.serviceType}`.toLowerCase().includes(term))
    }))
  );

  constructor(
    private fb: FormBuilder, private activities: ActivityService, private clock: ClockService,
    private search: SearchService, private toast: ToastService
  ) {}

  invalid(name: string): boolean {
    const c = this.form.get(name)!;
    return c.invalid && (c.touched || c.dirty);
  }

  openCreate(): void {
    this.editing = null;
    this.serverError = '';
    const start = new Date(Date.now() + 14 * 86400_000);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 4 * 3600_000);
    const cutoff = new Date(start.getTime() - 3 * 86400_000);
    this.form.reset({
      ngoName: '', title: '', serviceType: '', description: '', location: '', maxParticipants: 10,
      startAt: toLocalInput(start.toISOString()), endAt: toLocalInput(end.toISOString()), cutoffAt: toLocalInput(cutoff.toISOString())
    });
    this.formOpen = true;
  }

  openEdit(a: Activity): void {
    this.editing = a;
    this.serverError = '';
    this.form.reset({
      ngoName: a.ngoName, title: a.title, serviceType: a.serviceType, description: a.description, location: a.location,
      startAt: toLocalInput(a.startAt), endAt: toLocalInput(a.endAt), cutoffAt: toLocalInput(a.cutoffAt), maxParticipants: a.maxParticipants
    });
    this.formOpen = true;
  }

  save(): void {
    this.serverError = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const input: ActivityInput = {
      ...v,
      startAt: new Date(v.startAt).toISOString(),
      endAt: new Date(v.endAt).toISOString(),
      cutoffAt: new Date(v.cutoffAt).toISOString()
    };
    this.saving = true;
    const request$ = this.editing ? this.activities.update(this.editing.id, input) : this.activities.create(input);
    request$.subscribe({
      next: a => {
        this.saving = false;
        this.formOpen = false;
        this.toast.success(this.editing ? `"${a.title}" updated. Registered employees were notified.` : `"${a.title}" added and now open for registration.`);
      },
      error: (e: HttpErrorResponse) => { this.saving = false; this.serverError = e.error?.message ?? 'Unable to save.'; }
    });
  }

  confirmDelete(): void {
    if (!this.deleting) return;
    const a = this.deleting;
    this.saving = true;
    this.activities.remove(a.id).subscribe({
      next: () => { this.saving = false; this.deleting = null; this.toast.success(`"${a.title}" removed.`); },
      error: (e: HttpErrorResponse) => { this.saving = false; this.toast.error(e.error?.message ?? 'Unable to remove.'); }
    });
  }

  trackById(_: number, a: Activity): string { return a.id; }
}
