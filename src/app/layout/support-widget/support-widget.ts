import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ElementRef } from '@angular/core';
import { CLINIC, HOURS, QUICK_TOPICS } from '../../core/clinic-data';
import { ClinicStore } from '../../core/clinic-store';
import { SupportService } from '../../core/support.service';
import { ChatMessage } from '../../core/models';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-support-widget',
  imports: [Icon],
  templateUrl: './support-widget.html',
  styleUrl: './support-widget.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportWidget {
  protected readonly clinic = CLINIC;
  protected readonly hours = HOURS;
  protected readonly quickTopics = QUICK_TOPICS;
  protected readonly support = inject(SupportService);
  private readonly store = inject(ClinicStore);

  private readonly chatInput = viewChild<ElementRef<HTMLTextAreaElement>>('chatInput');
  private replyTimer?: ReturnType<typeof setTimeout>;

  protected readonly draft = signal('');
  protected readonly typing = signal(false);
  protected readonly messages = signal<ChatMessage[]>([
    {
      id: 'welcome',
      from: 'team',
      text: "Hi, you've reached the Lumina care team. Ask us about booking, insurance or a dental concern — a real coordinator picks these up too.",
    },
  ]);

  constructor() {
    effect(() => {
      if (this.support.isOpen()) {
        const preset = this.support.presetTopic();
        setTimeout(() => this.chatInput()?.nativeElement.focus(), 60);
        if (preset) {
          this.support.presetTopic.set(null);
          this.send(preset);
        }
      }
    });
  }

  protected close(): void {
    this.support.close();
  }

  protected updateDraft(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.send();
  }

  protected send(preset?: string): void {
    const text = (preset ?? this.draft()).trim();
    if (!text) {
      return;
    }

    this.messages.update((current) => [
      ...current,
      { id: `patient-${Date.now()}`, from: 'patient', text },
    ]);
    this.draft.set('');
    this.store.addMessage({
      name: 'Website visitor',
      contact: 'Care chat · website',
      topic: 'Care chat',
      message: text,
      source: 'chat',
    });

    this.typing.set(true);
    if (this.replyTimer) {
      clearTimeout(this.replyTimer);
    }
    this.replyTimer = setTimeout(() => {
      this.typing.set(false);
      this.messages.update((current) => [
        ...current,
        { id: `team-${Date.now()}`, from: 'team', text: this.replyFor(text) },
      ]);
    }, 850);
  }

  private replyFor(text: string): string {
    const query = text.toLowerCase();

    if (query.includes('emergency') || query.includes('pain') || query.includes('urgent')) {
      return `For severe pain, swelling or a broken tooth, please call our emergency line on ${CLINIC.emergencyPhoneDisplay} before 4:00 PM. We keep same-day slots open. If it is after hours, your insurer's nurse line or urgent care can help.`;
    }

    if (query.includes('hour') || query.includes('open') || query.includes('close')) {
      return `We are open ${HOURS[0].day} ${HOURS[0].time}, ${HOURS[1].day} ${HOURS[1].time} and ${HOURS[2].day} ${HOURS[2].time}. Closed Sundays. We are at ${CLINIC.addressLine1}, ${CLINIC.addressLine2}.`;
    }

    if (
      query.includes('insurance') ||
      query.includes('price') ||
      query.includes('cost') ||
      query.includes('cover') ||
      query.includes('pay')
    ) {
      return `We are in-network with Delta Dental, Cigna, Aetna and MetLife and submit claims for most other plans. Send a photo of your insurance card here and a coordinator will confirm your cover before you book — no surprises.`;
    }

    if (
      query.includes('book') ||
      query.includes('appointment') ||
      query.includes('available') ||
      query.includes('slot')
    ) {
      return 'You can book in about a minute: choose a treatment, pick a clinician and a time, and we will confirm by email. Head to the booking page from the button in the top right — or tell me what you need and I will flag it for the front desk.';
    }

    if (query.includes('anxious') || query.includes('nervous') || query.includes('scared')) {
      return 'That is completely understandable, and you are in good company. Tell us what worries you and we will pace the visit around it — numbing gel, headphones, breaks, or just a conversation first. No treatment happens without your say-so.';
    }

    return `Thanks — I have passed that to the front desk and a coordinator will follow up within one working day. If it is urgent, call ${CLINIC.phoneDisplay} and we will help straight away.`;
  }
}
