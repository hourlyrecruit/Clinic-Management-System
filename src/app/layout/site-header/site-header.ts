import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
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
  protected readonly progress = signal(0);
  /** Fragment of the home-page section currently in view (null on other pages). */
  protected readonly active = signal<string | null>(null);

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Home', fragment: 'home' },
    { label: 'About Us', fragment: 'about' },
    { label: 'Services', fragment: 'services' },
    { label: 'Doctors', fragment: 'doctors' },
    { label: 'Contact', fragment: 'contact' },
  ];

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') {
        return;
      }

      // Highlight the nav link whose section crosses a band just above the middle of the viewport.
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this.active.set(entry.target.id);
            }
          }
        },
        { rootMargin: '-40% 0px -55% 0px' },
      );

      for (const item of this.navItems) {
        const section = document.getElementById(item.fragment);
        if (section) {
          observer.observe(section);
        }
      }
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.scrolled.set(window.scrollY > 12);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    this.progress.set(max > 0 ? Math.min(1, window.scrollY / max) : 0);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
