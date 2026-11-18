import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, EMPTY, shareReplay, switchMap, tap } from 'rxjs';
import { Registration } from '../models';
import { SyncService } from './sync.service';

@Injectable()
export class RegistrationService {
  /** Employee: own registrations. Admin: every registration. */
  readonly registrations$: Observable<Registration[]> = this.sync.tick$.pipe(
    switchMap(() => this.http.get<Registration[]>('/api/registrations').pipe(catchError(() => EMPTY))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor(private http: HttpClient, private sync: SyncService) {}

  register(activityId: string): Observable<Registration> {
    return this.http.post<Registration>('/api/registrations', { activityId }).pipe(tap(() => this.sync.refresh()));
  }

  changeActivity(registrationId: string, activityId: string): Observable<Registration> {
    return this.http.put<Registration>(`/api/registrations/${registrationId}`, { activityId }).pipe(tap(() => this.sync.refresh()));
  }

  withdraw(registrationId: string): Observable<unknown> {
    return this.http.delete(`/api/registrations/${registrationId}`).pipe(tap(() => this.sync.refresh()));
  }
}
