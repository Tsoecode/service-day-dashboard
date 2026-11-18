import { Injectable } from '@angular/core';
import { map, shareReplay, timer } from 'rxjs';

/** Emits the current time every 15 s so cut-off countdowns and statuses stay accurate. */
@Injectable()
export class ClockService {
  readonly now$ = timer(0, 15000).pipe(map(() => Date.now()), shareReplay({ bufferSize: 1, refCount: true }));
}
