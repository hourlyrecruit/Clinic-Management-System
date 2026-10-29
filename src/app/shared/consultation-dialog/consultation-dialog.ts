import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClinicStore } from '../../core/clinic-store';
import { Icon } from '../icon';

@Component({
  selector: 'app-consultation-dialog',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './consultation-dialog.html',
  styleUrl: './consultation-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultationDialog {
  readonly open = input(false);
  readonly closed = output<void>();

  private readonly store = inject(ClinicStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly submitted = signal(false);
  protected readonly topics = [
    'Treatment options',
    'Nervous patient support',
    'Costs & insurance',
    'Second opinion',
    'Something else',
  ] as const;

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    topic: ['Treatment options', [Validators.required]],
    message: [''],
  });

  constructor() {
    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) {
        return;
      }
      if (this.open() && !dialog.open) {
        this.submitted.set(false);
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const contact = value.phone ? `${value.email} · ${value.phone}` : value.email;

    this.store.addMessage({
      name: value.name.trim(),
      contact,
      topic: value.topic,
      message:
        value.message.trim() || 'Requested a free 15-minute consultation. No preferred time given.',
      source: 'consultation',
    });

    this.submitted.set(true);
  }

  protected close(): void {
    this.closed.emit();
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === this.dialogRef()?.nativeElement) {
      this.close();
    }
  }

  protected finish(): void {
    this.form.reset({ topic: 'Treatment options' });
    this.close();
  }
}
