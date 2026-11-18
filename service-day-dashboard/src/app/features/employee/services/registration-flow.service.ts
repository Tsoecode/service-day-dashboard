import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { Activity, Registration } from '../../../core/models';
import { RegistrationService, ToastService } from '../../../core/services';

/** Small facade used by several employee pages so register / change / cancel behave identically. */
@Injectable()
export class RegistrationFlow {
  constructor(private registrations: RegistrationService, private toast: ToastService) {}

  register(activity: Activity): Observable<Registration | null> {
    return this.registrations.register(activity.id).pipe(
      tap(() => this.toast.success(`You are registered for "${activity.title}".`)),
      catchError(e => this.fail(e))
    );
  }

  change(registrationId: string, target: Activity): Observable<Registration | null> {
    return this.registrations.changeActivity(registrationId, target.id).pipe(
      tap(() => this.toast.success(`Your registration was moved to "${target.title}".`)),
      catchError(e => this.fail(e))
    );
  }

  cancel(registrationId: string, title: string): Observable<unknown> {
    return this.registrations.withdraw(registrationId).pipe(
      tap(() => this.toast.success(`You withdrew from "${title}".`)),
      catchError(e => this.fail(e))
    );
  }

  private fail(e: HttpErrorResponse): Observable<null> {
    this.toast.error(e.error?.message ?? 'Something went wrong. Please try again.');
    return of(null);
  }
}
