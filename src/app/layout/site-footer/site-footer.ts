import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CLINIC, HOURS, SERVICES } from '../../core/clinic-data';
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
  protected readonly explore = [
    { label: 'Treatments', fragment: 'treatments' },
    { label: 'Our dentists', fragment: 'dentists' },
    { label: 'The clinic', fragment: 'clinic' },
    { label: 'Reviews', fragment: 'reviews' },
    { label: 'FAQs', fragment: 'faqs' },
  ] as const;
  protected readonly year = new Date().getFullYear();
}
