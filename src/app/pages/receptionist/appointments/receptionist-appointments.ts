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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ClinicStore } from '../../../core/clinic-store';
import { DENTISTS, SERVICES, dentistById, serviceById } from '../../../core/clinic-data';
import { formatDateShort, formatTime, relativeDay, todayIso } from '../../../core/date.utils';
import { Appointment, AppointmentStatus } from '../../../core/models';
import { AppointmentDialog } from '../../../shared/appointment-dialog/appointment-dialog';
import { Icon } from '../../../shared/icon';
import { RescheduleDialog } from '../../../shared/reschedule-dialog/reschedule-dialog';
import { StatusBadge } from '../../../shared/status-badge';

type Scope = 'upcoming' | 'today' | 'all' | 'past';
type StatusFilter = 'ALL' | AppointmentStatus;

@Component({
  selector: 'app-receptionist-appointments',
  imports: [
    RouterLink,
    Icon,
    StatusBadge,
    AppointmentDialog,
    RescheduleDialog,
  ],
  templateUrl: './receptionist-appointments.html',
  styleUrl: './receptionist-appointments.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionistAppointments implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(ClinicStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly today = todayIso();
  protected readonly doctors = DENTISTS;
  protected readonly services = SERVICES;

  protected readonly query = signal('');
  protected readonly scope = signal<Scope>('upcoming');
  protected readonly dateFilter = signal('');
  protected readonly doctorFilter = signal('all');
  protected readonly serviceFilter = signal('all');
  protected readonly statusFilter = signal<StatusFilter>('ALL');

  protected readonly selected = signal<Appointment | null>(null);
  protected readonly detailsOpen = signal(false);
  protected readonly rescheduleTarget = signal<Appointment | null>(null);
  protected readonly rescheduleOpen = signal(false);
  protected readonly cancelTarget = signal<Appointment | null>(null);
  protected readonly toast = signal<string | null>(null);

  private readonly cancelDialog = viewChild<ElementRef<HTMLDialogElement>>('cancelDialog');
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly counts = computed(() => {
    const all = this.store.appointments();
    return {
      total: all.length,
      today: all.filter((item) => item.appointmentDate === this.today).length,
      pending: all.filter((item) => item.status === 'PENDING').length,
      confirmed: all.filter((item) => item.status === 'CONFIRMED').length,
      cancelled: all.filter((item) => item.status === 'CANCELLED').length,
    };
  });

  protected readonly filtered = computed<Appointment[]>(() => {
    const scope = this.scope();
    const dateFilter = this.dateFilter();
    const doctor = this.doctorFilter();
    const service = this.serviceFilter();
    const status = this.statusFilter();
    const query = this.query().trim().toLowerCase();

    const items = this.store.appointments().filter((item) => {
      if (dateFilter) {
        return item.appointmentDate === dateFilter;
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
    });

    return items
      .filter((item) => doctor === 'all' || item.doctorId === doctor)
      .filter((item) => service === 'all' || item.serviceId === service)
      .filter((item) => status === 'ALL' || item.status === status)
      .filter((item) => {
        if (!query) {
          return true;
        }
        return [
          item.patientName,
          item.reference,
          item.email,
          item.phone,
          this.serviceName(item.serviceId),
          this.doctorName(item.doctorId),
          this.creatorName(item.createdByUserId),
        ]
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

  ngOnInit(): void {
    const date = this.route.snapshot.queryParamMap.get('date');
    if (date) {
      this.dateFilter.set(date);
      this.scope.set('all');
    }
  }

  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected setScope(scope: Scope): void {
    this.scope.set(scope);
    this.dateFilter.set('');
  }

  protected setDate(event: Event): void {
    this.dateFilter.set((event.target as HTMLInputElement).value);
  }

  protected setDoctor(event: Event): void {
    this.doctorFilter.set((event.target as HTMLSelectElement).value);
  }

  protected setService(event: Event): void {
    this.serviceFilter.set((event.target as HTMLSelectElement).value);
  }

  protected setStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
  }

  protected resetFilters(): void {
    this.query.set('');
    this.scope.set('upcoming');
    this.dateFilter.set('');
    this.doctorFilter.set('all');
    this.serviceFilter.set('all');
    this.statusFilter.set('ALL');
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
    this.showToast(
      `${item.patientName} moved to ${this.relative(item.appointmentDate)} at ${this.time(item.startTime)}.`,
    );
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

  protected requestCancel(item: Appointment): void {
    this.cancelTarget.set(item);
    this.cancelDialog()?.nativeElement.showModal();
  }

  protected closeCancel(event?: Event): void {
    event?.preventDefault();
    this.cancelDialog()?.nativeElement.close();
    this.cancelTarget.set(null);
  }

  protected confirmCancel(): void {
    const item = this.cancelTarget();
    if (!item) {
      return;
    }
    const result = this.store.updateStatus(item.id, 'CANCELLED');
    this.closeCancel();
    this.showToast(
      result.ok
        ? `${item.patientName}'s appointment was cancelled and the slot released.`
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

  protected doctorName(id: string): string {
    return dentistById(id)?.name ?? 'Care team';
  }

  protected serviceName(id: string): string {
    return serviceById(id)?.name ?? 'Consultation';
  }

  protected creatorName(id: string): string {
    const user = this.auth.users().find((item) => item.id === id);
    if (!user) {
      return 'Demo record';
    }
    return `${user.name} · ${this.auth.roleLabel(user.role)}`;
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toast.set(null), 3400);
  }
}
