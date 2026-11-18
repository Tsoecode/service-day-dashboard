import { NgModule, Optional, SkipSelf } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { mockBackendInterceptor } from './mock/mock-backend.interceptor';
import { MockBackendService } from './mock/mock-backend.service';
import {
  ActivityService, AuthService, CheckInService, ClockService, DemoService, NotificationService,
  RegistrationService, SearchService, SyncService, ToastService, UserService, sessionInterceptor
} from './services';

/**
 * Service module: registers the singleton data services (controllers' data layer),
 * HttpClient and the interceptors. Imported once, in AppModule.
 */
@NgModule({
  providers: [
    provideHttpClient(withInterceptors([sessionInterceptor, mockBackendInterceptor])),
    MockBackendService,
    AuthService, SyncService, ClockService, SearchService, ToastService,
    ActivityService, RegistrationService, NotificationService, CheckInService, DemoService, UserService
  ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parent?: CoreModule) {
    if (parent) throw new Error('CoreModule is already loaded. Import it in AppModule only.');
  }
}
