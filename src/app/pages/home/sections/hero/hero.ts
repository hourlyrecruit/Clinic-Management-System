import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CLINIC, DENTISTS, TIME_SLOTS } from '../../../../core/clinic-data';
import { ClinicStore } from '../../../../core/clinic-store';
import {
  addDays,
  formatTime,
  isClosed,
  isPastSlot,
  relativeDay,
  slotsForDate,
  todayIso,
} from '../../../../core/date.utils';
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
      if (isClosed(date)) {
        continue;
      }
      for (const slot of slotsForDate(date, TIME_SLOTS)) {
        if (isPastSlot(date, slot)) {
          continue;
        }
        if (this.store.hasOpenSlot(date, slot)) {
          return { day: relativeDay(date), time: formatTime(slot) };
        }
      }
    }
    return { day: 'This week', time: 'Call us' };
  });
}
