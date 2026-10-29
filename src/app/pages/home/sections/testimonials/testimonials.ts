import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CLINIC, TESTIMONIALS } from '../../../../core/clinic-data';
import { RevealDirective } from '../../../../core/reveal.directive';
import { Icon } from '../../../../shared/icon';

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

  protected initials(name: string): string {
    return name
      .replace(/\./g, '')
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
