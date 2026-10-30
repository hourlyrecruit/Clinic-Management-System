import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { STATUS_LABELS, statusTone } from '../core/appointment-status';
import { AppointmentStatus } from '../core/models';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'db-badge ' + tone()">{{ label() }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<AppointmentStatus>();
  readonly short = input(false);

  protected readonly label = computed(() =>
    this.short() ? STATUS_LABELS[this.status()].split(' ')[0] : STATUS_LABELS[this.status()],
  );
  protected readonly tone = computed(() => statusTone(this.status()));
}
