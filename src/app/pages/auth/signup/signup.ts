import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { AuthShell } from '../../../layout/auth-shell/auth-shell';
import { Icon } from '../../../shared/icon';

@Component({
  selector: 'app-signup-page',
  imports: [ReactiveFormsModule, RouterLink, AuthShell, Icon],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email], [this.uniqueEmail.bind(this)]],
      phone: ['', [Validators.required, Validators.pattern(/^[+()\d\s-]{7,}$/)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
      terms: [false, [Validators.requiredTrue]],
    },
    { validators: [passwordsMatch] },
  );

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected passwordRules(): { label: string; met: boolean }[] {
    const value = this.form.controls.password.value;
    return [
      { label: 'At least 8 characters', met: value.length >= 8 },
      { label: 'Upper and lower case letters', met: /[a-z]/.test(value) && /[A-Z]/.test(value) },
      { label: 'At least one number', met: /\d/.test(value) },
    ];
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.loading.set(true);
    await delay(600);
    const result = await this.auth.register({
      name: value.name,
      email: value.email,
      phone: value.phone,
      password: value.password,
    });
    this.loading.set(false);

    if (!result.ok) {
      this.error.set(result.error ?? 'We could not create the demo account. Please try again.');
      return;
    }
    await this.router.navigate(['/patient/dashboard'], {
      queryParams: { registered: '1' },
    });
  }

  private async uniqueEmail(control: AbstractControl): Promise<ValidationErrors | null> {
    const email = String(control.value ?? '').trim();
    if (!email) {
      return null;
    }
    return this.auth.emailExists(email) ? { taken: true } : null;
  }
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (!password || !confirm) {
    return null;
  }
  return password === confirm ? null : { mismatch: true };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
