import { Injectable } from '@angular/core';
import { Observable, Subject, filter, fromEvent, merge, share, timer } from 'rxjs';

/**
 * Drives "real-time" updates: emits on a short polling interval, whenever a mutation
 * calls refresh(), and when another browser tab changes the shared data.
 */
@Injectable()
export class SyncService {
  private readonly manual$ = new Subject<void>();

  readonly tick$: Observable<unknown> = merge(
    timer(0, 5000).pipe(filter(() => !document.hidden)),
    this.manual$,
    fromEvent<StorageEvent>(window, 'storage').pipe(filter(e => e.key === 'sdd-db-v1'))
  ).pipe(share());

  refresh(): void { this.manual$.next(); }
}

