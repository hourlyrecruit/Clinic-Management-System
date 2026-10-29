import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SupportService {
  readonly isOpen = signal(false);
  readonly presetTopic = signal<string | null>(null);

  open(topic?: string): void {
    this.presetTopic.set(topic ?? null);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    this.isOpen.update((open) => !open);
  }
}
