import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Activity, Registration } from '../models';
import { SyncService } from './sync.service';

@Injectable()
export class CheckInService {
  constructor(private http: HttpClient, private sync: SyncService) {}

  checkIn(code: string): Observable<{ registration: Registration; activity: Activity }> {
    return this.http.post<{ registration: Registration; activity: Activity }>('/api/checkin', { code })
      .pipe(tap(() => this.sync.refresh()));
  }
}
