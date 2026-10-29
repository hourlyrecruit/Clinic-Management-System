import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Lumina Dental Studio — calm, considered dentistry in Portland',
    loadComponent: () => import('./pages/home/home').then((module) => module.HomePage),
  },
  {
    path: 'book',
    title: 'Book an appointment · Lumina Dental Studio',
    loadComponent: () => import('./pages/booking/booking').then((module) => module.BookingPage),
  },
  {
    path: 'reception',
    title: 'Reception desk · Lumina Dental Studio',
    loadComponent: () =>
      import('./pages/reception/reception').then((module) => module.ReceptionPage),
  },
  { path: '**', redirectTo: '' },
];
