import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ClinicStore } from '../../../core/clinic-store';
import { dentistById, serviceById } from '../../../core/clinic-data';
import {
  formatDateLong,
  formatTime,
  formatTimestamp,
  relativeDay,
  todayIso,
} from '../../../core/date.utils';
import { Appointment, ClinicMessage } from '../../../core/models';
import { AppointmentDialog } from '../../../shared/appointment-dialog/appointment-dialog';
import { Icon } from '../../../shared/icon';
import { RescheduleDialog } from '../../../shared/reschedule-dialog/reschedule-dialog';
import { StatusBadge } from '../../../shared/status-badge';

@Component({
  selector: 'app-receptionist-dashboard',
  imports: [
    RouterLink,
    Icon,
    StatusBadge,
    AppointmentDialog,
    RescheduleDialog,
  ],
  templateUrl: './receptionist-dashboard.html',
  styleUrl: './receptionist-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionistDashboard {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(ClinicStore);
  protected readonly today = todayIso();
  protected readonly todayLabel = formatDateLong(this.today);

  protected readonly firstName = computed(
    () => (this.auth.currentUser()?.name ?? '').split(' ')[0] || 'there',
  );

  protected readonly todayAppointments = computed(() =>
    this.store.forDate(this.today).filter((item) => item.status !== 'CANCELLED'),
  );

  protected readonly enquiries = computed(() =>
    this.store
      .messages()
      .slice()
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'open' ? -1 : 1;
        }
        return a.createdAt < b.createdAt ? 1 : -1;
      }),
  );

  protected readonly pending = computed(() =>
    this.store
      .pendingAppointments()
      .slice()
      .sort((a, b) =>
        `${a.appointmentDate}${a.startTime}`.localeCompare(`${b.appointmentDate}${b.startTime}`),
      ),
  );

  protected readonly stats = computed(() => {
    const all = this.store.appointments();
    return [
      {
        label: 'Total appointments',
        value: all.length,
        hint: 'All demo records',
        icon: 'calendar' as const,
        tone: '',
      },
      {
        label: 'Today',
        value: all.filter((item) => item.appointmentDate === this.today).length,
        hint: this.todayLabel,
        icon: 'clock' as const,
        tone: '--blue',
      },
      {
        label: 'Pending',
        value: all.filter((item) => item.status === 'PENDING').length,
        hint: 'Need a confirmation',
        icon: 'alert' as const,
        tone: '--amber',
      },
      {
        label: 'Confirmed',
        value: all.filter((item) => item.status === 'CONFIRMED').length,
        hint: 'Ready for the diary',
        icon: 'check-circle' as const,
        tone: '--green',
      },
      {
        label: 'Cancelled',
        value: all.filter((item) => item.status === 'CANCELLED').length,
        hint: 'Slots released',
        icon: 'close' as const,
        tone: '--red',
      },
    ];
  });

  protected readonly selected = signal<Appointment | null>(null);
  protected readonly detailsOpen = signal(false);
  protected readonly rescheduleTarget = signal<Appointment | null>(null);
  protected readonly rescheduleOpen = signal(false);
  protected readonly toast = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected time(value: string): string {
    return formatTime(value);
  }

  protected relative(date: string): string {
    return relativeDay(date);
  }

  protected timestamp(value: string): string {
    return formatTimestamp(value);
  }

  protected doctorName(id: string): string {
    return dentistById(id)?.name.replace('Dr. ', '') ?? 'Care team';
  }

  protected serviceName(id: string): string {
    return serviceById(id)?.name ?? 'Consultation';
  }

  protected sourceLabel(source: ClinicMessage['source']): string {
    switch (source) {
      case 'consultation':
        return 'Consultation request';
      case 'chat':
        return 'Care chat';
      default:
        return 'Contact form';
    }
  }

  protected openDetails(item: Appointment): void {
    this.selected.set(item);
    this.detailsOpen.set(true);
  }

  protected closeDetails(): void {
    this.detailsOpen.set(false);
  }

  protected openReschedule(item: Appointment): void {
    this.rescheduleTarget.set(item);
    this.rescheduleOpen.set(true);
  }

  protected closeReschedule(): void {
    this.rescheduleOpen.set(false);
  }

  protected onRescheduled(item: Appointment): void {
    this.showToast(`${item.patientName} moved to ${this.relative(item.appointmentDate)} at ${this.time(item.startTime)}.`);
  }

  protected confirm(item: Appointment): void {
    const result = this.store.updateStatus(item.id, 'CONFIRMED');
    this.showToast(
      result.ok
        ? `${item.patientName}'s appointment is confirmed.`
        : (result.error ?? 'That change is not allowed.'),
    );
  }

  protected complete(item: Appointment): void {
    const result = this.store.updateStatus(item.id, 'COMPLETED');
    this.showToast(
      result.ok
        ? `${item.patientName} marked as completed.`
        : (result.error ?? 'That change is not allowed.'),
    );
  }

  protected cancel(item: Appointment): void {
    const result = this.store.updateStatus(item.id, 'CANCELLED');
    this.showToast(
      result.ok
        ? `${item.patientName}'s appointment was cancelled and the slot released.`
        : (result.error ?? 'That change is not allowed.'),
    );
  }

  protected resolve(message: ClinicMessage): void {
    this.store.resolveMessage(message.id);
    this.showToast(`Enquiry from ${message.name} marked resolved.`);
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toast.set(null), 3400);
  }
}
