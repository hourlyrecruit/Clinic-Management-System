import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ClinicStore } from '../../../core/clinic-store';
import { dentistById, serviceById } from '../../../core/clinic-data';
import { dayParts, formatDateLong, formatTime, relativeDay } from '../../../core/date.utils';
import { Icon } from '../../../shared/icon';
import { StatusBadge } from '../../../shared/status-badge';

type Tab = 'upcoming' | 'past';

@Component({
  selector: 'app-patient-appointments',
  imports: [RouterLink, Icon, StatusBadge],
  templateUrl: './patient-appointments.html',
  styleUrl: './patient-appointments.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientAppointments {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(ClinicStore);
  protected readonly tab = signal<Tab>('upcoming');

  protected readonly user = this.auth.currentUser;

  protected readonly upcoming = computed(() => {
    const account = this.user();
    return account ? this.store.upcomingForPatient(account.id) : [];
  });

  protected readonly past = computed(() => {
    const account = this.user();
    return account ? this.store.historyForPatient(account.id) : [];
  });

  protected setTab(tab: Tab): void {
    this.tab.set(tab);
  }

  protected dayParts(date: string) {
    return dayParts(date);
  }

  protected dateLong(date: string): string {
    return formatDateLong(date);
  }

  protected relative(date: string): string {
    return relativeDay(date);
  }

  protected time(value: string): string {
    return formatTime(value);
  }

  protected doctorName(id: string): string {
    return dentistById(id)?.name ?? 'Care team';
  }

  protected doctorRole(id: string): string {
    return dentistById(id)?.role ?? 'Clinician';
  }

  protected doctorImage(id: string): string {
    return dentistById(id)?.image ?? 'images/dentist-ada.jpg';
  }

  protected serviceName(id: string): string {
    return serviceById(id)?.name ?? 'Consultation';
  }
}
