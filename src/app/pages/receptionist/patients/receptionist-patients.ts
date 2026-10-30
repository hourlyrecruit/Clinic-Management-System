import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ClinicStore } from '../../../core/clinic-store';
import { dentistById, serviceById } from '../../../core/clinic-data';
import { formatDateShort, formatTime } from '../../../core/date.utils';
import { AuthUser } from '../../../core/models';
import { Icon } from '../../../shared/icon';
import { PatientForm, PatientFormResult } from '../../../shared/patient-form/patient-form';
import { StatusBadge } from '../../../shared/status-badge';

@Component({
  selector: 'app-receptionist-patients',
  imports: [RouterLink, Icon, PatientForm, StatusBadge],
  templateUrl: './receptionist-patients.html',
  styleUrl: './receptionist-patients.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionistPatients {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(ClinicStore);

  protected readonly query = signal('');
  protected readonly selected = signal<AuthUser | null>(null);
  protected readonly toast = signal<string | null>(null);

  private readonly newDialog = viewChild<ElementRef<HTMLDialogElement>>('newDialog');
  private readonly patientDialog = viewChild<ElementRef<HTMLDialogElement>>('patientDialog');
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly results = computed(() => this.auth.searchPatients(this.query()));

  protected readonly selectedAppointments = computed(() => {
    const patient = this.selected();
    return patient ? this.store.forPatient(patient.id) : [];
  });

  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected openNew(): void {
    this.newDialog()?.nativeElement.showModal();
  }

  protected closeNew(event?: Event): void {
    event?.preventDefault();
    this.newDialog()?.nativeElement.close();
  }

  protected onSaved(result: PatientFormResult): void {
    this.closeNew();
    this.query.set('');
    this.showToast(
      result.created
        ? `${result.user.name} was added to the demo patient list.`
        : `${result.user.name} already existed — reused that record.`,
    );
  }

  protected openPatient(patient: AuthUser): void {
    this.selected.set(patient);
    this.patientDialog()?.nativeElement.showModal();
  }

  protected closePatient(event?: Event): void {
    event?.preventDefault();
    this.patientDialog()?.nativeElement.close();
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  protected appointmentCount(patientId: string): number {
    return this.store.forPatient(patientId).length;
  }

  protected upcomingCount(patientId: string): number {
    return this.store.upcomingForPatient(patientId).length;
  }

  protected serviceName(id: string): string {
    return serviceById(id)?.name ?? 'Consultation';
  }

  protected doctorName(id: string): string {
    return dentistById(id)?.name ?? 'Care team';
  }

  protected dateShort(date: string): string {
    return formatDateShort(date);
  }

  protected time(value: string): string {
    return formatTime(value);
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }
}
