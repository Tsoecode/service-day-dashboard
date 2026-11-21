import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AppNotification, NotificationType } from '../../../core/models';
import { AuthService, NotificationService, ToastService, UserService } from '../../../core/services';

const ICONS: Record<NotificationType, string> = {
  registration: 'check', update: 'edit', cancellation: 'x', reminder: 'clock', broadcast: 'megaphone', urgent: 'alert', checkin: 'qr', approval: 'check', rejection: 'alert'
};

@Component({
  standalone: false,
  selector: 'app-employee-notifications',
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class EmployeeNotificationsComponent implements OnInit {
  readonly notifications$ = this.service.notifications$;
  readonly user = this.auth.user;
  confirmingRejection = false;

  constructor(private service: NotificationService, private auth: AuthService, private usersApi: UserService, private router: Router, private toast: ToastService) {}

  ngOnInit(): void {
    if (this.user?.status === 'unapproved' || this.user?.status === 'rejected') {
      this.auth.refreshUser().subscribe();
    }
  }

  icon(n: AppNotification): string { return ICONS[n.type] ?? 'bell'; }
  open(n: AppNotification): void { if (!n.read) this.service.markRead(n.id).subscribe(); }
  markAll(): void { this.service.markAllRead().subscribe(); }

  confirmRejection(): void {
    if (!window.confirm('Are you sure you want to permanently delete your rejected account? This cannot be undone.')) return;
    this.confirmingRejection = true;
    this.usersApi.confirmRejection().subscribe({
      next: () => {
        this.auth.logout();
        this.toast.info('Your account has been permanently deleted.');
        this.router.navigateByUrl('/login');
      },
      error: (e: HttpErrorResponse) => { this.confirmingRejection = false; this.toast.error(e.error?.message ?? 'Unable to delete your account.'); }
    });
  }
  trackById(_: number, n: AppNotification): string { return n.id; }
}
