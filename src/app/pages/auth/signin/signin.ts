import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DEMO_CREDENTIALS, DEMO_PASSWORD } from '../../../core/auth.data';
import { AuthService } from '../../../core/auth.service';
import { Role } from '../../../core/models';
import { AuthShell } from '../../../layout/auth-shell/auth-shell';
import { Icon } from '../../../shared/icon';

@Component({
  selector: 'app-signin-page',
  imports: [ReactiveFormsModule, RouterLink, AuthShell, Icon],
  templateUrl: './signin.html',
  styleUrl: './signin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly demoAccounts = DEMO_CREDENTIALS;
  protected readonly demoPassword = DEMO_PASSWORD;
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resetDone = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.resetDone.set(this.route.snapshot.queryParamMap.get('reset') === '1');
  }

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    await this.attempt(email, password);
  }

  protected async useDemo(role: Role): Promise<void> {
    const account = this.demoAccounts.find((item) => item.role === role);
    if (!account || this.loading()) {
      return;
    }
    this.form.setValue({ email: account.email, password: this.demoPassword });
    await this.attempt(account.email, this.demoPassword);
  }

  private async attempt(email: string, password: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    await delay(480);
    const result = await this.auth.signIn(email, password);
    this.loading.set(false);

    if (!result.ok || !result.user) {
      this.error.set(result.error ?? 'Those details did not work. Please try again.');
      return;
    }
    await this.router.navigateByUrl(this.targetFor(result.user.role));
  }

  private targetFor(role: Role): string {
    const prefix = `/${role.toLowerCase()}`;
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl && returnUrl.startsWith(prefix)) {
      return returnUrl;
    }
    return this.auth.homePath();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
