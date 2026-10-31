import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SiteHeader } from '../../layout/site-header/site-header';
import { SiteFooter } from '../../layout/site-footer/site-footer';
import { SupportWidget } from '../../layout/support-widget/support-widget';
import { ConsultationDialog } from '../../shared/consultation-dialog/consultation-dialog';
import { HeroSection } from './sections/hero/hero';
import { ServicesSection } from './sections/services/services';
import { AboutSection } from './sections/about/about';
import { WhyUsSection } from './sections/why-us/why-us';
import { AppointmentSection } from './sections/appointment/appointment';
import { ContactSection } from './sections/contact/contact';
import { TeamSection } from './sections/team/team';
import { TestimonialsSection } from './sections/testimonials/testimonials';
import { FaqSection } from './sections/faq/faq';

@Component({
  selector: 'app-home-page',
  imports: [
    SiteHeader,
    SiteFooter,
    SupportWidget,
    ConsultationDialog,
    HeroSection,
    ServicesSection,
    AboutSection,
    WhyUsSection,
    AppointmentSection,
    ContactSection,
    TeamSection,
    TestimonialsSection,
    FaqSection,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly consultationOpen = signal(false);
}
