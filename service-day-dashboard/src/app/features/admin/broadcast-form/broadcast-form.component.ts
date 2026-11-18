import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Activity, BroadcastRequest } from '../../../core/models';
import { NotificationService, ToastService } from '../../../core/services';

/** Reusable compose form (admin broadcast / manual reminder). Emits `sent` after a successful send. */
@Component({
  standalone: false,
  selector: 'app-broadcast-form',
  templateUrl: './broadcast-form.component.html'
})
export class BroadcastFormComponent implements OnChanges {
  @Input() activities: Activity[] = [];
  @Input() preset: Partial<BroadcastRequest> = {};
  @Output() sent = new EventEmitter<void>();

  sending = false;
  serverError = '';

  readonly form = this.fb.nonNullable.group({
    type: ['broadcast' as BroadcastRequest['type'], Validators.required],
    target: ['all' as BroadcastRequest['target'], Validators.required],
    activityId: [''],
    title: ['', [Validators.required, Validators.maxLength(80)]],
    message: ['', [Validators.required, Validators.maxLength(400)]]
  });

  constructor(private fb: FormBuilder, private notifications: NotificationService, private toast: ToastService) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Only reset when a new preset arrives – the live activity list refreshes every few seconds.
    if (!changes['preset']) return;
    this.form.patchValue({ type: 'broadcast', target: 'all', title: '', message: '', ...this.preset, activityId: this.preset.activityId ?? '' });
  }

  get needsActivity(): boolean { return this.form.controls.target.value !== 'all'; }

  invalid(name: 'title' | 'message' | 'activityId'): boolean {
    const c = this.form.controls[name];
    const bad = name === 'activityId' ? this.needsActivity && !c.value : c.invalid;
    return bad && (c.touched || c.dirty);
  }

  send(): void {
    this.serverError = '';
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (this.form.invalid || (this.needsActivity && !v.activityId)) return;
    this.sending = true;
    this.notifications.broadcast({ ...v, activityId: this.needsActivity ? v.activityId : null }).subscribe({
      next: n => {
        this.sending = false;
        this.toast.success(`Sent to ${n.recipientLabel} (${n.recipientCount} recipient${n.recipientCount === 1 ? '' : 's'}).`);
        this.form.patchValue({ title: '', message: '' });
        this.form.markAsUntouched();
        this.sent.emit();
      },
      error: (e: HttpErrorResponse) => { this.sending = false; this.serverError = e.error?.message ?? 'Unable to send.'; }
    });
  }
}
