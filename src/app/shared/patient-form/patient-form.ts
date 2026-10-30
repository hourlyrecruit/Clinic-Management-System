import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { AuthUser } from '../../core/models';
import { Icon } from '../icon';

export interface PatientFormResult {
  readonly user: AuthUser;
  readonly created: boolean;
}

@Component({
  selector: 'app-patient-form',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './patient-form.html',
  styleUrl: './patient-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientForm {
  readonly saved = output<PatientFormResult>();

  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^[+()\d\s-]{7,}$/)]],
    email: ['', [Validators.email]],
  });

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.loading.set(true);
    await delay(350);
    const result = await this.auth.createPatientRecord({
      name: value.name,
      phone: value.phone,
      email: value.email,
    });
    this.loading.set(false);

    if (!result.ok || !result.user) {
      this.error.set(result.error ?? 'The patient record could not be created.');
      return;
    }

    this.saved.emit({ user: result.user, created: result.created ?? false });
    this.form.reset({ name: '', phone: '', email: '' });
    this.submitted.set(false);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
