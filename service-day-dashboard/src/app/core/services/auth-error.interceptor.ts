import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

/**
 * Ends the session when the back-end no longer knows the signed-in account (e.g. an administrator
 * permanently deleted it) so a stale session cannot keep browsing the app.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isSignOut = error instanceof HttpErrorResponse && error.status === 401 && !req.url.includes('/api/auth/');
      if (isSignOut && auth.isLoggedIn) {
        auth.logout();
        toast.error(error.error?.message ?? 'Your session has ended. Please sign in again.');
        router.navigateByUrl('/login');
      }
      return throwError(() => error);
    })
  );
};
