import { Component } from '@angular/core';
import { AppNotification, NotificationType } from '../../../core/models';
import { NotificationService } from '../../../core/services';

const ICONS: Record<NotificationType, string> = {
  registration: 'check', update: 'edit', cancellation: 'x', reminder: 'clock', broadcast: 'megaphone', urgent: 'alert', checkin: 'qr'
};

@Component({
  standalone: false,
  selector: 'app-employee-notifications',
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class EmployeeNotificationsComponent {
  readonly notifications$ = this.service.notifications$;

  constructor(private service: NotificationService) {}

  icon(n: AppNotification): string { return ICONS[n.type]; }
  open(n: AppNotification): void { if (!n.read) this.service.markRead(n.id).subscribe(); }
  markAll(): void { this.service.markAllRead().subscribe(); }
  trackById(_: number, n: AppNotification): string { return n.id; }
}
