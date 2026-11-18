import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard, guestGuard, homeGuard, roleGuard } from './core/guards/auth.guards';
import { ShellComponent } from './layout/shell/shell.component';

const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule) },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'employee', canActivate: [roleGuard], data: { role: 'employee' }, loadChildren: () => import('./features/employee/employee.module').then(m => m.EmployeeModule) },
      { path: 'admin', canActivate: [roleGuard], data: { role: 'admin' }, loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule) },
      { path: '', pathMatch: 'full', canActivate: [homeGuard], children: [] }
    ]
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
