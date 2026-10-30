import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ClinicStore } from '../../../core/clinic-store';
import { dentistById, serviceById } from '../../../core/clinic-data';
import { formatDateLong, formatTime, relativeDay, todayIso } from '../../../core/date.utils';
import { Appointment } from '../../../core/models';
import { AppointmentDialog } from '../../../shared/appointment-dialog/appointment-dialog';
import { Icon } from '../../../shared/icon';
import { StatusBadge } from '../../../shared/status-badge';

@Component({
  selector: 'app-doctor-dashboard',
  imports: [RouterLink, Icon, StatusBadge, AppointmentDialog],
  templateUrl: './doctor-dashboard.html',
  styleUrl: './doctor-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorDashboard {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(ClinicStore);
  protected readonly today = todayIso();
  protected readonly todayLabel = formatDateLong(this.today);

  protected readonly doctorId = computed(() => this.auth.currentUser()?.doctorId ?? '');
  protected readonly doctor = computed(() => dentistById(this.doctorId()));
  protected readonly firstName = computed(
    () => (this.auth.currentUser()?.name ?? 'Doctor').replace('Dr. ', '').split(' ')[0],
  );

  protected readonly mine = computed(() => this.store.forDoctor(this.doctorId()));

  protected readonly todayAppointments = computed(() =>
    this.mine().filter((item) => item.appointmentDate === this.today),
  );

  protected readonly upcoming = computed(() =>
    this.mine().filter(
      (item) =>
        item.appointmentDate > this.today &&
        (item.status === 'PENDING' || item.status === 'CONFIRMED'),
    ),
  );

  protected readonly nextAppointment = computed<Appointment | undefined>(() => this.upcoming()[0]);

  protected readonly stats = computed(() => {
    const mine = this.mine();
    return [
      {
        label: 'Today',
        value: mine.filter(
          (item) => item.appointmentDate === this.today && item.status !== 'CANCELLED',
        ).length,
        hint: this.todayLabel,
        icon: 'clock' as const,
        tone: '--blue',
      },
      {
        label: 'Upcoming',
        value: this.upcoming().length,
        hint: 'Rest of the diary',
        icon: 'calendar' as const,
        tone: '',
      },
      {
        label: 'Completed',
        value: mine.filter((item) => item.status === 'COMPLETED').length,
        hint: 'All time',
        icon: 'check-circle' as const,
        tone: '--green',
      },
      {
        label: 'No-shows',
        value: mine.filter((item) => item.status === 'NO_SHOW').length,
        hint: 'All time',
        icon: 'alert' as const,
        tone: '--amber',
      },
    ];
  });

  protected readonly selected = signal<Appointment | null>(null);
  protected readonly detailsOpen = signal(false);
  protected readonly toast = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected relative(date: string): string {
    return relativeDay(date);
  }

  protected time(value: string): string {
    return formatTime(value);
  }

  protected serviceName(id: string): string {
    return serviceById(id)?.name ?? 'Consultation';
  }

  protected openDetails(item: Appointment): void {
    this.selected.set(item);
    this.detailsOpen.set(true);
  }

  protected closeDetails(): void {
    this.detailsOpen.set(false);
  }

  protected complete(item: Appointment): void {
    const result = this.store.updateStatus(item.id, 'COMPLETED');
    this.showToast(
      result.ok
        ? `${item.patientName}'s visit is marked complete.`
        : (result.error ?? 'That change is not allowed.'),
    );
  }

  protected noShow(item: Appointment): void {
    const result = this.store.updateStatus(item.id, 'NO_SHOW');
    this.showToast(
      result.ok
        ? `${item.patientName} marked as a no-show.`
        : (result.error ?? 'That change is not allowed.'),
    );
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }
}
