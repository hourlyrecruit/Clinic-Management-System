import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CLINIC, FAQS } from '../../../../core/clinic-data';
import { RevealDirective } from '../../../../core/reveal.directive';
import { SupportService } from '../../../../core/support.service';
import { Icon } from '../../../../shared/icon';

@Component({
  selector: 'app-faq-section',
  imports: [Icon, RevealDirective],
  templateUrl: './faq.html',
  styleUrl: './faq.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqSection {
  protected readonly clinic = CLINIC;
  protected readonly faqs = FAQS;
  protected readonly support = inject(SupportService);
  protected readonly openIndex = signal<number | null>(0);

  protected toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? null : index));
  }
}
