import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guard';
import { DashboardShell } from './layout/dashboard-shell/dashboard-shell';

export const routes: Routes = [
  {
    path: '',
    title: 'Lumina Dental Studio — calm, considered dentistry in Portland',
    loadComponent: () => import('./pages/home/home').then((module) => module.HomePage),
  },
  {
    path: 'signin',
    title: 'Sign in · Lumina Dental Studio',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/signin/signin').then((module) => module.SignInPage),
  },
  {
    path: 'signup',
    title: 'Create a patient account · Lumina Dental Studio',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/signup/signup').then((module) => module.SignUpPage),
  },
  {
    path: 'patient',
    component: DashboardShell,
    canActivate: [authGuard, roleGuard('PATIENT')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Your care · Lumina Dental Studio',
        loadComponent: () =>
          import('./pages/patient/dashboard/patient-dashboard').then(
            (module) => module.PatientDashboard,
          ),
      },
      {
        path: 'appointments',
        title: 'Your appointments · Lumina Dental Studio',
        loadComponent: () =>
          import('./pages/patient/appointments/patient-appointments').then(
            (module) => module.PatientAppointments,
          ),
      },
      {
        path: 'book-appointment',
        title: 'Book a visit · Lumina Dental Studio',
        loadComponent: () =>
          import('./pages/patient/book-appointment/patient-book-appointment').then(
            (module) => module.PatientBookAppointment,
          ),
      },
    ],
  },
  {
    path: 'receptionist',
    component: DashboardShell,
    canActivate: [authGuard, roleGuard('RECEPTIONIST')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Front desk · Lumina Dental Studio',
        loadComponent: () =>
          import('./pages/receptionist/dashboard/receptionist-dashboard').then(
            (module) => module.ReceptionistDashboard,
          ),
      },
      {
        path: 'appointments',
        title: 'Appointment management · Lumina Dental Studio',
        loadComponent: () =>
          import('./pages/receptionist/appointments/receptionist-appointments').then(
            (module) => module.ReceptionistAppointments,
          ),
      },
      {
        path: 'book-appointment',
        title: 'Book for a patient · Lumina Dental Studio',
        loadComponent: () =>
          import('./pages/receptionist/book-appointment/receptionist-book-appointment').then(
            (module) => module.ReceptionistBookAppointment,
          ),
      },
      {
        path: 'patients',
        title: 'Patient records · Lumina Dental Studio',
        loadComponent: () =>
          import('./pages/receptionist/patients/receptionist-patients').then(
            (module) => module.ReceptionistPatients,
          ),
      },
    ],
  },
  {
    path: 'doctor',
    component: DashboardShell,
    canActivate: [authGuard, roleGuard('DOCTOR')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Clinician dashboard · Lumina Dental Studio',
        loadComponent: () =>
          import('./pages/doctor/dashboard/doctor-dashboard').then(
            (module) => module.DoctorDashboard,
          ),
      },
      {
        path: 'appointments',
        title: 'My schedule · Lumina Dental Studio',
        loadComponent: () =>
          import('./pages/doctor/appointments/doctor-appointments').then(
            (module) => module.DoctorAppointments,
          ),
      },
    ],
  },
  { path: 'book', pathMatch: 'full', redirectTo: 'patient/book-appointment' },
  { path: 'reception', pathMatch: 'full', redirectTo: 'receptionist/dashboard' },
  { path: '**', redirectTo: '' },
];
