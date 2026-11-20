import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RegisterRequest } from '../../../core/models';
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
  readonly registerForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    department: ['', Validators.required],
    jobTitle: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });
  readonly demoAccounts = [
    { label: 'Employee demo', email: 'employee@company.com', password: 'employee123' },
    { label: 'Administrator demo', email: 'admin@company.com', password: 'admin123' }
  ];
  showPassword = false;
  registering = false;
  registerMode = false;
  adminMode = false;
  successMessage = '';
  submitting = false;
  errorMessage = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  invalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  useDemo(account: { email: string; password: string }): void {
    this.form.setValue({ email: account.email, password: account.password });
    this.adminMode = account.email === 'admin@company.com';
    this.errorMessage = '';
  }

  switchLoginMode(admin: boolean): void {
    this.adminMode = admin;
    this.registerMode = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  submitRegistration(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (this.registerForm.invalid) { this.registerForm.markAllAsTouched(); return; }
    this.registering = true;
    this.auth.register(this.registerForm.getRawValue() as RegisterRequest).subscribe({
      next: () => {
        this.registering = false;
        this.registerForm.reset();
        this.successMessage = 'Registration received. An administrator must approve your account before you can access employee features.';
        this.registerMode = false;
      },
      error: (e: HttpErrorResponse) => {
        this.registering = false;
        this.errorMessage = e.error?.message ?? 'Unable to create your account. Please try again.';
      }
    });
  }

  submit(): void {
    this.errorMessage = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    this.auth.login(this.form.getRawValue(), this.adminMode ? 'admin' : 'employee').subscribe({
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
