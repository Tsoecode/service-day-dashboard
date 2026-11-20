import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { Role } from '../../core/models';
import { AuthService, NotificationService, SearchService } from '../../core/services';

interface NavItem { label: string; icon: string; link: string; }

const NAV: Record<Role, NavItem[]> = {
  employee: [
    { label: 'Dashboard', icon: 'grid', link: '/employee/dashboard' },
    { label: 'Opportunities', icon: 'heart', link: '/employee/opportunities' },
    { label: 'My Registrations', icon: 'calendar', link: '/employee/my-registrations' },
    { label: 'QR Check-in', icon: 'qr', link: '/employee/check-in' },
    { label: 'Notifications', icon: 'bell', link: '/employee/notifications' }
  ],
  admin: [
    { label: 'Dashboard', icon: 'grid', link: '/admin/dashboard' },
    { label: 'Manage NGOs', icon: 'heart', link: '/admin/ngos' },
    { label: 'User Approvals', icon: 'users', link: '/admin/user-approvals' },
    { label: 'Participation', icon: 'users', link: '/admin/participation' },
    { label: 'Notifications', icon: 'megaphone', link: '/admin/notifications' },
    { label: 'Check-in & Reports', icon: 'qr', link: '/admin/check-in' }
  ]
};

/** Application frame: sidebar navigation, top bar (greeting, search) and the routed page. */
@Component({
  standalone: false,
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnDestroy {
  readonly user = this.auth.user!;
  readonly nav = this.user.status === 'unapproved'
    ? NAV.employee.filter(item => item.label === 'Opportunities')
    : NAV[this.user.role];
  readonly firstName = this.user.name.split(' ')[0];
  readonly initials = this.user.name.split(' ').map(p => p[0]).slice(0, 2).join('');
  readonly unread$ = this.notifications.unreadCount$;

  title = '';
  showSearch = false;
  menuOpen = false;
  private readonly sub: Subscription;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private notifications: NotificationService,
    public search: SearchService
  ) {
    this.readRouteData();
    this.sub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.menuOpen = false;
      this.search.clear();
      this.readRouteData();
    });
  }

  get isDashboard(): boolean { return this.title === 'Dashboard'; }
  get notificationsLink(): string { return `/${this.user.role}/notifications`; }

  onSearch(event: Event): void { this.search.set((event.target as HTMLInputElement).value); }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private readRouteData(): void {
    let r = this.route;
    while (r.firstChild) r = r.firstChild;
    this.title = r.snapshot?.data['title'] ?? '';
    this.showSearch = !!r.snapshot?.data['search'];
  }
}
