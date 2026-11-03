import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SiteHeader } from '../layout/site-header/site-header';
import { SiteFooter } from '../layout/site-footer/site-footer';
import { SupportWidget } from '../layout/support-widget/support-widget';
import { ConsultationDialog } from '../shared/consultation-dialog/consultation-dialog';
import { AnimatedHero } from './animated-hero';
import { ServicesSection } from '../pages/home/sections/services/services';
import { ConsultationSection } from '../pages/home/sections/consultation/consultation';
import { TeamSection } from '../pages/home/sections/team/team';
import { ClinicSection } from '../pages/home/sections/clinic/clinic';
import { TestimonialsSection } from '../pages/home/sections/testimonials/testimonials';
import { FaqSection } from '../pages/home/sections/faq/faq';
import { CtaSection } from '../pages/home/sections/cta/cta';

@Component({
  selector: 'app-animated-home',
  imports: [
    SiteHeader,
    SiteFooter,
    SupportWidget,
    ConsultationDialog,
    AnimatedHero,
    ServicesSection,
    ConsultationSection,
    TeamSection,
    ClinicSection,
    TestimonialsSection,
    FaqSection,
    CtaSection,
  ],
  template: `
    <app-site-header />
    <main id="main-content">
      <app-animated-hero (requestConsultation)="consultationOpen.set(true)" />
      <app-services-section />
      <app-consultation-section (requestConsultation)="consultationOpen.set(true)" />
      <app-team-section />
      <app-clinic-section />
      <app-testimonials-section />
      <app-faq-section />
      <app-cta-section (requestConsultation)="consultationOpen.set(true)" />
    </main>
    <app-site-footer />
    <app-support-widget />
    <app-consultation-dialog [open]="consultationOpen()" (closed)="consultationOpen.set(false)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimatedHomePage {
  protected readonly consultationOpen = signal(false);
}

