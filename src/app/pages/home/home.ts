import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SiteHeader } from '../../layout/site-header/site-header';
import { SiteFooter } from '../../layout/site-footer/site-footer';
import { SupportWidget } from '../../layout/support-widget/support-widget';
import { ConsultationDialog } from '../../shared/consultation-dialog/consultation-dialog';
import { HeroSection } from './sections/hero/hero';
import { ServicesSection } from './sections/services/services';
import { ConsultationSection } from './sections/consultation/consultation';
import { TeamSection } from './sections/team/team';
import { ClinicSection } from './sections/clinic/clinic';
import { TestimonialsSection } from './sections/testimonials/testimonials';
import { FaqSection } from './sections/faq/faq';
import { CtaSection } from './sections/cta/cta';

@Component({
  selector: 'app-home-page',
  imports: [
    SiteHeader,
    SiteFooter,
    SupportWidget,
    ConsultationDialog,
    HeroSection,
    ServicesSection,
    ConsultationSection,
    TeamSection,
    ClinicSection,
    TestimonialsSection,
    FaqSection,
    CtaSection,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly consultationOpen = signal(false);
}
