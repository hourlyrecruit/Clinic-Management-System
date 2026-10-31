import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { prefersReducedMotion } from './motion';

/**
 * Animates a number from 0 up to `countTo` the first time it scrolls into view.
 * The element should be empty in the template; the directive owns its text.
 * The final value is written immediately, so no-JS and reduced-motion users see the real number.
 */
@Directive({
  selector: '[appCountUp]',
})
export class CountUpDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly target = input.required<number>({ alias: 'countTo' });
  readonly decimals = input(0, { alias: 'countDecimals' });
  readonly suffix = input('', { alias: 'countSuffix' });

  constructor() {
    afterNextRender(() => {
      const element = this.host.nativeElement;
      const format = (value: number): string =>
        `${value.toLocaleString('en-US', {
          minimumFractionDigits: this.decimals(),
          maximumFractionDigits: this.decimals(),
        })}${this.suffix()}`;

      element.textContent = format(this.target());

      if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
        return;
      }

      element.textContent = format(0);
      let frame = 0;

      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) {
            return;
          }
          observer.disconnect();
          const duration = 1400;
          const start = performance.now();
          const tick = (now: number): void => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            element.textContent = format(this.target() * eased);
            if (progress < 1) {
              frame = requestAnimationFrame(tick);
            }
          };
          frame = requestAnimationFrame(tick);
        },
        { threshold: 0.6 },
      );
      observer.observe(element);

      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        if (frame) {
          cancelAnimationFrame(frame);
        }
      });
    });
  }
}
