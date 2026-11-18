import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast { id: number; type: 'success' | 'error' | 'info'; text: string; }

@Injectable()
export class ToastService {
  readonly toasts$ = new BehaviorSubject<Toast[]>([]);
  private seq = 0;

  success(text: string): void { this.push('success', text); }
  error(text: string): void { this.push('error', text); }
  info(text: string): void { this.push('info', text); }

  dismiss(id: number): void { this.toasts$.next(this.toasts$.value.filter(t => t.id !== id)); }

  private push(type: Toast['type'], text: string): void {
    const id = ++this.seq;
    this.toasts$.next([...this.toasts$.value, { id, type, text }]);
    setTimeout(() => this.dismiss(id), 4500);
  }
}
