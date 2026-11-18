import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MockBackendService } from './mock-backend.service';

/** Routes every `/api/**` call to the mock back-end; other requests (e.g. JSON assets) pass through. */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);
  return inject(MockBackendService).handle(req);
};
