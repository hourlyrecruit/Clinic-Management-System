import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CLINIC, DENTISTS } from '../../../../core/clinic-data';
import { ClinicStore } from '../../../../core/clinic-store';
import { addDays, formatTime, relativeDay, todayIso } from '../../../../core/date.utils';
import { RevealDirective } from '../../../../core/reveal.directive';
import { Icon } from '../../../../shared/icon';

interface Opening {
  readonly day: string;
  readonly time: string;
}

@Component({
  selector: 'app-hero-section',
  imports: [RouterLink, Icon, RevealDirective],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSection {
  readonly requestConsultation = output<void>();

  protected readonly clinic = CLINIC;
  protected readonly dentists = DENTISTS;

  private readonly store = inject(ClinicStore);

  protected readonly nextOpening = computed<Opening>(() => {
    const today = todayIso();
    for (let offset = 0; offset < 14; offset++) {
      const date = addDays(today, offset);
      for (const dentist of DENTISTS) {
        const slot = this.store
          .availableSlots(dentist.id, date, 'preventive')
          .find((item) => item.available);
        if (slot) {
          return { day: relativeDay(date), time: formatTime(slot.startTime) };
        }
      }
    }
    return { day: 'This week', time: 'Call us' };
  });
}
