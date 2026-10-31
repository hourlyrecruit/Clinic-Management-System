import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HOME_SERVICE_IDS, serviceById } from '../../../../core/clinic-data';
import { ParallaxDirective } from '../../../../core/parallax.directive';
import { RevealDirective } from '../../../../core/reveal.directive';
import { Service } from '../../../../core/models';
import { SupportService } from '../../../../core/support.service';
import { TiltDirective } from '../../../../core/tilt.directive';
import { Icon } from '../../../../shared/icon';

@Component({
  selector: 'app-services-section',
  imports: [RouterLink, Icon, RevealDirective, TiltDirective, ParallaxDirective],
  templateUrl: './services.html',
  styleUrl: './services.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesSection {
  protected readonly services: readonly Service[] = HOME_SERVICE_IDS.map((id) =>
    serviceById(id),
  ).filter((service): service is Service => service !== undefined);

  protected readonly support = inject(SupportService);
}
