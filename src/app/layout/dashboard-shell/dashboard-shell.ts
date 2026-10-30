import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { formatDateLong, todayIso } from '../../core/date.utils';
import { DemoDataService } from '../../core/demo-data.service';
import { IconName } from '../../core/models';
import { Icon } from '../../shared/icon';

interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: IconName;
}

@Component({
  selector: 'app-dashboard-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './dashboard-shell.html',
  styleUrl: './dashboard-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardShell {
  protected readonly auth = inject(AuthService);
  private readonly demo = inject(DemoDataService);
  private readonly router = inject(Router);
  private readonly resetDialog = viewChild<ElementRef<HTMLDialogElement>>('resetDialog');

  protected readonly user = this.auth.currentUser;
  protected readonly roleLabel = computed(() => this.auth.roleLabel(this.user()?.role));
  protected readonly todayLabel = formatDateLong(todayIso());
  protected readonly menuOpen = signal(false);
  protected readonly resetting = signal(false);

  protected readonly initials = computed(() => {
    const name = this.user()?.name ?? '';
    return name
      .split(/\s+/)
      .filter((part) => part.length > 0)
      .slice(0, 2)
      .map((part) => part.replace('.', '').charAt(0).toUpperCase())
      .join('');
  });

  protected readonly nav = computed<NavItem[]>(() => {
    switch (this.user()?.role) {
      case 'PATIENT':
        return [
          { label: 'Overview', path: '/patient/dashboard', icon: 'dashboard' },
          { label: 'My appointments', path: '/patient/appointments', icon: 'calendar' },
          { label: 'Book a visit', path: '/patient/book-appointment', icon: 'plus' },
        ];
      case 'RECEPTIONIST':
        return [
          { label: 'Overview', path: '/receptionist/dashboard', icon: 'dashboard' },
          { label: 'Appointments', path: '/receptionist/appointments', icon: 'calendar' },
          { label: 'Book for a patient', path: '/receptionist/book-appointment', icon: 'plus' },
          { label: 'Patients', path: '/receptionist/patients', icon: 'users' },
        ];
      case 'DOCTOR':
        return [
          { label: 'Overview', path: '/doctor/dashboard', icon: 'dashboard' },
          { label: 'My schedule', path: '/doctor/appointments', icon: 'calendar' },
        ];
      default:
        return [];
    }
  });

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected signOut(): void {
    this.auth.signOut();
    void this.router.navigate(['/signin']);
  }

  protected openReset(): void {
    this.resetDialog()?.nativeElement.showModal();
  }

  protected closeReset(event?: Event): void {
    event?.preventDefault();
    this.resetDialog()?.nativeElement.close();
  }

  protected async confirmReset(): Promise<void> {
    this.resetting.set(true);
    try {
      await this.demo.resetAll();
      this.closeReset();
      await this.router.navigate(['/signin'], { queryParams: { reset: '1' } });
    } finally {
      this.resetting.set(false);
    }
  }
}
