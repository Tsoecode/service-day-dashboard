import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Activity, getStatus, slotsLeft, timeUntil, utilisation } from '../../../core/models';

/** Presentational card for one activity; all actions are emitted to the parent (controller). */
@Component({
  standalone: false,
  selector: 'app-activity-card',
  templateUrl: './activity-card.component.html',
  styleUrl: './activity-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityCardComponent {
  @Input({ required: true }) activity!: Activity;
  @Input() now = Date.now();
  @Input() registered = false;
  @Input() readOnly = false;
  @Input() pendingApproval = false;
  @Output() register = new EventEmitter<Activity>();
  @Output() details = new EventEmitter<Activity>();
  @Output() blockedRegister = new EventEmitter<void>();

  get status() { return getStatus(this.activity, this.now); }
  get left() { return slotsLeft(this.activity); }
  get percent() { return utilisation(this.activity); }
  get cutoffText() { return timeUntil(this.activity.cutoffAt, this.now); }
  get canRegister() { return !this.readOnly && this.status === 'open' && !this.registered; }

  onRegister(): void {
    if (this.pendingApproval) {
      this.blockedRegister.emit();
      return;
    }
    this.register.emit(this.activity);
  }
}
