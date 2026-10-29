import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CLINIC } from '../../core/clinic-data';
import { Icon } from '../../shared/icon';

interface NavItem {
  readonly label: string;
  readonly fragment: string;
}

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, Icon],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  protected readonly clinic = CLINIC;
  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Treatments', fragment: 'treatments' },
    { label: 'Our dentists', fragment: 'dentists' },
    { label: 'The clinic', fragment: 'clinic' },
    { label: 'Reviews', fragment: 'reviews' },
    { label: 'FAQs', fragment: 'faqs' },
  ];

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    this.scrolled.set((typeof window !== 'undefined' ? window.scrollY : 0) > 12);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
