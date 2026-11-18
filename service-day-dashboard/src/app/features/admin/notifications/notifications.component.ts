import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { map } from 'rxjs';
import { ReminderRule, ReminderSettings } from '../../../core/models';
import { ActivityService, NotificationService, ToastService } from '../../../core/services';

function labelFor(hours: number): string {
  if (hours % 168 === 0) return `${hours / 168} week${hours === 168 ? '' : 's'} before`;
  if (hours % 24 === 0) return `${hours / 24} day${hours === 24 ? '' : 's'} before`;
  return `${hours} hours before`;
}

@Component({
  standalone: false,
  selector: 'app-admin-notifications',
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class AdminNotificationsComponent implements OnInit {
  settings: ReminderSettings | null = null;
  saving = false;
  readonly activities$ = this.activitiesService.activities$;
  readonly log$ = this.notifications.notifications$.pipe(map(list => list.slice(0, 40)));

  constructor(private notifications: NotificationService, private activitiesService: ActivityService, private toast: ToastService) {}

  ngOnInit(): void {
    this.notifications.getSettings().subscribe(s => (this.settings = structuredClone(s)));
  }

  addRule(): void {
    this.settings?.rules.push({ id: `c${Date.now()}`, label: labelFor(48), hoursBefore: 48, enabled: true });
  }

  removeRule(rule: ReminderRule): void {
    if (this.settings) this.settings.rules = this.settings.rules.filter(r => r.id !== rule.id);
  }

  setHours(rule: ReminderRule, value: string): void {
    const hours = Math.max(1, Math.floor(+value || 1));
    rule.hoursBefore = hours;
    rule.label = labelFor(hours);
  }

  save(): void {
    if (!this.settings) return;
    this.saving = true;
    this.notifications.saveSettings(this.settings).subscribe({
      next: s => { this.saving = false; this.settings = structuredClone(s); this.toast.success('Reminder schedule saved.'); },
      error: (e: HttpErrorResponse) => { this.saving = false; this.toast.error(e.error?.message ?? 'Unable to save.'); }
    });
  }

  trackById(_: number, x: { id: string }): string { return x.id; }
}
