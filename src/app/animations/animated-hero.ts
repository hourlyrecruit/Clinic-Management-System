import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CLINIC, DENTISTS } from '../core/clinic-data';
import { ClinicStore } from '../core/clinic-store';
import { addDays, formatTime, relativeDay, todayIso } from '../core/date.utils';
import { Icon } from '../shared/icon';
import type { SceneController } from './three-scene';

interface Opening {
  readonly day: string;
  readonly time: string;
}

@Component({
  selector: 'app-animated-hero',
  imports: [RouterLink, Icon],
  templateUrl: './animated-hero.html',
  styleUrl: './animated-hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimatedHero {
  readonly requestConsultation = output<void>();

  protected readonly clinic = CLINIC;
  protected readonly dentists = DENTISTS;
  protected readonly headlineWords = ['Your', 'Smile,', 'Our', 'Priority'] as const;

  protected readonly webglSupported = signal(true);
  protected readonly wordsRevealed = signal(0);
  protected readonly sceneReady = signal(false);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('heroCanvas');
  private readonly containerRef = viewChild<ElementRef<HTMLElement>>('heroContainer');

  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(ClinicStore);

  private controller: SceneController | null = null;
  private intersectionObs: IntersectionObserver | null = null;
  private boundOnMouse: ((e: MouseEvent) => void) | null = null;
  private boundOnClick: ((e: MouseEvent) => void) | null = null;
  private boundOnScroll: (() => void) | null = null;
  private boundOnVisibility: (() => void) | null = null;
  private wordTimers: ReturnType<typeof setTimeout>[] = [];

  protected readonly nextOpening = computed<Opening>(() => {
    const today = todayIso();
    for (let offset = 0; offset < 14; offset++) {
      const date = addDays(today, offset);
      for (const dentist of DENTISTS) {
        const slot = this.store
          .availableSlots(dentist.id, date, 'preventive')
          .find((item) => item.available);
        if (slot) {
          return { day: relativeDay(date), time: formatTime(slot.startTime) };
        }
      }
    }
    return { day: 'This week', time: 'Call us' };
  });

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      this.startWordReveal();
      this.initThreeScene();
    });

    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });
  }

  /* ---- word-by-word headline animation ---- */
  private startWordReveal(): void {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      this.wordsRevealed.set(this.headlineWords.length);
      return;
    }
    for (let i = 0; i < this.headlineWords.length; i++) {
      const timer = setTimeout(() => {
        this.wordsRevealed.set(i + 1);
      }, 300 + i * 170);
      this.wordTimers.push(timer);
    }
  }

  /* ---- three.js scene init ---- */
  private async initThreeScene(): Promise<void> {
    // Check WebGL support
    if (!this.checkWebGL()) {
      this.webglSupported.set(false);
      return;
    }

    const canvasEl = this.canvasRef()?.nativeElement;
    const containerEl = this.containerRef()?.nativeElement;
    if (!canvasEl || !containerEl) return;

    try {
      const { initScene } = await import('./three-scene');
      const ctrl = await initScene(canvasEl, containerEl);
      this.controller = ctrl;
      this.sceneReady.set(true);

      // Check reduced-motion
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mql.matches) {
        ctrl.setReducedMotion(true);
      }

      // Set up events outside Angular zone
      this.zone.runOutsideAngular(() => {
        this.setupEvents(ctrl, containerEl);
      });
    } catch {
      this.webglSupported.set(false);
    }
  }

  private checkWebGL(): boolean {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      return gl !== null;
    } catch {
      return false;
    }
  }

  /* ---- event listeners (all outside Angular zone) ---- */
  private setupEvents(ctrl: SceneController, container: HTMLElement): void {
    // Mouse move
    this.boundOnMouse = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ctrl.onMouseMove(ndcX, ndcY);
    };
    container.addEventListener('mousemove', this.boundOnMouse, { passive: true });

    // Click
    this.boundOnClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ctrl.onClick(ndcX, ndcY);
    };
    container.addEventListener('click', this.boundOnClick, { passive: true });

    // Scroll
    this.boundOnScroll = () => {
      ctrl.onScroll(window.scrollY);
    };
    window.addEventListener('scroll', this.boundOnScroll, { passive: true });

    // Visibility change
    this.boundOnVisibility = () => {
      if (document.hidden) {
        ctrl.pause();
      } else {
        ctrl.resume();
      }
    };
    document.addEventListener('visibilitychange', this.boundOnVisibility);

    // Intersection observer — pause when off-screen
    this.intersectionObs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            ctrl.resume();
          } else {
            ctrl.pause();
          }
        }
      },
      { threshold: 0.05 },
    );
    this.intersectionObs.observe(container);
  }

  /* ---- cleanup ---- */
  private cleanup(): void {
    for (const t of this.wordTimers) clearTimeout(t);
    this.wordTimers.length = 0;

    if (this.controller) {
      this.controller.dispose();
      this.controller = null;
    }

    const containerEl = this.containerRef()?.nativeElement;
    if (containerEl) {
      if (this.boundOnMouse) containerEl.removeEventListener('mousemove', this.boundOnMouse);
      if (this.boundOnClick) containerEl.removeEventListener('click', this.boundOnClick);
    }
    if (this.boundOnScroll) window.removeEventListener('scroll', this.boundOnScroll);
    if (this.boundOnVisibility) document.removeEventListener('visibilitychange', this.boundOnVisibility);

    if (this.intersectionObs) {
      this.intersectionObs.disconnect();
      this.intersectionObs = null;
    }
  }
}

