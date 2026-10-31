import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CLINIC } from '../../../../core/clinic-data';
import { CountUpDirective } from '../../../../core/count-up.directive';
import { ParallaxDirective } from '../../../../core/parallax.directive';
import { RevealDirective } from '../../../../core/reveal.directive';
import { TiltDirective } from '../../../../core/tilt.directive';
import { IconName } from '../../../../core/models';
import { Icon } from '../../../../shared/icon';

interface Pillar {
  readonly icon: IconName;
  readonly title: string;
  readonly text: string;
}

interface Stat {
  readonly value: number;
  readonly label: string;
  readonly suffix?: string;
  readonly decimals?: number;
}

@Component({
  selector: 'app-about-section',
  imports: [RouterLink, Icon, RevealDirective, ParallaxDirective, TiltDirective, CountUpDirective],
  templateUrl: './about.html',
  styleUrl: './about.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutSection {
  readonly requestConsultation = output<void>();

  protected readonly clinic = CLINIC;

  protected readonly pillars: readonly Pillar[] = [
    {
      icon: 'shield',
      title: 'Prevention first',
      text: 'Thorough exams and honest advice, so small problems never become big ones.',
    },
    {
      icon: 'heart',
      title: 'Gentle by design',
      text: 'Longer appointments, calm rooms and a team that never rushes or pressures.',
    },
    {
      icon: 'users',
      title: 'Care for every age',
      text: 'From first teeth to full smile makeovers, all under one welcoming roof.',
    },
  ];

  protected readonly stats: readonly Stat[] = [
    { value: 1200, suffix: '+', label: 'Patients cared for' },
    { value: 4.9, decimals: 1, label: 'Average rating' },
    { value: 3, label: 'Specialist dentists' },
    { value: new Date().getFullYear() - CLINIC.established, suffix: '+', label: 'Years of care' },
  ];

  protected readonly amenities = [
    'Step-free access',
    'Free on-site parking',
    'Ceiling screens',
    'Noise-cancelling headphones',
    'Early & evening slots',
    'Kid-friendly',
  ] as const;
}
