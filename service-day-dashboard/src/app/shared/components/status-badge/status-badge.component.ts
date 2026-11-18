import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ActivityStatus } from '../../../core/models';

const LABELS: Record<ActivityStatus, string> = { open: 'Open', full: 'Full', closed: 'Registration closed', completed: 'Completed' };

@Component({
  standalone: false,
  selector: 'app-status-badge',
  template: `<span class="badge" [attr.data-status]="status">{{ label }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: ActivityStatus;
  get label(): string { return LABELS[this.status]; }
}
