import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, EMPTY, map, shareReplay, switchMap, tap } from 'rxjs';
import { AppNotification, BroadcastRequest, ReminderSettings } from '../models';
import { SyncService } from './sync.service';

@Injectable()
export class NotificationService {
  readonly notifications$: Observable<AppNotification[]> = this.sync.tick$.pipe(
    switchMap(() => this.http.get<AppNotification[]>('/api/notifications').pipe(catchError(() => EMPTY))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly unreadCount$ = this.notifications$.pipe(map(list => list.filter(n => !n.read && n.audience === 'employee').length));

  constructor(private http: HttpClient, private sync: SyncService) {}

  broadcast(request: BroadcastRequest): Observable<AppNotification> {
    return this.http.post<AppNotification>('/api/notifications/broadcast', request).pipe(tap(() => this.sync.refresh()));
  }

  markRead(id: string): Observable<unknown> {
    return this.http.put(`/api/notifications/${id}/read`, {}).pipe(tap(() => this.sync.refresh()));
  }

  markAllRead(): Observable<unknown> {
    return this.http.post('/api/notifications/read-all', {}).pipe(tap(() => this.sync.refresh()));
  }

  getSettings(): Observable<ReminderSettings> {
    return this.http.get<ReminderSettings>('/api/reminder-settings');
  }

  saveSettings(settings: ReminderSettings): Observable<ReminderSettings> {
    return this.http.put<ReminderSettings>('/api/reminder-settings', settings);
  }
}
