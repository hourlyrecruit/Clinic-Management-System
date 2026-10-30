import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/auth.service';
import { ClinicStore } from '../../../core/clinic-store';
import { dentistById, serviceById } from '../../../core/clinic-data';
import { formatDateShort, formatTime, relativeDay, todayIso } from '../../../core/date.utils';
import { Appointment, AppointmentStatus } from '../../../core/models';
import { AppointmentDialog } from '../../../shared/appointment-dialog/appointment-dialog';
import { Icon } from '../../../shared/icon';
import { StatusBadge } from '../../../shared/status-badge';

type Scope = 'upcoming' | 'today' | 'past' | 'all';
type StatusFilter = 'ALL' | AppointmentStatus;

@Component({
  selector: 'app-doctor-appointments',
  imports: [Icon, StatusBadge, AppointmentDialog],
  templateUrl: './doctor-appointments.html',
  styleUrl: './doctor-appointments.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorAppointments {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(ClinicStore);
  protected readonly today = todayIso();

  protected readonly doctorId = computed(() => this.auth.currentUser()?.doctorId ?? '');
  protected readonly doctor = computed(() => dentistById(this.doctorId()));

  protected readonly scope = signal<Scope>('upcoming');
  protected readonly query = signal('');
  protected readonly statusFilter = signal<StatusFilter>('ALL');
  protected readonly dateFilter = signal('');

  protected readonly selected = signal<Appointment | null>(null);
  protected readonly detailsOpen = signal(false);
  protected readonly toast = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly mine = computed(() => this.store.forDoctor(this.doctorId()));

  protected readonly filtered = computed(() => {
    const scope = this.scope();
    const query = this.query().trim().toLowerCase();
    const status = this.statusFilter();
    const date = this.dateFilter();

    return this.mine()
      .filter((item) => {
        if (date) {
          return item.appointmentDate === date;
        }
        switch (scope) {
          case 'today':
            return item.appointmentDate === this.today;
          case 'past':
            return item.appointmentDate < this.today;
          case 'upcoming':
            return item.appointmentDate >= this.today;
          default:
            return true;
        }
      })
      .filter((item) => status === 'ALL' || item.status === status)
      .filter((item) => {
        if (!query) {
          return true;
        }
        return [item.patientName, item.reference, item.phone, item.email, this.serviceName(item.serviceId)]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const left = `${a.appointmentDate}${a.startTime}`;
        const right = `${b.appointmentDate}${b.startTime}`;
        return scope === 'past' ? right.localeCompare(left) : left.localeCompare(right);
      });
  });

  protected setScope(scope: Scope): void {
    this.scope.set(scope);
    this.dateFilter.set('');
  }

  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected setStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
  }

  protected setDate(event: Event): void {
    this.dateFilter.set((event.target as HTMLInputElement).value);
  }

  protected resetFilters(): void {
    this.scope.set('upcoming');
    this.query.set('');
    this.statusFilter.set('ALL');
    this.dateFilter.set('');
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

  protected relative(date: string): string {
    return relativeDay(date);
  }

  protected dateShort(date: string): string {
    return formatDateShort(date);
  }

  protected time(value: string): string {
    return formatTime(value);
  }

  protected serviceName(id: string): string {
    return serviceById(id)?.name ?? 'Consultation';
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }
}
