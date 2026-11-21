import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../models';

export interface ApprovalHistoryEntry {
  id: string; userId: string; name: string; email: string; department: string; jobTitle: string;
  decision: 'approved' | 'rejected'; message: string; decidedAt: string; decidedBy: string;
  accountDeleted?: boolean; userConfirmed?: boolean;
}

@Injectable()
export class UserService {
  constructor(private http: HttpClient) {}
  getEmployees(): Observable<User[]> { return this.http.get<User[]>('/api/users'); }
  getPendingUsers(): Observable<User[]> { return this.http.get<User[]>('/api/users/pending'); }
  approve(id: string, message = ''): Observable<User> { return this.http.post<User>(`/api/users/${id}/approve`, { message }); }
  reject(id: string, message = ''): Observable<User> { return this.http.post<User>(`/api/users/${id}/reject`, { message }); }
  deleteUser(id: string): Observable<void> { return this.http.delete<void>(`/api/users/${id}`); }
  getApprovalHistory(): Observable<ApprovalHistoryEntry[]> { return this.http.get<ApprovalHistoryEntry[]>('/api/users/approval-history'); }
  deleteApprovalHistory(id: string): Observable<void> { return this.http.delete<void>(`/api/users/approval-history/${id}`); }
  getRejection(): Observable<User> { return this.http.get<User>('/api/users/rejection'); }
  confirmRejection(): Observable<void> { return this.http.post<void>('/api/users/rejection/confirm', {}); }
}
