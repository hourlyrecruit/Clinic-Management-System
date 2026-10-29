import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { CLINIC } from '../../../../core/clinic-data';
import { RevealDirective } from '../../../../core/reveal.directive';
import { Icon } from '../../../../shared/icon';

@Component({
  selector: 'app-consultation-section',
  imports: [Icon, RevealDirective],
  templateUrl: './consultation.html',
  styleUrl: './consultation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultationSection {
  readonly requestConsultation = output<void>();
  protected readonly clinic = CLINIC;
}
