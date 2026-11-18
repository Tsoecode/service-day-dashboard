import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AdminDashboardComponent } from './dashboard/dashboard.component';
import { BroadcastFormComponent } from './broadcast-form/broadcast-form.component';
import { AdminCheckInComponent } from './check-in/check-in.component';
import { ManageNgosComponent } from './manage-ngos/manage-ngos.component';
import { AdminNotificationsComponent } from './notifications/notifications.component';
import { ParticipationComponent } from './participation/participation.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: AdminDashboardComponent, data: { title: 'Dashboard', search: true } },
  { path: 'ngos', component: ManageNgosComponent, data: { title: 'Manage NGOs', search: true } },
  { path: 'participation', component: ParticipationComponent, data: { title: 'Participation & Slot Utilisation', search: true } },
  { path: 'notifications', component: AdminNotificationsComponent, data: { title: 'Notifications & Reminders' } },
  { path: 'check-in', component: AdminCheckInComponent, data: { title: 'Check-in & Reports' } }
];

/** Feature module (lazy-loaded) for every administrator page. */
@NgModule({
  declarations: [
    AdminDashboardComponent, ManageNgosComponent, ParticipationComponent, AdminNotificationsComponent,
    AdminCheckInComponent, BroadcastFormComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class AdminModule {}
