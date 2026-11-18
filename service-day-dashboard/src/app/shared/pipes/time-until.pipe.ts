import { Pipe, PipeTransform } from '@angular/core';
import { timeUntil } from '../../core/models';

@Pipe({ name: 'timeUntil', standalone: false })
export class TimeUntilPipe implements PipeTransform {
  transform(iso: string, now: number | null): string { return timeUntil(iso, now ?? Date.now()); }
}
