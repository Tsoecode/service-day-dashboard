import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Activity, getStatus, slotsLeft, timeUntil } from '../../../core/models';

@Component({
  standalone: false,
  selector: 'app-activity-detail-modal',
  templateUrl: './activity-detail-modal.component.html',
  styleUrl: './activity-detail-modal.component.scss'
})
export class ActivityDetailModalComponent {
  @Input({ required: true }) activity!: Activity;
  @Input() registered = false;
  @Input() busy = false;
  @Input() readOnly = false;
  @Input() now = Date.now();
  @Output() confirm = new EventEmitter<Activity>();
  @Output() closed = new EventEmitter<void>();

  get status() { return getStatus(this.activity, this.now); }
  get left() { return slotsLeft(this.activity); }
  get cutoffText() { return timeUntil(this.activity.cutoffAt, this.now); }
  get canRegister() { return !this.readOnly && this.status === 'open' && !this.registered; }
}
