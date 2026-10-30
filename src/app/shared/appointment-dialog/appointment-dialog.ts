import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { dentistById, serviceById } from '../../core/clinic-data';
import { formatDateLong, formatTime, formatTimestamp } from '../../core/date.utils';
import { Appointment } from '../../core/models';
import { Icon } from '../icon';
import { StatusBadge } from '../status-badge';

@Component({
  selector: 'app-appointment-dialog',
  imports: [Icon, StatusBadge],
  templateUrl: './appointment-dialog.html',
  styleUrl: './appointment-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentDialog {
  readonly appointment = input<Appointment | null>(null);
  readonly open = input(false);
  readonly closed = output<void>();

  private readonly auth = inject(AuthService);
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      const isOpen = this.open();
      if (!dialog) {
        return;
      }
      if (isOpen && this.appointment() && !dialog.open) {
        dialog.showModal();
      } else if (!isOpen && dialog.open) {
        dialog.close();
      }
    });
  }

  protected serviceName(id: string): string {
    return serviceById(id)?.name ?? 'Consultation';
  }

  protected doctorName(id: string): string {
    return dentistById(id)?.name ?? 'Care team';
  }

  protected dateLabel(date: string): string {
    return formatDateLong(date);
  }

  protected time(value: string): string {
    return formatTime(value);
  }

  protected timestamp(value: string): string {
    return formatTimestamp(value);
  }

  protected creator(id: string): string {
    const user = this.auth.users().find((item) => item.id === id);
    return user ? `${user.name} (${this.auth.roleLabel(user.role)})` : 'Demo record';
  }

  protected close(event?: Event): void {
    event?.preventDefault();
    this.dialogRef()?.nativeElement.close();
    this.closed.emit();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === this.dialogRef()?.nativeElement) {
      this.close();
    }
  }
}
