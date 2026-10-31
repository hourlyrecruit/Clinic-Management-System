import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CLINIC, TESTIMONIALS } from '../../../../core/clinic-data';
import { prefersReducedMotion } from '../../../../core/motion';
import { RevealDirective } from '../../../../core/reveal.directive';
import { Icon } from '../../../../shared/icon';

const AUTOPLAY_MS = 5500;
const SWIPE_THRESHOLD = 50;

function slidesPerView(): number {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 3;
  }
  if (window.matchMedia('(min-width: 1000px)').matches) {
    return 3;
  }
  return window.matchMedia('(min-width: 680px)').matches ? 2 : 1;
}

@Component({
  selector: 'app-testimonials-section',
  imports: [Icon, RevealDirective],
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestimonialsSection {
  protected readonly clinic = CLINIC;
  protected readonly testimonials = TESTIMONIALS;
  protected readonly stars = [1, 2, 3, 4, 5];

  protected readonly perView = signal(slidesPerView());
  protected readonly index = signal(0);
  /** Visitor's choice: autoplay on/off. Starts off for people who prefer reduced motion. */
  protected readonly playing = signal(!prefersReducedMotion());
  protected readonly hovering = signal(false);
  protected readonly focused = signal(false);

  protected readonly maxIndex = computed(() => Math.max(0, this.testimonials.length - this.perView()));
  protected readonly pages = computed(() => Array.from({ length: this.maxIndex() + 1 }, (_, i) => i));
  protected readonly slideBasis = computed(() => `${100 / this.perView()}%`);
  protected readonly trackTransform = computed(
    () => `translate3d(${-this.index() * (100 / this.perView())}%, 0, 0)`,
  );

  private pointerStartX: number | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      // Keep slides-per-view in sync with the viewport.
      const queries = [window.matchMedia('(min-width: 1000px)'), window.matchMedia('(min-width: 680px)')];
      const update = (): void => this.setPerView(slidesPerView());
      queries.forEach((query) => query.addEventListener('change', update));
      update();

      const timer = window.setInterval(() => {
        if (
          this.playing() &&
          !this.hovering() &&
          !this.focused() &&
          document.visibilityState === 'visible'
        ) {
          this.advance();
        }
      }, AUTOPLAY_MS);

      destroyRef.onDestroy(() => {
        window.clearInterval(timer);
        queries.forEach((query) => query.removeEventListener('change', update));
      });
    });
  }

  protected isVisible(slide: number): boolean {
    return slide >= this.index() && slide < this.index() + this.perView();
  }

  protected goTo(page: number): void {
    this.index.set(Math.min(Math.max(0, page), this.maxIndex()));
  }

  protected prev(): void {
    this.index.update((current) => (current <= 0 ? this.maxIndex() : current - 1));
  }

  protected next(): void {
    this.advance();
  }

  protected togglePlaying(): void {
    this.playing.update((value) => !value);
  }

  protected onPointerDown(event: PointerEvent): void {
    this.pointerStartX = event.pointerType === 'touch' ? event.clientX : null;
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.pointerStartX === null) {
      return;
    }
    const distance = event.clientX - this.pointerStartX;
    this.pointerStartX = null;
    if (Math.abs(distance) > SWIPE_THRESHOLD) {
      if (distance < 0) {
        this.advance();
      } else {
        this.prev();
      }
    }
  }

  protected initials(name: string): string {
    return name
      .replace(/\./g, '')
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  private advance(): void {
    this.index.update((current) => (current >= this.maxIndex() ? 0 : current + 1));
  }

  private setPerView(value: number): void {
    this.perView.set(value);
    this.index.update((current) => Math.min(current, this.maxIndex()));
  }
}
