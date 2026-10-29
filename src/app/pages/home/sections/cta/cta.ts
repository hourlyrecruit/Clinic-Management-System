import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CLINIC } from '../../../../core/clinic-data';
import { RevealDirective } from '../../../../core/reveal.directive';
import { Icon } from '../../../../shared/icon';

@Component({
  selector: 'app-cta-section',
  imports: [RouterLink, Icon, RevealDirective],
  templateUrl: './cta.html',
  styleUrl: './cta.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CtaSection {
  readonly requestConsultation = output<void>();
  protected readonly clinic = CLINIC;
}
