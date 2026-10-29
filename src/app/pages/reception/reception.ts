import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CLINIC, dentistById, serviceById } from '../../core/clinic-data';
import { ClinicStore } from '../../core/clinic-store';
import {
  formatDateLong,
  formatTime,
  formatTimestamp,
  relativeDay,
  todayIso,
} from '../../core/date.utils';
import {
  Appointment,
  AppointmentStatus,
  ClinicMessage,
  IconName,
  MessageSource,
} from '../../core/models';
import { Icon } from '../../shared/icon';

type Tab = 'appointments' | 'messages';
type Scope = 'today' | 'upcoming' | 'all';
type StatusFilter = 'all' | AppointmentStatus;

interface ScopeOption {
  readonly value: Scope;
  readonly label: string;
}

interface Kpi {
  readonly label: string;
  readonly value: number;
  readonly icon: IconName;
  readonly tone: string;
}

@Component({
  selector: 'app-reception-page',
  imports: [RouterLink, Icon],
  templateUrl: './reception.html',
  styleUrl: './reception.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionPage {
  protected readonly clinic = CLINIC;
  protected readonly store = inject(ClinicStore);
  protected readonly today = todayIso();
  protected readonly todayLabel = formatDateLong(this.today);

  protected readonly scopes: readonly ScopeOption[] = [
    { value: 'today', label: 'Today' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'all', label: 'All' },
  ];

  protected readonly scope = signal<Scope>('today');
  protected readonly status = signal<StatusFilter>('all');
  protected readonly query = signal('');
  protected readonly tab = signal<Tab>('appointments');
  protected readonly toast = signal<string | null>(null);

  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly todayCount = computed(
    () =>
      this.store
        .appointments()
        .filter(
          (appointment) => appointment.date === this.today && appointment.status !== 'cancelled',
        ).length,
  );

  protected readonly kpis = computed<Kpi[]>(() => {
    const todayAppointments = this.store
      .appointments()
      .filter((appointment) => appointment.date === this.today);

    return [
      {
        label: 'Appointments today',
        value: todayAppointments.filter((appointment) => appointment.status !== 'cancelled').length,
        icon: 'calendar',
        tone: 'teal',
      },
      {
        label: 'Awaiting confirmation',
        value: this.store.pendingAppointments().length,
        icon: 'clock',
        tone: 'amber',
      },
      {
        label: 'Completed today',
        value: todayAppointments.filter((appointment) => appointment.status === 'completed').length,
        icon: 'check',
        tone: 'green',
      },
      {
        label: 'Open enquiries',
        value: this.store.openMessages().length,
        icon: 'inbox',
        tone: 'blue',
      },
    ];
  });

  protected readonly filteredAppointments = computed<Appointment[]>(() => {
    const scope = this.scope();
    const status = this.status();
    const query = this.query().trim().toLowerCase();

    return this.store
      .appointments()
      .filter((appointment) => {
        if (scope === 'today') {
          return appointment.date === this.today;
        }
        if (scope === 'upcoming') {
          return appointment.date >= this.today;
        }
        return true;
      })
      .filter((appointment) => status === 'all' || appointment.status === status)
      .filter((appointment) => {
        if (!query) {
          return true;
        }
        const haystack = [
          appointment.patientName,
          appointment.reference,
          appointment.email,
          appointment.phone,
          this.serviceName(appointment.serviceId),
          this.dentistName(appointment.dentistId),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice()
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  });

  protected readonly sortedMessages = computed<ClinicMessage[]>(() =>
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

  protected setScope(scope: Scope): void {
    this.scope.set(scope);
  }

  protected setStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as StatusFilter);
  }

  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected setTab(tab: Tab): void {
    this.tab.set(tab);
  }

  protected resetFilters(): void {
    this.status.set('all');
    this.query.set('');
    this.scope.set('today');
  }

  protected confirm(appointment: Appointment): void {
    this.store.updateStatus(appointment.id, 'confirmed');
    this.showToast(`${appointment.patientName}'s appointment is confirmed.`);
  }

  protected complete(appointment: Appointment): void {
    this.store.updateStatus(appointment.id, 'completed');
    this.showToast(`${appointment.patientName} marked as completed.`);
  }

  protected cancel(appointment: Appointment): void {
    this.store.updateStatus(appointment.id, 'cancelled');
    this.showToast(`${appointment.patientName}'s appointment was cancelled.`);
  }

  protected resolve(message: ClinicMessage): void {
    this.store.resolveMessage(message.id);
    this.showToast(`Enquiry from ${message.name} marked resolved.`);
  }

  protected serviceName(id: string): string {
    return serviceById(id)?.name ?? 'Consultation';
  }

  protected dentistName(id: string): string {
    return dentistById(id)?.name ?? 'First available';
  }

  protected time(value: string): string {
    return formatTime(value);
  }

  protected relative(date: string): string {
    return relativeDay(date);
  }

  protected timestamp(value: string): string {
    return formatTimestamp(value);
  }

  protected statusLabel(status: AppointmentStatus): string {
    switch (status) {
      case 'pending':
        return 'Needs confirmation';
      case 'confirmed':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      default:
        return 'Cancelled';
    }
  }

  protected statusClass(status: AppointmentStatus): string {
    return `is-${status}`;
  }

  protected sourceLabel(source: MessageSource): string {
    switch (source) {
      case 'consultation':
        return 'Consultation request';
      case 'chat':
        return 'Care chat';
      default:
        return 'Contact form';
    }
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toast.set(null), 3400);
  }
}
