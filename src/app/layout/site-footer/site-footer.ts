import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CLINIC, HOURS, SERVICES, SOCIAL_LINKS } from '../../core/clinic-data';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, Icon],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {
  protected readonly clinic = CLINIC;
  protected readonly hours = HOURS;
  protected readonly services = SERVICES;
  protected readonly social = SOCIAL_LINKS;
  protected readonly explore = [
    { label: 'Home', fragment: 'home' },
    { label: 'About Us', fragment: 'about' },
    { label: 'Services', fragment: 'services' },
    { label: 'Doctors', fragment: 'doctors' },
    { label: 'Reviews', fragment: 'reviews' },
    { label: 'FAQs', fragment: 'faqs' },
    { label: 'Contact', fragment: 'contact' },
  ] as const;
  protected readonly year = new Date().getFullYear();
}
