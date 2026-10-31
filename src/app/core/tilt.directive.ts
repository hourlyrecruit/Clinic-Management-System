import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { hasFinePointer, prefersReducedMotion } from './motion';

/**
 * Interactive 3D tilt. Writes `--tilt-x`, `--tilt-y` (degrees) and `--glow-x`, `--glow-y`
 * (percent) onto the host so CSS decides how to use them:
 *
 *   transform: perspective(900px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
 *
 * Disabled for touch devices and for visitors who prefer reduced motion.
 */
@Directive({
  selector: '[appTilt]',
})
export class TiltDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Maximum rotation in degrees. */
  readonly max = input(7, { alias: 'tiltMax' });

  constructor() {
    afterNextRender(() => {
      if (prefersReducedMotion() || !hasFinePointer()) {
        return;
      }

      const element = this.host.nativeElement;
      let frame = 0;
      let nextX = 0;
      let nextY = 0;
      let nextGlowX = 50;
      let nextGlowY = 50;

      const paint = (): void => {
        frame = 0;
        element.style.setProperty('--tilt-x', `${nextX.toFixed(2)}deg`);
        element.style.setProperty('--tilt-y', `${nextY.toFixed(2)}deg`);
        element.style.setProperty('--glow-x', `${nextGlowX.toFixed(1)}%`);
        element.style.setProperty('--glow-y', `${nextGlowY.toFixed(1)}%`);
      };

      const schedule = (): void => {
        if (!frame) {
          frame = requestAnimationFrame(paint);
        }
      };

      const onMove = (event: PointerEvent): void => {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return;
        }
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        const max = this.max();
        nextY = (px - 0.5) * 2 * max;
        nextX = (0.5 - py) * 2 * max;
        nextGlowX = px * 100;
        nextGlowY = py * 100;
        element.classList.add('is-tilting');
        schedule();
      };

      const onLeave = (): void => {
        nextX = 0;
        nextY = 0;
        nextGlowX = 50;
        nextGlowY = 50;
        element.classList.remove('is-tilting');
        schedule();
      };

      element.addEventListener('pointermove', onMove, { passive: true });
      element.addEventListener('pointerleave', onLeave, { passive: true });

      this.destroyRef.onDestroy(() => {
        element.removeEventListener('pointermove', onMove);
        element.removeEventListener('pointerleave', onLeave);
        if (frame) {
          cancelAnimationFrame(frame);
        }
      });
    });
  }
}
