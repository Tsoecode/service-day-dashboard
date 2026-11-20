import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { User } from '../../../core/models';
import { ToastService, UserService } from '../../../core/services';

@Component({
  standalone: false,
  selector: 'app-user-approvals',
  template: `
    <section class="card">
      <div class="card__head"><div><h2 class="card__title">Pending employee approvals</h2><p class="card__sub">New accounts stay read-only until approved.</p></div></div>
      <p class="card__sub" *ngIf="loading">Loading requests…</p>
      <p class="card__sub" *ngIf="!loading && !users.length">No accounts are waiting for approval.</p>
      <div class="table-wrap" *ngIf="users.length"><table class="table stackable">
        <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Job title</th><th>Action</th></tr></thead>
        <tbody><tr *ngFor="let user of users"><td data-label="Name">{{ user.name }}</td><td data-label="Email">{{ user.email }}</td><td data-label="Department">{{ user.department }}</td><td data-label="Job title">{{ user.jobTitle }}</td><td data-label="Action"><button class="btn btn--primary btn--sm" type="button" [disabled]="busyId === user.id" (click)="approve(user)">{{ busyId === user.id ? 'Approving…' : 'Approve employee' }}</button></td></tr></tbody>
      </table></div>
      <p class="alert" role="alert" *ngIf="error">{{ error }}</p>
    </section>`
})
export class UserApprovalsComponent implements OnInit {
  users: User[] = [];
  loading = true;
  busyId = '';
  error = '';

  constructor(private usersApi: UserService, private toast: ToastService) {}

  ngOnInit(): void { this.load(); }

  approve(user: User): void {
    this.busyId = user.id;
    this.usersApi.approve(user.id).subscribe({
      next: () => { this.users = this.users.filter(item => item.id !== user.id); this.busyId = ''; this.toast.success(`${user.name} is now an approved employee.`); },
      error: (e: HttpErrorResponse) => { this.busyId = ''; this.error = e.error?.message ?? 'Unable to approve this account.'; }
    });
  }

  private load(): void {
    this.usersApi.getPendingUsers().subscribe({
      next: users => { this.users = users; this.loading = false; },
      error: (e: HttpErrorResponse) => { this.loading = false; this.error = e.error?.message ?? 'Unable to load approval requests.'; }
    });
  }
}
