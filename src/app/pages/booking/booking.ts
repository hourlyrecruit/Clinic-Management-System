import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DENTISTS, SERVICES, TIME_SLOTS, dentistById, serviceById } from '../../core/clinic-data';
import { ClinicStore } from '../../core/clinic-store';
import {
  addDays,
  dayParts,
  formatDateLong,
  formatTime,
  isClosed,
  isPastSlot,
  relativeDay,
  slotsForDate,
  todayIso,
} from '../../core/date.utils';
import { Appointment, Service } from '../../core/models';
import { SiteHeader } from '../../layout/site-header/site-header';
import { SiteFooter } from '../../layout/site-footer/site-footer';
import { SupportWidget } from '../../layout/support-widget/support-widget';
import { Icon } from '../../shared/icon';

interface Step {
  readonly number: number;
  readonly label: string;
}

@Component({
  selector: 'app-booking-page',
  imports: [RouterLink, ReactiveFormsModule, SiteHeader, SiteFooter, SupportWidget, Icon],
  templateUrl: './booking.html',
  styleUrl: './booking.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingPage implements OnInit {
  protected readonly services = SERVICES;
  protected readonly dentists = DENTISTS;
  protected readonly steps: readonly Step[] = [
    { number: 1, label: 'Treatment' },
    { number: 2, label: 'Date & time' },
    { number: 3, label: 'Your details' },
  ];

  protected readonly step = signal(1);
  protected readonly selectedService = signal<string | null>(null);
  protected readonly selectedDentist = signal<string>('any');
  protected readonly selectedDate = signal<string | null>(null);
  protected readonly selectedTime = signal<string | null>(null);
  protected readonly confirmed = signal<Appointment | null>(null);
  protected readonly bookingError = signal<string | null>(null);

  protected readonly wizard = viewChild<ElementRef<HTMLElement>>('wizard');

  private readonly store = inject(ClinicStore);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly days = computed(() =>
    Array.from({ length: 14 }, (_, index) => addDays(todayIso(), index)).filter(
      (date) => !isClosed(date),
    ),
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    patientName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[+()\d\s-]{7,}$/)]],
    notes: [''],
    consent: [false, [Validators.requiredTrue]],
  });

  protected readonly chosenService = computed<Service | undefined>(() => {
    const id = this.selectedService();
    return id ? serviceById(id) : undefined;
  });

  protected readonly chosenDentistName = computed(() => {
    if (this.selectedDentist() === 'any') {
      return 'First available clinician';
    }
    return dentistById(this.selectedDentist())?.name ?? 'First available clinician';
  });

  protected readonly summaryDate = computed(() => {
    const date = this.selectedDate();
    return date ? formatDateLong(date) : 'Choose a date';
  });

  protected readonly summaryTime = computed(() => {
    const time = this.selectedTime();
    return time ? formatTime(time) : 'Choose a time';
  });

  protected readonly canContinue = computed(() => {
    switch (this.step()) {
      case 1:
        return this.selectedService() !== null;
      case 2:
        return (
          this.selectedDentist() !== null &&
          this.selectedDate() !== null &&
          this.selectedTime() !== null
        );
      default:
        return true;
    }
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const service = params.get('service');
    const dentist = params.get('dentist');

    if (service && serviceById(service)) {
      this.selectedService.set(service);
    }
    if (dentist && (dentist === 'any' || dentistById(dentist))) {
      this.selectedDentist.set(dentist);
    }
  }

  protected dayParts(date: string) {
    return dayParts(date);
  }

  protected relative(date: string): string {
    return relativeDay(date);
  }

  protected selectService(id: string): void {
    this.selectedService.set(id);
  }

  protected selectDentist(id: string): void {
    if (this.selectedDentist() === id) {
      return;
    }
    this.selectedDentist.set(id);
    this.selectedTime.set(null);
    this.bookingError.set(null);
  }

  protected selectDate(date: string): void {
    if (this.selectedDate() === date) {
      return;
    }
    this.selectedDate.set(date);
    this.selectedTime.set(null);
    this.bookingError.set(null);
  }

  protected selectTime(time: string): void {
    this.selectedTime.set(time);
    this.bookingError.set(null);
  }

  /** Start times that fit the clinic's hours on a given date. */
  protected timesFor(date: string): readonly string[] {
    return slotsForDate(date, TIME_SLOTS);
  }

  protected slotCount(date: string): number {
    return this.timesFor(date).filter((time) => this.isFree(date, time)).length;
  }

  protected isFree(date: string, time: string): boolean {
    if (!this.timesFor(date).includes(time) || isPastSlot(date, time)) {
      return false;
    }
    const dentist = this.selectedDentist();
    return dentist === 'any'
      ? this.store.hasOpenSlot(date, time)
      : this.store.isDentistFree(dentist, date, time);
  }

  protected next(): void {
    if (!this.canContinue()) {
      return;
    }
    if (this.step() < 3) {
      this.step.update((step) => step + 1);
    }
    this.scrollToWizard();
  }

  protected back(): void {
    if (this.step() > 1) {
      this.step.update((step) => step - 1);
    }
    this.scrollToWizard();
  }

  protected confirm(): void {
    const service = this.selectedService();
    const date = this.selectedDate();
    const time = this.selectedTime();

    if (!service || !date || !time) {
      this.step.set(1);
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.isFree(date, time)) {
      this.bookingError.set(
        'That time was just taken. Please choose another slot — we have plenty this week.',
      );
      this.selectedTime.set(null);
      this.step.set(2);
      this.scrollToWizard();
      return;
    }

    const value = this.form.getRawValue();
    const appointment = this.store.book({
      patientName: value.patientName,
      email: value.email,
      phone: value.phone,
      serviceId: service,
      dentistId: this.selectedDentist(),
      date,
      time,
      notes: value.notes,
    });

    this.confirmed.set(appointment);
    this.bookingError.set(null);
    this.scrollToWizard();
  }

  protected reset(): void {
    this.confirmed.set(null);
    this.step.set(1);
    this.selectedService.set(null);
    this.selectedDentist.set('any');
    this.selectedDate.set(null);
    this.selectedTime.set(null);
    this.bookingError.set(null);
    this.form.reset({ consent: false });
    this.scrollToWizard();
  }

  protected serviceName(id: string): string {
    return serviceById(id)?.name ?? 'Consultation';
  }

  protected dentistName(id: string): string {
    return dentistById(id)?.name ?? 'First available clinician';
  }

  protected formatTimeValue(time: string): string {
    return formatTime(time);
  }

  protected formatDateValue(date: string): string {
    return formatDateLong(date);
  }

  private scrollToWizard(): void {
    setTimeout(() => {
      this.wizard()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }
}
