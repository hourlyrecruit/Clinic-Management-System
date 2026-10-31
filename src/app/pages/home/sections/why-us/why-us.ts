import { ChangeDetectionStrategy, Component } from '@angular/core';
import { REASONS } from '../../../../core/clinic-data';
import { ParallaxDirective } from '../../../../core/parallax.directive';
import { RevealDirective } from '../../../../core/reveal.directive';
import { TiltDirective } from '../../../../core/tilt.directive';
import { Icon } from '../../../../shared/icon';

@Component({
  selector: 'app-why-us-section',
  imports: [Icon, RevealDirective, TiltDirective, ParallaxDirective],
  templateUrl: './why-us.html',
  styleUrl: './why-us.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhyUsSection {
  protected readonly reasons = REASONS;
}
