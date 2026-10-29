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
}
