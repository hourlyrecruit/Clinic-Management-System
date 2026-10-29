import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CLINIC, HOURS } from '../../../../core/clinic-data';
import { RevealDirective } from '../../../../core/reveal.directive';
import { Icon } from '../../../../shared/icon';

@Component({
  selector: 'app-clinic-section',
  imports: [Icon, RevealDirective],
  templateUrl: './clinic.html',
  styleUrl: './clinic.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClinicSection {
  protected readonly clinic = CLINIC;
  protected readonly hours = HOURS;
  protected readonly amenities = [
    'Step-free access',
    'Free on-site parking',
    'Ceiling screens',
    'Noise-cancelling headphones',
    'Early & evening slots',
    'Kid-friendly',
  ] as const;
}
