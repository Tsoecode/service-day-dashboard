import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { LoginRequest, Session, User } from '../models';

const SESSION_KEY = 'sdd-session';

@Injectable()
export class AuthService {
  private readonly session$ = new BehaviorSubject<Session | null>(this.restore());
  readonly user$: Observable<User | null> = this.session$.pipe(map(s => s?.user ?? null));

  constructor(private http: HttpClient) {}

  get user(): User | null { return this.session$.value?.user ?? null; }
  get token(): string | null { return this.session$.value?.token ?? null; }
  get isLoggedIn(): boolean { return !!this.session$.value; }
  get isAdmin(): boolean { return this.user?.role === 'admin'; }
  get homeRoute(): string { return this.isAdmin ? '/admin/dashboard' : '/employee/dashboard'; }

  login(credentials: LoginRequest): Observable<Session> {
    return this.http.post<Session>('/api/auth/login', credentials).pipe(
      tap(session => {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        this.session$.next(session);
      })
    );
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    this.session$.next(null);
  }

  private restore(): Session | null {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null'); } catch { return null; }
  }
}
