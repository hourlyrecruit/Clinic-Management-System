import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconName } from '../core/models';

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @switch (name()) {
        @case ('tooth') {
          <path
            d="M12 5.4C10.3 4 8.6 3.4 7 4c-2.3.9-3 3.2-2.6 5.5.4 2.3 1.5 3.4 1.9 5.8.3 1.9.5 4.1 1.7 4.7 1 .5 1.6-.6 1.9-1.9.3-1.3.4-3.4 2.1-3.4s1.8 2.1 2.1 3.4c.3 1.3.9 2.4 1.9 1.9 1.2-.6 1.4-2.8 1.7-4.7.4-2.4 1.5-3.5 1.9-5.8.4-2.3-.3-4.6-2.6-5.5-1.6-.6-3.3 0-5 1.4Z"
          />
        }
        @case ('sparkles') {
          <path d="M11 3.5 12.7 8l4.5 1.7-4.5 1.7L11 15.9 9.3 11.4 4.8 9.7l4.5-1.7L11 3.5Z" />
          <path d="m18 14 .9 2.2 2.1.8-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.8.9-2.2Z" />
        }
        @case ('shield') {
          <path d="M12 21s7-3.2 7-9V6l-7-3-7 3v6c0 5.8 7 9 7 9Z" />
          <path d="m9 11.5 2 2 4-4" />
        }
        @case ('align') {
          <path d="M4 10.5c0 4.7 3.6 8 8 8s8-3.3 8-8" />
          <path d="M7.5 6.5v3M12 5.5v4M16.5 6.5v3" />
          <path d="M4 10.5c1.8 1.4 4.6 2.2 8 2.2s6.2-.8 8-2.2" />
        }
        @case ('implant') {
          <path d="M8 3h8l-.8 4H8.8L8 3Z" />
          <path d="M9.2 7h5.6M9.6 10h4.8M10 13h4M10.4 16h3.2M11 19h2M12 19v2" />
        }
        @case ('smile') {
          <circle cx="12" cy="12" r="9" />
          <path d="M8 14s1.5 2.2 4 2.2 4-2.2 4-2.2" />
          <path d="M9 9.2h.01M15 9.2h.01" />
        }
        @case ('star') {
          <path
            d="m12 2.8 2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36l-5.7 3-1.09-6.35-4.62-4.5 6.38-.93L12 2.8Z"
            fill="currentColor"
            stroke="none"
          />
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5.2l3.2 2" />
        }
        @case ('calendar') {
          <rect x="3.5" y="5" width="17" height="16" rx="3" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
        }
        @case ('phone') {
          <path
            d="M6.6 3.5h2.8l1.4 3.8-1.9 1.4a12.5 12.5 0 0 0 6.4 6.4l1.4-1.9 3.8 1.4v2.8a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z"
          />
        }
        @case ('pin') {
          <path d="M12 21.5S19 15.8 19 10.4a7 7 0 1 0-14 0c0 5.4 7 11.1 7 11.1Z" />
          <circle cx="12" cy="10.2" r="2.6" />
        }
        @case ('arrow-right') {
          <path d="M4.5 12h15M13.5 6l6 6-6 6" />
        }
        @case ('arrow-up-right') {
          <path d="M7 17 17 7M8 7h9v9" />
        }
        @case ('chat') {
          <path
            d="M20.5 11.8a8.2 8.2 0 0 1-8.2 8.2H7.4L3.5 22.5v-10.7a8.2 8.2 0 0 1 8.2-8.2h.6a8.2 8.2 0 0 1 8.2 8.2Z"
          />
          <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
        }
        @case ('close') {
          <path d="m6 6 12 12M18 6 6 18" />
        }
        @case ('menu') {
          <path d="M4 7h16M4 12h16M4 17h16" />
        }
        @case ('check') {
          <path d="m5 12.5 4.5 4.5L19 6.5" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        }
        @case ('chevron-down') {
          <path d="m6 9.5 6 6 6-6" />
        }
        @case ('user') {
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        }
        @case ('mail') {
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="m3.8 7.5 8.2 5.6 8.2-5.6" />
        }
        @case ('inbox') {
          <path d="M4 13.5h4l1.5 2.5h5l1.5-2.5h4" />
          <path d="M4 13.5 6.6 5h10.8L20 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4.5Z" />
        }
        @case ('users') {
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.8 20.5a6.2 6.2 0 0 1 12.4 0" />
          <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M17.5 14.3a6.2 6.2 0 0 1 3.7 6.2" />
        }
        @case ('quote') {
          <path
            d="M9.4 6.5C6 7.7 4 10.4 4 14v4.5h6.4V12H6.9c0-1.9 1.2-3.4 3.1-4.1L9.4 6.5Zm10.6 0c-3.4 1.2-5.4 3.9-5.4 7.5v4.5h6.4V12h-3.5c0-1.9 1.2-3.4 3.1-4.1L20 6.5Z"
            fill="currentColor"
            stroke="none"
          />
        }
        @case ('alert') {
          <path d="M12 3.5 21 20H3L12 3.5Z" />
          <path d="M12 9.5v4.2M12 17h.01" />
        }
        @case ('spark') {
          <path
            d="M12 2.5c.6 5 2.4 8.9 9.5 9.5-7.1.6-8.9 4.5-9.5 9.5-.6-5-2.4-8.9-9.5-9.5 7.1-.6 8.9-4.5 9.5-9.5Z"
          />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
}
