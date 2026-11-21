import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ActivityDetailModalComponent } from './activity-detail-modal/activity-detail-modal.component';
import { CheckInComponent } from './check-in/check-in.component';
import { EmployeeDashboardComponent } from './dashboard/dashboard.component';
import { MyRegistrationsComponent } from './my-registrations/my-registrations.component';
import { EmployeeNotificationsComponent } from './notifications/notifications.component';
import { OpportunitiesComponent } from './opportunities/opportunities.component';
import { RegistrationFlow } from './services/registration-flow.service';
import { approvedEmployeeGuard } from '../../core/guards/auth.guards';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', canActivate: [approvedEmployeeGuard], component: EmployeeDashboardComponent, data: { title: 'Dashboard', search: true } },
  { path: 'opportunities', component: OpportunitiesComponent, data: { title: 'Service Day Opportunities', search: true } },
  { path: 'my-registrations', canActivate: [approvedEmployeeGuard], component: MyRegistrationsComponent, data: { title: 'My Registrations' } },
  { path: 'check-in', canActivate: [approvedEmployeeGuard], component: CheckInComponent, data: { title: 'QR Check-in' } },
  { path: 'notifications', component: EmployeeNotificationsComponent, data: { title: 'Notifications' } }
];

/** Feature module (lazy-loaded) for every employee-facing page. */
@NgModule({
  declarations: [
    EmployeeDashboardComponent, OpportunitiesComponent, MyRegistrationsComponent, CheckInComponent,
    EmployeeNotificationsComponent, ActivityDetailModalComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
  providers: [RegistrationFlow]
})
export class EmployeeModule {}
