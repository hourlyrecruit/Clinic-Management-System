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
import { AuthService } from '../../../core/auth.service';
import { ClinicStore } from '../../../core/clinic-store';
import { dentistById, serviceById } from '../../../core/clinic-data';
import {
  dayParts,
  formatDateLong,
  formatDateShort,
  formatTime,
  relativeDay,
} from '../../../core/date.utils';
import { Appointment } from '../../../core/models';
import { Icon } from '../../../shared/icon';
import { StatusBadge } from '../../../shared/status-badge';

@Component({
  selector: 'app-patient-dashboard',
  imports: [RouterLink, ReactiveFormsModule, Icon, StatusBadge],
  templateUrl: './patient-dashboard.html',
  styleUrl: './patient-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientDashboard implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(ClinicStore);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileDialog = viewChild<ElementRef<HTMLDialogElement>>('profileDialog');

  protected readonly user = this.auth.currentUser;
  protected readonly registered = signal(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly toast = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    }
    if (hour < 18) {
      return 'Good afternoon';
    }
    return 'Good evening';
  });

  protected readonly firstName = computed(() => (this.user()?.name ?? '').split(' ')[0] || 'there');

  protected readonly upcoming = computed(() => {
    const account = this.user();
    return account ? this.store.upcomingForPatient(account.id) : [];
  });

  protected readonly history = computed(() => {
    const account = this.user();
    return account ? this.store.historyForPatient(account.id) : [];
  });

  protected readonly nextAppointment = computed<Appointment | undefined>(() => this.upcoming()[0]);

  protected readonly completedCount = computed(() => {
    const account = this.user();
    return account
      ? this.store.forPatient(account.id).filter((item) => item.status === 'COMPLETED').length
      : 0;
  });

  protected readonly profileForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^[+()\d\s-]{7,}$/)]],
  });

  ngOnInit(): void {
    this.registered.set(this.route.snapshot.queryParamMap.get('registered') === '1');
  }

  protected initials(): string {
    return (this.user()?.name ?? '')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  protected dayParts(date: string) {
    return dayParts(date);
  }

  protected dateLong(date: string): string {
    return formatDateLong(date);
  }

  protected dateShort(date: string): string {
    return formatDateShort(date);
  }

  protected time(value: string): string {
    return formatTime(value);
  }

  protected relative(date: string): string {
    return relativeDay(date);
  }

  protected doctorName(id: string): string {
    return dentistById(id)?.name ?? 'Care team';
  }

  protected doctorImage(id: string): string {
    return dentistById(id)?.image ?? 'images/dentist-ada.jpg';
  }

  protected doctorRole(id: string): string {
    return dentistById(id)?.role ?? 'Care team';
  }

  protected serviceName(id: string): string {
    return serviceById(id)?.name ?? 'Consultation';
  }

  protected openProfile(): void {
    const account = this.user();
    if (!account) {
      return;
    }
    this.profileForm.setValue({ name: account.name, phone: account.phone });
    this.profileError.set(null);
    this.profileDialog()?.nativeElement.showModal();
  }

  protected closeProfile(event?: Event): void {
    event?.preventDefault();
    this.profileDialog()?.nativeElement.close();
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const value = this.profileForm.getRawValue();
    const result = this.auth.updateProfile({ name: value.name, phone: value.phone });
    if (!result.ok) {
      this.profileError.set(result.error ?? 'Your profile could not be updated.');
      return;
    }
    this.closeProfile();
    this.showToast('Your demo profile has been updated.');
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }
}
