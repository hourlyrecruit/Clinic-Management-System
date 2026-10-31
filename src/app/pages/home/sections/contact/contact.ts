import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CLINIC, HOURS } from '../../../../core/clinic-data';
import { RevealDirective } from '../../../../core/reveal.directive';
import { TiltDirective } from '../../../../core/tilt.directive';
import { Icon } from '../../../../shared/icon';

@Component({
  selector: 'app-contact-section',
  imports: [Icon, RevealDirective, TiltDirective],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactSection {
  protected readonly clinic = CLINIC;
  protected readonly hours = HOURS;
  protected readonly mapLoaded = signal(false);

  private readonly sanitizer = inject(DomSanitizer);

  /** The URL is a trusted constant from clinic-data.ts, never user input. */
  protected readonly mapSrc = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(CLINIC.mapsEmbedUrl),
  );

  protected loadMap(): void {
    this.mapLoaded.set(true);
  }
}
