import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
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
  protected readonly auth = inject(AuthService);
  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);
  protected readonly user = this.auth.currentUser;

  protected readonly initials = computed(() =>
    (this.user()?.name ?? '')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.replace('.', '').charAt(0).toUpperCase())
      .join(''),
  );

  protected readonly dashboardPath = computed(() => this.auth.homePath(this.user()));

  protected readonly dashboardLabel = computed(() => {
    switch (this.user()?.role) {
      case 'RECEPTIONIST':
        return 'Reception desk';
      case 'DOCTOR':
        return 'My schedule';
      case 'PATIENT':
        return 'My dashboard';
      default:
        return 'Sign in';
    }
  });

  protected readonly primaryPath = computed(() => {
    switch (this.user()?.role) {
      case 'RECEPTIONIST':
        return '/receptionist/book-appointment';
      case 'DOCTOR':
        return '/doctor/appointments';
      default:
        return '/book';
    }
  });

  protected readonly primaryLabel = computed(() => {
    switch (this.user()?.role) {
      case 'RECEPTIONIST':
        return 'New booking';
      case 'DOCTOR':
        return 'My schedule';
      default:
        return 'Book a visit';
    }
  });

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
