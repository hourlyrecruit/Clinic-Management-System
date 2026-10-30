import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { ClinicStore } from './clinic-store';

/**
 * Resets every demonstration record: accounts, sessions, appointments and
 * messages. Nothing here is real clinic data.
 */
@Injectable({ providedIn: 'root' })
export class DemoDataService {
  private readonly auth = inject(AuthService);
  private readonly store = inject(ClinicStore);

  async resetAll(): Promise<void> {
    await this.auth.resetDemoAccounts();
    this.store.resetDemoData();
  }
}
