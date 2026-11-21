import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services';

/** Only signed-in users may enter; others are sent to /login (remembering where they wanted to go). */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  return auth.isLoggedIn ? true : inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Route data `role` must match the signed-in user's role. */
export const roleGuard: CanActivateFn = route => {
  const auth = inject(AuthService);
  const role = route.data['role'];
  return auth.user?.role === role ? true : inject(Router).createUrlTree([auth.isLoggedIn ? auth.homeRoute : '/login']);
};

/** Pending users can browse opportunities but cannot enter employee tools. */
export const approvedEmployeeGuard: CanActivateFn = route => {
  const user = inject(AuthService).user;
  return (user?.status !== 'unapproved' && user?.status !== 'rejected') || route.routeConfig?.path === 'opportunities'
    ? true
    : inject(Router).createUrlTree(['/employee/opportunities']);
};

/** Already signed-in users skip the login page. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn ? inject(Router).createUrlTree([auth.homeRoute]) : true;
};

/** Sends "/" to the signed-in user's home page (admin or employee dashboard). */
export const homeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return inject(Router).createUrlTree([auth.homeRoute]);
};
