import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingWizard } from '../../../shared/booking-wizard/booking-wizard';
import { Icon } from '../../../shared/icon';

@Component({
  selector: 'app-patient-book-appointment',
  imports: [RouterLink, BookingWizard, Icon],
  templateUrl: './patient-book-appointment.html',
  styleUrl: './patient-book-appointment.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientBookAppointment {}
