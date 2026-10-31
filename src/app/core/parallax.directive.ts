import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { prefersReducedMotion } from './motion';

/**
 * Scroll parallax. While the host is on screen, writes `--parallax-y` (px) which CSS applies as
 * `transform: translate3d(0, var(--parallax-y, 0px), 0)`. Positive speeds drift against the scroll
 * direction (feel "further away"), negative speeds drift with it.
 */
@Directive({
  selector: '[appParallax]',
})
export class ParallaxDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly speed = input(0.12, { alias: 'appParallax' });

  constructor() {
    afterNextRender(() => {
      if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
        return;
      }

      const element = this.host.nativeElement;
      let visible = false;
      let frame = 0;

      const update = (): void => {
        frame = 0;
        if (!visible) {
          return;
        }
        const rect = element.getBoundingClientRect();
        const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
        element.style.setProperty('--parallax-y', `${(-offset * this.speed()).toFixed(1)}px`);
      };

      const schedule = (): void => {
        if (!frame) {
          frame = requestAnimationFrame(update);
        }
      };

      const observer = new IntersectionObserver(
        (entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          if (visible) {
            schedule();
          }
        },
        { rootMargin: '120px 0px' },
      );
      observer.observe(element);

      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });

      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        if (frame) {
          cancelAnimationFrame(frame);
        }
      });
    });
  }
}
