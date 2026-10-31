import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CLINIC, SERVICES, serviceById } from '../../../../core/clinic-data';
import { ClinicStore } from '../../../../core/clinic-store';
import { formatDateLong, isClosed, todayIso } from '../../../../core/date.utils';
import { ParallaxDirective } from '../../../../core/parallax.directive';
import { RevealDirective } from '../../../../core/reveal.directive';
import { Icon } from '../../../../shared/icon';

type FieldName = 'name' | 'phone' | 'email' | 'serviceId' | 'date';

interface Confirmation {
  readonly name: string;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly dateLabel: string;
}

function preferredDate(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value;
  if (!value) {
    return null;
  }
  if (value < todayIso()) {
    return { past: true };
  }
  return isClosed(value) ? { closed: true } : null;
}

@Component({
  selector: 'app-appointment-section',
  imports: [ReactiveFormsModule, RouterLink, Icon, RevealDirective, ParallaxDirective],
  templateUrl: './appointment.html',
  styleUrl: './appointment.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentSection {
  readonly requestConsultation = output<void>();

  protected readonly clinic = CLINIC;
  protected readonly services = SERVICES;
  protected readonly minDate = todayIso();
  protected readonly confirmation = signal<Confirmation | null>(null);
  protected readonly attempted = signal(false);

  private readonly store = inject(ClinicStore);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^[+()\d\s-]{7,}$/)]],
    email: ['', [Validators.required, Validators.email]],
    serviceId: ['', [Validators.required]],
    date: ['', [Validators.required, preferredDate]],
  });

  protected invalid(field: FieldName): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty || this.attempted());
  }

  protected dateMessage(): string {
    const errors = this.form.controls.date.errors;
    if (errors?.['past']) {
      return 'Please choose today or a future date.';
    }
    if (errors?.['closed']) {
      return 'We are closed on Sundays. Please pick another day.';
    }
    return 'Please choose your preferred date.';
  }

  protected submit(): void {
    this.attempted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const service = serviceById(value.serviceId);
    const serviceName = service?.name ?? 'General enquiry';
    const dateLabel = formatDateLong(value.date);

    // Lands in the reception inbox alongside consultation and chat requests.
    this.store.addMessage({
      name: value.name.trim(),
      contact: `${value.email.trim()} · ${value.phone.trim()}`,
      topic: `Appointment request · ${serviceName}`,
      message: `Preferred date: ${dateLabel}. Please contact the patient to confirm a time and clinician.`,
      source: 'form',
    });

    this.confirmation.set({
      name: value.name.trim().split(' ')[0],
      serviceId: value.serviceId,
      serviceName,
      dateLabel,
    });
  }

  protected reset(): void {
    this.form.reset({ name: '', phone: '', email: '', serviceId: '', date: '' });
    this.attempted.set(false);
    this.confirmation.set(null);
  }
}
