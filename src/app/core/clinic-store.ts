import { Injectable, computed, effect, signal } from '@angular/core';
import { DENTISTS } from './clinic-data';
import { addDays, todayIso } from './date.utils';
import {
  Appointment,
  AppointmentStatus,
  BookingInput,
  ClinicMessage,
  MessageSource,
  MessageStatus,
} from './models';

interface PersistedClinic {
  appointments: Appointment[];
  messages: ClinicMessage[];
}

const STORAGE_KEY = 'lumina-clinic-v1';

@Injectable({ providedIn: 'root' })
export class ClinicStore {
  readonly appointments = signal<Appointment[]>([]);
  readonly messages = signal<ClinicMessage[]>([]);

  readonly openMessages = computed(() =>
    this.messages().filter((message) => message.status === 'open'),
  );
  readonly pendingAppointments = computed(() =>
    this.appointments().filter((appointment) => appointment.status === 'pending'),
  );

  constructor() {
    this.hydrate();
    effect(() => {
      const payload: PersistedClinic = {
        appointments: this.appointments(),
        messages: this.messages(),
      };
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        }
      } catch {
        // Storage can be unavailable (private mode / quota). The app still works in memory.
      }
    });
  }

  book(input: BookingInput): Appointment {
    const assignedDentistId =
      input.dentistId === 'any'
        ? (this.findAvailableDentist(input.date, input.time) ?? DENTISTS[0].id)
        : input.dentistId;

    const appointment: Appointment = {
      id: `apt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      reference: this.nextReference(),
      patientName: input.patientName.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      serviceId: input.serviceId,
      dentistId: assignedDentistId,
      date: input.date,
      time: input.time,
      notes: input.notes.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.appointments.update((current) => [...current, appointment]);
    return appointment;
  }

  updateStatus(id: string, status: AppointmentStatus): void {
    this.appointments.update((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...appointment, status } : appointment,
      ),
    );
  }

  addMessage(
    input: Omit<ClinicMessage, 'id' | 'createdAt' | 'status'> & { status?: MessageStatus },
  ): ClinicMessage {
    const message: ClinicMessage = {
      ...input,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      status: input.status ?? 'open',
    };
    this.messages.update((current) => [message, ...current]);
    return message;
  }

  resolveMessage(id: string): void {
    this.messages.update((current) =>
      current.map((message) => (message.id === id ? { ...message, status: 'resolved' } : message)),
    );
  }

  isSlotTaken(dentistId: string, date: string, time: string): boolean {
    return this.appointments().some(
      (appointment) =>
        appointment.dentistId === dentistId &&
        appointment.date === date &&
        appointment.time === time &&
        appointment.status !== 'cancelled',
    );
  }

  /** A slot is open for "first available" when at least one clinician is free. */
  hasOpenSlot(date: string, time: string): boolean {
    return DENTISTS.some((dentist) => !this.isSlotTaken(dentist.id, date, time));
  }

  isDentistFree(dentistId: string, date: string, time: string): boolean {
    return !this.isSlotTaken(dentistId, date, time);
  }

  findAvailableDentist(date: string, time: string): string | undefined {
    return DENTISTS.find((dentist) => this.isDentistFree(dentist.id, date, time))?.id;
  }

  resetDemoData(): void {
    const seed = createSeedData();
    this.appointments.set(seed.appointments);
    this.messages.set(seed.messages);
  }

  private nextReference(): string {
    let reference = '';
    do {
      reference = `LD-${Math.floor(10000 + Math.random() * 89999)}`;
    } while (this.appointments().some((appointment) => appointment.reference === reference));
    return reference;
  }

  private hydrate(): void {
    const stored = this.readStorage();
    if (stored) {
      this.appointments.set(stored.appointments);
      this.messages.set(stored.messages);
      return;
    }
    const seed = createSeedData();
    this.appointments.set(seed.appointments);
    this.messages.set(seed.messages);
  }

  private readStorage(): PersistedClinic | null {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<PersistedClinic>;
      if (!Array.isArray(parsed.appointments) || !Array.isArray(parsed.messages)) {
        return null;
      }
      return {
        appointments: parsed.appointments as Appointment[],
        messages: parsed.messages as ClinicMessage[],
      };
    } catch {
      return null;
    }
  }
}

function createSeedData(): PersistedClinic {
  const today = todayIso();
  const tomorrow = addDays(today, 1);
  const todayAt = (time: string) => time;

  const appointments: Appointment[] = [
    seedAppointment({
      name: 'Ava Thompson',
      email: 'ava.thompson@example.com',
      phone: '(503) 555-0118',
      serviceId: 'preventive',
      dentistId: 'maya',
      date: today,
      time: todayAt('09:00'),
      status: 'completed',
      notes: 'Sensitive lower left molar.',
      reference: 'LD-10482',
    }),
    seedAppointment({
      name: 'Noah Patel',
      email: 'noah.patel@example.com',
      phone: '(503) 555-0173',
      serviceId: 'aligners',
      dentistId: 'ada',
      date: today,
      time: todayAt('10:30'),
      status: 'confirmed',
      notes: 'Second aligner consultation — bring scan.',
      reference: 'LD-10517',
    }),
    seedAppointment({
      name: 'Grace Kim',
      email: 'grace.kim@example.com',
      phone: '(503) 555-0140',
      serviceId: 'preventive',
      dentistId: 'daniel',
      date: today,
      time: todayAt('13:00'),
      status: 'pending',
      notes: 'Chipped front tooth, would like same-day repair.',
      reference: 'LD-10533',
    }),
    seedAppointment({
      name: 'Liam Rivera',
      email: 'liam.rivera@example.com',
      phone: '(503) 555-0126',
      serviceId: 'whitening',
      dentistId: 'ada',
      date: today,
      time: todayAt('15:30'),
      status: 'confirmed',
      notes: '',
      reference: 'LD-10541',
    }),
    seedAppointment({
      name: 'Sofia Alvarez',
      email: 'sofia.alvarez@example.com',
      phone: '(503) 555-0155',
      serviceId: 'children',
      dentistId: 'daniel',
      date: tomorrow,
      time: '09:30',
      status: 'confirmed',
      notes: 'First visit for age 4. Nervous — extra time please.',
      reference: 'LD-10552',
    }),
    seedAppointment({
      name: 'Ethan Brooks',
      email: 'ethan.brooks@example.com',
      phone: '(503) 555-0164',
      serviceId: 'implants',
      dentistId: 'ada',
      date: tomorrow,
      time: '11:00',
      status: 'pending',
      notes: 'Missing upper right premolar.',
      reference: 'LD-10566',
    }),
    seedAppointment({
      name: 'Mia Chen',
      email: 'mia.chen@example.com',
      phone: '(503) 555-0112',
      serviceId: 'veneers',
      dentistId: 'ada',
      date: addDays(today, 4),
      time: '14:00',
      status: 'pending',
      notes: 'Interested in a digital smile preview.',
      reference: 'LD-10571',
    }),
    seedAppointment({
      name: 'Olivia Grant',
      email: 'olivia.grant@example.com',
      phone: '(503) 555-0189',
      serviceId: 'aligners',
      dentistId: 'maya',
      date: addDays(today, 5),
      time: '10:00',
      status: 'confirmed',
      notes: 'Aligner progress check.',
      reference: 'LD-10584',
    }),
    seedAppointment({
      name: 'Jonah Weber',
      email: 'jonah.weber@example.com',
      phone: '(503) 555-0191',
      serviceId: 'preventive',
      dentistId: 'daniel',
      date: addDays(today, 2),
      time: '11:30',
      status: 'cancelled',
      notes: 'Rescheduling after half-term.',
      reference: 'LD-10529',
    }),
  ];

  const messages: ClinicMessage[] = [
    {
      id: 'msg-seed-1',
      name: 'Nadia Flores',
      contact: 'nadia.flores@example.com',
      topic: 'Clear aligners',
      message:
        'I am interested in clear aligners but had braces as a teenager and my bite has shifted back. Is a free consultation suitable for a second opinion?',
      source: 'consultation',
      createdAt: new Date(Date.now() - 1000 * 60 * 52).toISOString(),
      status: 'open',
    },
    {
      id: 'msg-seed-2',
      name: 'Tom Whitaker',
      contact: '(503) 555-0107',
      topic: 'Insurance & pricing',
      message:
        'I have Delta Dental PPO and need a crown replaced. Could someone confirm what is usually covered before I book?',
      source: 'chat',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      status: 'open',
    },
    {
      id: 'msg-seed-3',
      name: 'Harriet Moss',
      contact: 'harriet.moss@example.com',
      topic: 'Nervous patients',
      message:
        'I have not been to a dentist in a very long time and I am quite anxious. Is there anything you can suggest before my first appointment?',
      source: 'form',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      status: 'resolved',
    },
  ];

  return { appointments, messages };
}

interface SeedAppointment {
  name: string;
  email: string;
  phone: string;
  serviceId: string;
  dentistId: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes: string;
  reference: string;
}

function seedAppointment(input: SeedAppointment): Appointment {
  return {
    id: `seed-${input.reference.toLowerCase()}`,
    reference: input.reference,
    patientName: input.name,
    email: input.email,
    phone: input.phone,
    serviceId: input.serviceId,
    dentistId: input.dentistId,
    date: input.date,
    time: input.time,
    notes: input.notes,
    status: input.status,
    createdAt: new Date().toISOString(),
  };
}

export function messageSourceLabel(source: MessageSource): string {
  switch (source) {
    case 'consultation':
      return 'Consultation request';
    case 'chat':
      return 'Care chat';
    default:
      return 'Contact form';
  }
}
