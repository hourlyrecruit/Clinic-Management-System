import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SERVICES } from '../../../../core/clinic-data';
import { RevealDirective } from '../../../../core/reveal.directive';
import { SupportService } from '../../../../core/support.service';
import { Icon } from '../../../../shared/icon';

@Component({
  selector: 'app-services-section',
  imports: [RouterLink, Icon, RevealDirective],
  templateUrl: './services.html',
  styleUrl: './services.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesSection {
  protected readonly services = SERVICES;
  protected readonly support = inject(SupportService);

  private readonly tiltEnabled = this.canTilt();

  /** Subtle pointer-tracked 3D tilt — pointer devices with motion enabled only. */
  protected tilt(event: PointerEvent): void {
    if (!this.tiltEnabled) return;
    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    card.style.setProperty('--ry', `${(x - 0.5) * 7}deg`);
    card.style.setProperty('--rx', `${(0.5 - y) * 6}deg`);
    card.style.setProperty('--mx', `${x * 100}%`);
    card.style.setProperty('--my', `${y * 100}%`);
  }

  protected resetTilt(event: PointerEvent): void {
    const card = event.currentTarget as HTMLElement;
    card.style.setProperty('--ry', '0deg');
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--mx', '50%');
    card.style.setProperty('--my', '0%');
  }

  private canTilt(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return (
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
