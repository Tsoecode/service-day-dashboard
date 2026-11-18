import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/** Adds the bearer token of the signed-in user to every API request. */
export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token;
  return token ? next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })) : next(req);
};
