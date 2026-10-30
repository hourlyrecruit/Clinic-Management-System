import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ClinicStore } from '../../core/clinic-store';
import {
  DENTISTS,
  SERVICES,
  dentistById,
  doctorWorkingDays,
  scheduleFor,
  serviceById,
} from '../../core/clinic-data';
import {
  addDays,
  dayParts,
  formatDateLong,
  formatTime,
  relativeDay,
  todayIso,
} from '../../core/date.utils';
import { Appointment, AuthUser, Dentist, Service, Slot } from '../../core/models';
import { Icon } from '../icon';

type WizardMode = 'patient' | 'staff';

interface WizardStep {
  readonly number: number;
  readonly label: string;
}

const STEP_LABELS: readonly WizardStep[] = [
  { number: 1, label: 'Treatment' },
  { number: 2, label: 'Clinician' },
  { number: 3, label: 'Date & time' },
  { number: 4, label: 'Details' },
  { number: 5, label: 'Review' },
];

@Component({
  selector: 'app-booking-wizard',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  templateUrl: './booking-wizard.html',
  styleUrl: './booking-wizard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingWizard {
  readonly mode = input<WizardMode>('patient');
  readonly patient = input<AuthUser | null>(null);
  readonly creator = input<AuthUser | null>(null);
  readonly booked = output<Appointment>();

  protected readonly store = inject(ClinicStore);
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly services = SERVICES;
  protected readonly dentists = DENTISTS;
  protected readonly steps = STEP_LABELS;
  protected readonly today = todayIso();
  protected readonly wizardTop = viewChild<ElementRef<HTMLElement>>('wizardTop');

  protected readonly step = signal(1);
  protected readonly selectedService = signal<string | null>(null);
  protected readonly selectedDoctor = signal<string | null>(null);
  protected readonly selectedDate = signal<string | null>(null);
  protected readonly selectedTime = signal<string | null>(null);
  protected readonly confirmed = signal<Appointment | null>(null);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly submitted = signal(false);

  protected readonly details = this.formBuilder.nonNullable.group({
    patientName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[+()\d\s-]{7,}$/)]],
    reason: [''],
    consent: [false, [Validators.requiredTrue]],
  });

  protected readonly effectivePatient = computed<AuthUser | null>(() =>
    this.mode() === 'patient' ? this.auth.currentUser() : this.patient(),
  );

  protected readonly effectiveCreator = computed<AuthUser | null>(
    () => this.creator() ?? this.auth.currentUser(),
  );

  protected readonly isStaff = computed(() => this.mode() === 'staff');

  protected readonly selectedServiceData = computed<Service | undefined>(() => {
    const id = this.selectedService();
    return id ? serviceById(id) : undefined;
  });

  protected readonly selectedDoctorData = computed<Dentist | undefined>(() => {
    const id = this.selectedDoctor();
    return id ? dentistById(id) : undefined;
  });

  protected readonly days = computed(() => {
    const doctor = this.selectedDoctorData();
    if (!doctor) {
      return [];
    }
    const result: string[] = [];
    for (let offset = 0; offset < 28 && result.length < 14; offset += 1) {
      const date = addDays(this.today, offset);
      if (scheduleFor(doctor.id, date)) {
        result.push(date);
      }
    }
    return result;
  });

  protected readonly summaryDate = computed(() => {
    const date = this.selectedDate();
    return date ? formatDateLong(date) : 'Choose a date';
  });

  protected readonly summaryTime = computed(() => {
    const time = this.selectedTime();
    return time ? formatTime(time) : 'Choose a time';
  });

  protected readonly summaryEnd = computed(() => {
    const time = this.selectedTime();
    const service = this.selectedServiceData();
    if (!time || !service) {
      return '';
    }
    const slot = this.slotsFor(this.selectedDate() ?? '').find(
      (item) => item.startTime === time,
    );
    return slot ? formatTime(slot.endTime) : '';
  });

  constructor() {
    effect(() => {
      const patient = this.effectivePatient();
      if (!patient) {
        return;
      }
      this.details.patchValue(
        {
          patientName: patient.name,
          email: patient.email,
          phone: patient.phone,
        },
        { emitEvent: false },
      );
    });
  }

  protected initials(): string {
    return (this.effectivePatient()?.name ?? '')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  protected serviceName(id: string): string {
    return serviceById(id)?.name ?? 'Treatment';
  }

  protected doctorName(id: string | null): string {
    return id ? (dentistById(id)?.name ?? 'Clinician') : 'Choose a clinician';
  }

  protected workingDays(id: string): string {
    return doctorWorkingDays(id);
  }

  protected dayParts(date: string) {
    return dayParts(date);
  }

  protected relative(date: string): string {
    return relativeDay(date);
  }

  protected timeLabel(time: string): string {
    return formatTime(time);
  }

  protected dateLabel(date: string): string {
    return formatDateLong(date);
  }

  protected selectService(id: string): void {
    if (this.selectedService() === id) {
      return;
    }
    this.selectedService.set(id);
    this.selectedTime.set(null);
    this.error.set(null);
  }

  protected selectDoctor(id: string): void {
    if (this.selectedDoctor() === id) {
      return;
    }
    this.selectedDoctor.set(id);
    this.selectedDate.set(null);
    this.selectedTime.set(null);
    this.error.set(null);
  }

  protected selectDate(date: string): void {
    if (this.slotCount(date) === 0) {
      return;
    }
    this.selectedDate.set(date);
    this.selectedTime.set(null);
    this.error.set(null);
  }

  protected selectTime(time: string): void {
    const slot = this.slotsFor(this.selectedDate() ?? '').find(
      (item) => item.startTime === time,
    );
    if (!slot?.available) {
      return;
    }
    this.selectedTime.set(time);
    this.error.set(null);
  }

  protected slotsFor(date: string): Slot[] {
    const doctor = this.selectedDoctor();
    const service = this.selectedService();
    if (!doctor || !service || !date) {
      return [];
    }
    return this.store.availableSlots(doctor, date, service);
  }

  protected slotCount(date: string): number {
    return this.slotsFor(date).filter((slot) => slot.available).length;
  }

  protected durationLabel(): string {
    return this.selectedServiceData()?.duration ?? '';
  }

  protected canContinue(): boolean {
    switch (this.step()) {
      case 1:
        return this.selectedService() !== null;
      case 2:
        return this.selectedDoctor() !== null;
      case 3:
        return this.selectedDate() !== null && this.selectedTime() !== null;
      case 4:
        return this.details.valid;
      default:
        return true;
    }
  }

  protected next(): void {
    if (this.step() === 4 && this.details.invalid) {
      this.submitted.set(true);
      this.details.markAllAsTouched();
      return;
    }
    if (!this.canContinue() || this.step() >= 5) {
      return;
    }
    this.step.update((step) => step + 1);
    this.submitted.set(false);
    this.scrollToTop();
  }

  protected back(): void {
    if (this.step() > 1) {
      this.step.update((step) => step - 1);
      this.error.set(null);
      this.scrollToTop();
    }
  }

  protected goTo(step: number): void {
    this.step.set(step);
    this.scrollToTop();
  }

  protected async confirm(): Promise<void> {
    const patient = this.effectivePatient();
    const creator = this.effectiveCreator();
    const service = this.selectedServiceData();
    const doctor = this.selectedDoctorData();
    const date = this.selectedDate();
    const time = this.selectedTime();

    if (!patient) {
      this.error.set('Sign in as a patient before booking.');
      return;
    }
    if (!creator) {
      this.error.set('Your session has ended. Please sign in again.');
      return;
    }
    if (!service || !doctor || !date || !time) {
      this.error.set('Some booking details are missing. Please review each step.');
      return;
    }
    if (this.details.invalid) {
      this.submitted.set(true);
      this.details.markAllAsTouched();
      this.step.set(4);
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    await delay(550);

    const stillOpen = this.store
      .availableSlots(doctor.id, date, service.id)
      .some((slot) => slot.startTime === time && slot.available);

    if (!stillOpen) {
      this.submitting.set(false);
      this.selectedTime.set(null);
      this.step.set(3);
      this.error.set('That slot was taken while you were booking. Please choose another time.');
      this.scrollToTop();
      return;
    }

    const value = this.details.getRawValue();
    const result = this.store.create({
      patientId: patient.id,
      patientName: value.patientName,
      email: value.email,
      phone: value.phone,
      doctorId: doctor.id,
      serviceId: service.id,
      appointmentDate: date,
      startTime: time,
      reason: value.reason,
      createdByUserId: creator.id,
      createdByRole: this.isStaff() ? 'RECEPTIONIST' : 'PATIENT',
    });

    this.submitting.set(false);
    if (!result.ok || !result.appointment) {
      this.error.set(result.error ?? 'The appointment could not be saved. Please try again.');
      return;
    }

    this.confirmed.set(result.appointment);
    this.booked.emit(result.appointment);
    this.scrollToTop();
  }

  protected reset(): void {
    const patient = this.effectivePatient();
    this.step.set(1);
    this.selectedService.set(null);
    this.selectedDoctor.set(null);
    this.selectedDate.set(null);
    this.selectedTime.set(null);
    this.confirmed.set(null);
    this.error.set(null);
    this.submitted.set(false);
    this.details.reset({
      patientName: patient?.name ?? '',
      email: patient?.email ?? '',
      phone: patient?.phone ?? '',
      reason: '',
      consent: false,
    });
    this.scrollToTop();
  }

  private scrollToTop(): void {
    setTimeout(() => {
      this.wizardTop()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
