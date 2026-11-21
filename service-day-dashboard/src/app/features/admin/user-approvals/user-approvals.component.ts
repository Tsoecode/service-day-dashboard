import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { User } from '../../../core/models';
import { ApprovalHistoryEntry, ToastService, UserService } from '../../../core/services';

@Component({
  standalone: false,
  selector: 'app-user-approvals',
  templateUrl: './user-approvals.component.html',
  styles: [`
    .message-field { display: grid; gap: 8px; margin-bottom: 18px; color: var(--text-secondary, #5c6575); font-size: 13px; }
    .message-field textarea { width: 100%; resize: vertical; }
    .history-card { margin-top: 24px; }
    .period-filter { display: flex; align-items: center; gap: 8px; color: var(--text-secondary, #5c6575); font-size: 13px; }
    .period-filter select { min-width: 140px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .decision { display: inline-block; padding: 4px 9px; border-radius: 999px; background: #fff0e8; color: #a34419; font-size: 12px; font-weight: 700; }
    .decision--approved { background: #e6f7ee; color: #177345; }
    @media (max-width: 760px) {
      .card__head { align-items: flex-start; gap: 12px; flex-direction: column; }
      .period-filter { width: 100%; justify-content: space-between; }
    }
  `]
})
export class UserApprovalsComponent implements OnInit {
  users: User[] = [];
  history: ApprovalHistoryEntry[] = [];
  loading = true;
  historyLoading = true;
  busyId = '';
  error = '';
  decisionMessage = '';
  historyPeriod: 'day' | 'week' | 'month' = 'day';

  constructor(private usersApi: UserService, private toast: ToastService) {}

  ngOnInit(): void { this.load(); this.loadHistory(); }

  get filteredHistory(): ApprovalHistoryEntry[] {
    const now = new Date();
    return this.history.filter(item => {
      const date = new Date(item.decidedAt);
      if (this.historyPeriod === 'day') return date.toDateString() === now.toDateString();
      if (this.historyPeriod === 'month') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      const startOfWeek = new Date(now);
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      return date >= startOfWeek && date < endOfWeek;
    });
  }

  decide(user: User, decision: 'approved' | 'rejected'): void {
    this.busyId = user.id;
    const request = decision === 'approved'
      ? this.usersApi.approve(user.id, this.decisionMessage)
      : this.usersApi.reject(user.id, this.decisionMessage);
    request.subscribe({
      next: () => {
        this.users = this.users.filter(item => item.id !== user.id);
        this.busyId = '';
        this.decisionMessage = '';
        this.loadHistory();
        this.toast.success(`${user.name} ${decision === 'approved' ? 'was approved' : 'was rejected'}.`);
      },
      error: (e: HttpErrorResponse) => { this.busyId = ''; this.error = e.error?.message ?? 'Unable to save this decision.'; }
    });
  }

  deletePendingUser(user: User): void {
    if (!window.confirm(`Permanently delete the account for ${user.name}? This account will be removed and cannot sign in or be used again.`)) return;
    this.busyId = user.id;
    this.usersApi.deleteUser(user.id).subscribe({
      next: () => {
        this.users = this.users.filter(item => item.id !== user.id);
        this.busyId = '';
        this.loadHistory();
        this.toast.success(`Account for ${user.name} was permanently deleted.`);
      },
      error: (e: HttpErrorResponse) => { this.busyId = ''; this.error = e.error?.message ?? 'Unable to delete this account.'; }
    });
  }

  deleteHistory(item: ApprovalHistoryEntry): void {
    if (!window.confirm(`Permanently delete the account and history record for ${item.name}? This account will be removed and cannot sign in or be used again.`)) return;
    this.busyId = item.id;
    this.usersApi.deleteApprovalHistory(item.id).subscribe({
      next: () => {
        this.history = this.history.filter(entry => entry.id !== item.id);
        this.users = this.users.filter(entry => entry.id !== item.userId);
        this.busyId = '';
        this.toast.success(`Account and history for ${item.name} permanently deleted.`);
      },
      error: (e: HttpErrorResponse) => { this.busyId = ''; this.error = e.error?.message ?? 'Unable to delete this history record.'; }
    });
  }

  private loadHistory(): void {
    this.usersApi.getApprovalHistory().subscribe({
      next: history => { this.history = history; this.historyLoading = false; },
      error: (e: HttpErrorResponse) => { this.historyLoading = false; this.error = e.error?.message ?? 'Unable to load approval history.'; }
    });
  }

  private load(): void {
    this.usersApi.getPendingUsers().subscribe({
      next: users => { this.users = users; this.loading = false; },
      error: (e: HttpErrorResponse) => { this.loading = false; this.error = e.error?.message ?? 'Unable to load approval requests.'; }
    });
  }
}
