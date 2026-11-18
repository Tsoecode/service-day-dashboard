import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });
  readonly demoAccounts = [
    { label: 'Employee demo', email: 'employee@company.com', password: 'employee123' },
    { label: 'Administrator demo', email: 'admin@company.com', password: 'admin123' }
  ];
  showPassword = false;
  submitting = false;
  errorMessage = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  invalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  useDemo(account: { email: string; password: string }): void {
    this.form.setValue({ email: account.email, password: account.password });
    this.errorMessage = '';
  }

  submit(): void {
    this.errorMessage = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    this.auth.login(this.form.getRawValue()).subscribe({
      next: session => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const allowed = returnUrl && returnUrl.startsWith(`/${session.user.role}/`);
        this.router.navigateByUrl(allowed ? returnUrl! : this.auth.homeRoute);
      },
      error: (e: HttpErrorResponse) => {
        this.submitting = false;
        this.errorMessage = e.error?.message ?? 'Unable to sign in. Please try again.';
      }
    });
  }
}
