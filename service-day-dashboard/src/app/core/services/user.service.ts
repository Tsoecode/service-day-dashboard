import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../models';

@Injectable()
export class UserService {
  constructor(private http: HttpClient) {}
  getEmployees(): Observable<User[]> { return this.http.get<User[]>('/api/users'); }
  getPendingUsers(): Observable<User[]> { return this.http.get<User[]>('/api/users/pending'); }
  approve(id: string): Observable<User> { return this.http.post<User>(`/api/users/${id}/approve`, {}); }
}
