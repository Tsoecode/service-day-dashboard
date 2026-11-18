import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, EMPTY, shareReplay, switchMap, tap } from 'rxjs';
import { Activity, ActivityInput } from '../models';
import { SyncService } from './sync.service';

@Injectable()
export class ActivityService {
  /** Live list of activities (auto-refreshes; no page reload needed). */
  readonly activities$: Observable<Activity[]> = this.sync.tick$.pipe(
    switchMap(() => this.http.get<Activity[]>('/api/activities').pipe(catchError(() => EMPTY))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor(private http: HttpClient, private sync: SyncService) {}

  create(input: ActivityInput): Observable<Activity> {
    return this.http.post<Activity>('/api/activities', input).pipe(tap(() => this.sync.refresh()));
  }

  update(id: string, input: ActivityInput): Observable<Activity> {
    return this.http.put<Activity>(`/api/activities/${id}`, input).pipe(tap(() => this.sync.refresh()));
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete(`/api/activities/${id}`).pipe(tap(() => this.sync.refresh()));
  }

  generateQr(id: string, regenerate = false): Observable<Activity> {
    return this.http.post<Activity>(`/api/activities/${id}/qr`, { regenerate }).pipe(tap(() => this.sync.refresh()));
  }
}
