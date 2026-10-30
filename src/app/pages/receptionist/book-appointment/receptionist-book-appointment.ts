import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ClinicStore } from '../../../core/clinic-store';
import { AuthUser } from '../../../core/models';
import { BookingWizard } from '../../../shared/booking-wizard/booking-wizard';
import { Icon } from '../../../shared/icon';
import { PatientForm, PatientFormResult } from '../../../shared/patient-form/patient-form';

@Component({
  selector: 'app-receptionist-book-appointment',
  imports: [RouterLink, BookingWizard, PatientForm, Icon],
  templateUrl: './receptionist-book-appointment.html',
  styleUrl: './receptionist-book-appointment.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionistBookAppointment implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(ClinicStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly creator = this.auth.currentUser;
  protected readonly query = signal('');
  protected readonly selectedPatient = signal<AuthUser | null>(null);
  protected readonly matchNotice = signal<string | null>(null);
  protected readonly toast = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly results = computed(() => this.auth.searchPatients(this.query()).slice(0, 8));

  ngOnInit(): void {
    const patientId = this.route.snapshot.queryParamMap.get('patientId');
    if (patientId) {
      const patient = this.auth.patientById(patientId);
      if (patient) {
        this.selectedPatient.set(patient);
      }
    }
  }

  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected selectPatient(patient: AuthUser): void {
    this.selectedPatient.set(patient);
    this.matchNotice.set(null);
  }

  protected onPatientSaved(result: PatientFormResult): void {
    this.selectedPatient.set(result.user);
    this.matchNotice.set(
      result.created
        ? 'New patient record created. Continue with the appointment details below.'
        : 'A matching patient record already existed, so we reused it instead of creating a duplicate.',
    );
    this.showToast(
      result.created ? 'Patient record created.' : 'Existing patient record matched.',
    );
  }

  protected changePatient(): void {
    this.selectedPatient.set(null);
    this.matchNotice.set(null);
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

  protected isProvisional(patient: AuthUser): boolean {
    return patient.provisional === true;
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }
}
