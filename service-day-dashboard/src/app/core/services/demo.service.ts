import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable()
export class DemoService {
  constructor(private http: HttpClient) {}
  /** Clears the mock database so it is re-seeded from the JSON files. */
  reset(): Observable<unknown> { return this.http.post('/api/reset', {}); }
}
