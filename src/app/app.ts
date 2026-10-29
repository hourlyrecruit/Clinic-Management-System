import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const fragment = this.router.parseUrl(this.router.url).fragment;
        if (fragment) {
          this.scrollToFragment(fragment);
        }
      });
  }

  /**
   * The home view is lazy-loaded, so the anchor target may not exist at the moment
   * NavigationEnd fires. Poll briefly for it, then scroll.
   */
  private scrollToFragment(fragment: string): void {
    let attempts = 0;

    const tryScroll = (): void => {
      const target = typeof document !== 'undefined' ? document.getElementById(fragment) : null;
      if (target) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      if (attempts < 24) {
        attempts += 1;
        setTimeout(tryScroll, 50);
      }
    };

    setTimeout(tryScroll, 0);
  }
}
