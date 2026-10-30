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
import { ClinicStore } from '../../core/clinic-store';
import { dentistById, scheduleFor, serviceById } from '../../core/clinic-data';
import {
  addDays,
  dayParts,
  formatDateLong,
  formatTime,
  relativeDay,
  todayIso,
} from '../../core/date.utils';
import { Appointment, Slot } from '../../core/models';
import { Icon } from '../icon';

@Component({
  selector: 'app-reschedule-dialog',
  imports: [Icon],
  templateUrl: './reschedule-dialog.html',
  styleUrl: './reschedule-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RescheduleDialog {
  readonly appointment = input<Appointment | null>(null);
  readonly open = input(false);
  readonly closed = output<void>();
  readonly rescheduled = output<Appointment>();

  private readonly store = inject(ClinicStore);
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly selectedDate = signal<string | null>(null);
  protected readonly selectedTime = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly days = computed(() => {
    const item = this.appointment();
    if (!item) {
      return [];
    }
    const today = todayIso();
    const dates: string[] = [];
    for (let offset = 0; offset < 28 && dates.length < 14; offset += 1) {
      const date = addDays(today, offset);
      if (scheduleFor(item.doctorId, date)) {
        dates.push(date);
      }
    }
    return dates;
  });

  protected readonly slots = computed<Slot[]>(() => {
    const item = this.appointment();
    const date = this.selectedDate();
    if (!item || !date) {
      return [];
    }
    return this.store.availableSlots(item.doctorId, date, item.serviceId, item.id);
  });

  constructor() {
    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      const item = this.appointment();
      if (!dialog) {
        return;
      }
      if (this.open() && item) {
        this.selectedDate.set(item.appointmentDate);
        this.selectedTime.set(item.startTime);
        this.error.set(null);
        if (!dialog.open) {
          dialog.showModal();
        }
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  protected dayParts(date: string) {
    return dayParts(date);
  }

  protected relative(date: string): string {
    return relativeDay(date);
  }

  protected dateLabel(date: string): string {
    return formatDateLong(date);
  }

  protected time(value: string): string {
    return formatTime(value);
  }

  protected serviceName(id: string): string {
    return serviceById(id)?.name ?? 'Consultation';
  }

  protected doctorName(id: string): string {
    return dentistById(id)?.name ?? 'Care team';
  }

  protected selectDate(date: string): void {
    this.selectedDate.set(date);
    this.selectedTime.set(null);
    this.error.set(null);
  }

  protected selectTime(time: string): void {
    const slot = this.slots().find((item) => item.startTime === time);
    if (!slot?.available) {
      return;
    }
    this.selectedTime.set(time);
    this.error.set(null);
  }

  protected async save(): Promise<void> {
    const item = this.appointment();
    const date = this.selectedDate();
    const time = this.selectedTime();
    if (!item || !date || !time) {
      this.error.set('Choose a new date and time.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    await delay(420);
    const result = this.store.reschedule(item.id, date, time);
    this.saving.set(false);

    if (!result.ok || !result.appointment) {
      this.error.set(result.error ?? 'The appointment could not be rescheduled.');
      return;
    }
    this.rescheduled.emit(result.appointment);
    this.close();
  }

  protected close(event?: Event): void {
    event?.preventDefault();
    this.dialogRef()?.nativeElement.close();
    this.closed.emit();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === this.dialogRef()?.nativeElement) {
      this.close();
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
