import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/** Holds the search term typed in the top bar; list pages filter their data with it. */
@Injectable()
export class SearchService {
  readonly term$ = new BehaviorSubject<string>('');
  set(term: string): void { this.term$.next(term.trim().toLowerCase()); }
  clear(): void { this.term$.next(''); }
}
