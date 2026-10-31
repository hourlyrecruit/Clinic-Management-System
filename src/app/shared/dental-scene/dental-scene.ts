import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { prefersReducedMotion } from '../../core/motion';
import { Icon } from '../icon';
import type { DentalSceneEngine } from './dental-scene.engine';

function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Decorative 3D dental scene. Three.js is loaded on demand (its own lazy chunk), so it never
 * blocks first paint. When WebGL is unavailable, or the scene fails to start, an illustrated CSS
 * fallback is shown instead. The scene is hidden from assistive technology.
 */
@Component({
  selector: 'app-dental-scene',
  imports: [Icon],
  template: `
    <div class="dental-scene" aria-hidden="true">
      <div class="dental-scene__fallback" [class.is-visible]="!ready()">
        <app-icon name="tooth" [size]="220" />
      </div>
      <div #canvasHost class="dental-scene__host" [class.is-ready]="ready()"></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 0;
    }

    .dental-scene {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .dental-scene__host {
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 0.9s ease;
    }

    .dental-scene__host.is-ready {
      opacity: 1;
    }

    .dental-scene__fallback {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: #7fe7ee;
      opacity: 0;
      transition: opacity 0.4s ease;
      filter: drop-shadow(0 30px 40px rgba(7, 90, 98, 0.35));
    }

    .dental-scene__fallback.is-visible {
      opacity: 0.85;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DentalScene {
  protected readonly ready = signal(false);

  private readonly canvasHost = viewChild.required<ElementRef<HTMLElement>>('canvasHost');
  private engine: DentalSceneEngine | null = null;
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.engine?.dispose();
      this.engine = null;
    });

    afterNextRender(() => {
      void this.start();
    });
  }

  private async start(): Promise<void> {
    if (!supportsWebGl()) {
      return;
    }
    try {
      const { DentalSceneEngine } = await import('./dental-scene.engine');
      if (this.destroyed) {
        return;
      }
      this.engine = new DentalSceneEngine(this.canvasHost().nativeElement, {
        reducedMotion: prefersReducedMotion(),
      });
      this.ready.set(true);
    } catch (error) {
      console.warn('3D scene unavailable, using the illustrated fallback.', error);
    }
  }
}
