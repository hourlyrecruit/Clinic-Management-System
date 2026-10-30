import { Injectable, computed, effect, signal } from '@angular/core';
import { SEED_PATIENTS } from './auth.data';
import { endTimeFor, isSlotAvailable, nextAvailableDate, slotsForDoctor } from './availability';
import { DENTISTS, scheduleFor, serviceById } from './clinic-data';
import { addDays, todayIso } from './date.utils';
import {
  Appointment,
  AppointmentResult,
  AppointmentStatus,
  ClinicMessage,
  CreateAppointmentInput,
  MessageSource,
  MessageStatus,
  Slot,
} from './models';
import { canTransition } from './appointment-status';

interface PersistedClinic {
  appointments: Appointment[];
  messages: ClinicMessage[];
}

const STORAGE_KEY = 'lumina-clinic-v2';

@Injectable({ providedIn: 'root' })
export class ClinicStore {
  readonly appointments = signal<Appointment[]>([]);
  readonly messages = signal<ClinicMessage[]>([]);

  readonly openMessages = computed(() =>
    this.messages().filter((message) => message.status === 'open'),
  );
  readonly pendingAppointments = computed(() =>
    this.appointments().filter((appointment) => appointment.status === 'PENDING'),
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

  create(input: CreateAppointmentInput): AppointmentResult {
    const service = serviceById(input.serviceId);
    const doctor = DENTISTS.find((dentist) => dentist.id === input.doctorId);

    if (!service || !doctor) {
      return { ok: false, error: 'Choose a treatment and clinician before confirming.' };
    }
    if (!input.appointmentDate) {
      return { ok: false, error: 'Choose an appointment date.' };
    }
    if (!input.startTime) {
      return { ok: false, error: 'Choose an appointment time.' };
    }
    if (input.appointmentDate < todayIso()) {
      return { ok: false, error: 'That date has already passed. Please choose another day.' };
    }
    if (!scheduleFor(doctor.id, input.appointmentDate)) {
      return {
        ok: false,
        error: `${doctor.name} is not in clinic that day. Please pick another date.`,
      };
    }
    if (
      !isSlotAvailable(this.appointments(), {
        doctorId: doctor.id,
        date: input.appointmentDate,
        startTime: input.startTime,
        durationMinutes: service.durationMinutes,
      })
    ) {
      return {
        ok: false,
        error: 'That slot has just been taken. Please pick another time — the list is up to date.',
      };
    }

    const now = new Date().toISOString();
    const appointment: Appointment = {
      id: makeId('apt'),
      reference: this.nextReference(),
      patientId: input.patientId,
      patientName: input.patientName.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      doctorId: doctor.id,
      serviceId: service.id,
      appointmentDate: input.appointmentDate,
      startTime: input.startTime,
      endTime: endTimeFor(service.id, input.startTime),
      reason: input.reason.trim(),
      status: 'PENDING',
      createdByUserId: input.createdByUserId,
      createdByRole: input.createdByRole,
      createdAt: now,
      updatedAt: now,
    };

    this.appointments.update((current) => [...current, appointment]);
    return { ok: true, appointment };
  }

  reschedule(id: string, date: string, startTime: string): AppointmentResult {
    const appointment = this.appointments().find((item) => item.id === id);
    if (!appointment) {
      return { ok: false, error: 'Appointment not found.' };
    }
    if (appointment.status !== 'PENDING' && appointment.status !== 'CONFIRMED') {
      return { ok: false, error: 'Only pending or confirmed appointments can be rescheduled.' };
    }
    const service = serviceById(appointment.serviceId);
    if (!service) {
      return { ok: false, error: 'The treatment for this appointment is unavailable.' };
    }
    if (date < todayIso()) {
      return { ok: false, error: 'Choose a future date.' };
    }
    if (!scheduleFor(appointment.doctorId, date)) {
      return { ok: false, error: 'That clinician is not in clinic on the chosen day.' };
    }
    if (
      !isSlotAvailable(this.appointments(), {
        doctorId: appointment.doctorId,
        date,
        startTime,
        durationMinutes: service.durationMinutes,
        excludeAppointmentId: appointment.id,
      })
    ) {
      return { ok: false, error: 'That slot is unavailable. Please choose another time.' };
    }

    const updated: Appointment = {
      ...appointment,
      appointmentDate: date,
      startTime,
      endTime: endTimeFor(appointment.serviceId, startTime),
      updatedAt: new Date().toISOString(),
    };
    this.appointments.update((current) =>
      current.map((item) => (item.id === id ? updated : item)),
    );
    return { ok: true, appointment: updated };
  }

  updateStatus(id: string, status: AppointmentStatus): AppointmentResult {
    const appointment = this.appointments().find((item) => item.id === id);
    if (!appointment) {
      return { ok: false, error: 'Appointment not found.' };
    }
    if (!canTransition(appointment.status, status)) {
      return {
        ok: false,
        error: `A ${appointment.status.toLowerCase().replace('_', '-')} appointment cannot become ${status
          .toLowerCase()
          .replace('_', '-')}.`,
      };
    }
    const updated: Appointment = {
      ...appointment,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.appointments.update((current) =>
      current.map((item) => (item.id === id ? updated : item)),
    );
    return { ok: true, appointment: updated };
  }

  forPatient(patientId: string): Appointment[] {
    return this.appointments()
      .filter((appointment) => appointment.patientId === patientId)
      .slice()
      .sort(byDateTimeAsc);
  }

  upcomingForPatient(patientId: string): Appointment[] {
    const today = todayIso();
    return this.forPatient(patientId).filter(
      (appointment) =>
        (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') &&
        appointment.appointmentDate >= today,
    );
  }

  historyForPatient(patientId: string): Appointment[] {
    const today = todayIso();
    return this.forPatient(patientId)
      .filter(
        (appointment) =>
          (appointment.status !== 'PENDING' && appointment.status !== 'CONFIRMED') ||
          appointment.appointmentDate < today,
      )
      .sort(byDateTimeDesc);
  }

  forDoctor(doctorId: string): Appointment[] {
    return this.appointments()
      .filter((appointment) => appointment.doctorId === doctorId)
      .slice()
      .sort(byDateTimeAsc);
  }

  forDate(date: string): Appointment[] {
    return this.appointments()
      .filter((appointment) => appointment.appointmentDate === date)
      .slice()
      .sort(byDateTimeAsc);
  }

  availableSlots(
    doctorId: string,
    date: string,
    serviceId: string,
    excludeAppointmentId?: string,
  ): Slot[] {
    return slotsForDoctor(this.appointments(), {
      doctorId,
      date,
      serviceId,
      excludeAppointmentId,
    });
  }

  nextAvailableDate(doctorId: string, serviceId: string): string | undefined {
    return nextAvailableDate(this.appointments(), doctorId, serviceId);
  }

  addMessage(
    input: Omit<ClinicMessage, 'id' | 'createdAt' | 'status'> & { status?: MessageStatus },
  ): ClinicMessage {
    const message: ClinicMessage = {
      ...input,
      id: makeId('msg'),
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
      if (!parsed.appointments.every(isStoredAppointment)) {
        return null;
      }
      return {
        appointments: parsed.appointments,
        messages: parsed.messages as ClinicMessage[],
      };
    } catch {
      return null;
    }
  }
}

function byDateTimeAsc(a: Appointment, b: Appointment): number {
  return `${a.appointmentDate}${a.startTime}`.localeCompare(`${b.appointmentDate}${b.startTime}`);
}

function byDateTimeDesc(a: Appointment, b: Appointment): number {
  return `${b.appointmentDate}${b.startTime}`.localeCompare(`${a.appointmentDate}${a.startTime}`);
}

function isStoredAppointment(value: unknown): value is Appointment {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const appointment = value as Partial<Appointment>;
  return (
    typeof appointment.id === 'string' &&
    typeof appointment.reference === 'string' &&
    typeof appointment.patientId === 'string' &&
    typeof appointment.doctorId === 'string' &&
    typeof appointment.serviceId === 'string' &&
    typeof appointment.appointmentDate === 'string' &&
    typeof appointment.startTime === 'string' &&
    typeof appointment.endTime === 'string' &&
    typeof appointment.status === 'string'
  );
}

export function makeId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

function createSeedData(): PersistedClinic {
  const today = todayIso();
  const appointments: Appointment[] = [];

  const place = (seed: SeedAppointment): void => {
    let date = addDays(today, seed.minOffset);
    for (let attempt = 0; attempt < 21; attempt += 1) {
      const block = scheduleFor(seed.doctorId, date);
      const service = serviceById(seed.serviceId);
      const fitsHours = Boolean(
        block && service && seed.startTime >= block.start &&
          endTimeFor(seed.serviceId, seed.startTime) <= block.end,
      );
      const free = Boolean(
        service &&
          isSlotAvailable(appointments, {
            doctorId: seed.doctorId,
            date,
            startTime: seed.startTime,
            durationMinutes: service.durationMinutes,
          }),
      );
      const valid = fitsHours && (seed.status === 'CANCELLED' ? true : free);
      if (valid) {
        break;
      }
      date = addDays(date, 1);
    }

    const patient = SEED_PATIENTS.find((item) => item.id === seed.patientId);
    if (!patient) {
      return;
    }

    appointments.push({
      id: `seed-${seed.reference.toLowerCase()}`,
      reference: seed.reference,
      patientId: patient.id,
      patientName: patient.name,
      email: patient.email,
      phone: patient.phone,
      doctorId: seed.doctorId,
      serviceId: seed.serviceId,
      appointmentDate: date,
      startTime: seed.startTime,
      endTime: endTimeFor(seed.serviceId, seed.startTime),
      reason: seed.reason,
      status: seed.status,
      createdByUserId: seed.createdByRole === 'PATIENT' ? patient.id : 'staff-reception',
      createdByRole: seed.createdByRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  place({
    patientId: 'p-ava',
    doctorId: 'maya',
    serviceId: 'preventive',
    startTime: '09:00',
    minOffset: 0,
    status: 'COMPLETED',
    reason: 'Sensitive lower left molar.',
    createdByRole: 'PATIENT',
    reference: 'LD-10482',
  });
  place({
    patientId: 'p-noah',
    doctorId: 'ada',
    serviceId: 'aligners',
    startTime: '10:30',
    minOffset: 0,
    status: 'CONFIRMED',
    reason: 'Second aligner consultation — bring scan.',
    createdByRole: 'RECEPTIONIST',
    reference: 'LD-10517',
  });
  place({
    patientId: 'p-grace',
    doctorId: 'daniel',
    serviceId: 'preventive',
    startTime: '13:00',
    minOffset: 0,
    status: 'PENDING',
    reason: 'Chipped front tooth, would like same-day repair.',
    createdByRole: 'PATIENT',
    reference: 'LD-10533',
  });
  place({
    patientId: 'p-liam',
    doctorId: 'daniel',
    serviceId: 'whitening',
    startTime: '15:00',
    minOffset: 0,
    status: 'CONFIRMED',
    reason: 'Wedding in three weeks.',
    createdByRole: 'PATIENT',
    reference: 'LD-10541',
  });
  place({
    patientId: 'p-sofia',
    doctorId: 'daniel',
    serviceId: 'children',
    startTime: '09:30',
    minOffset: 1,
    status: 'CONFIRMED',
    reason: 'First visit for age 4. Nervous — extra time please.',
    createdByRole: 'RECEPTIONIST',
    reference: 'LD-10552',
  });
  place({
    patientId: 'p-ethan',
    doctorId: 'ada',
    serviceId: 'implants',
    startTime: '11:00',
    minOffset: 1,
    status: 'PENDING',
    reason: 'Missing upper right premolar.',
    createdByRole: 'PATIENT',
    reference: 'LD-10566',
  });
  place({
    patientId: 'p-demo',
    doctorId: 'ada',
    serviceId: 'whitening',
    startTime: '13:30',
    minOffset: 1,
    status: 'CONFIRMED',
    reason: 'Coffee staining on front teeth; would like a brighter shade.',
    createdByRole: 'PATIENT',
    reference: 'LD-10569',
  });
  place({
    patientId: 'p-mia',
    doctorId: 'ada',
    serviceId: 'veneers',
    startTime: '14:00',
    minOffset: 4,
    status: 'PENDING',
    reason: 'Interested in a digital smile preview.',
    createdByRole: 'RECEPTIONIST',
    reference: 'LD-10571',
  });
  place({
    patientId: 'p-olivia',
    doctorId: 'maya',
    serviceId: 'aligners',
    startTime: '10:00',
    minOffset: 5,
    status: 'CONFIRMED',
    reason: 'Aligner progress check.',
    createdByRole: 'PATIENT',
    reference: 'LD-10584',
  });
  place({
    patientId: 'p-jonah',
    doctorId: 'daniel',
    serviceId: 'preventive',
    startTime: '11:30',
    minOffset: 2,
    status: 'CANCELLED',
    reason: 'Rescheduling after half-term.',
    createdByRole: 'PATIENT',
    reference: 'LD-10529',
  });

  const jamie = SEED_PATIENTS.find((patient) => patient.id === 'p-demo');
  if (jamie) {
    appointments.push({
      id: 'seed-history-jamie',
      reference: 'LD-09842',
      patientId: jamie.id,
      patientName: jamie.name,
      email: jamie.email,
      phone: jamie.phone,
      doctorId: 'daniel',
      serviceId: 'preventive',
      appointmentDate: addDays(today, -21),
      startTime: '10:00',
      endTime: endTimeFor('preventive', '10:00'),
      reason: 'Routine check-up and hygiene visit.',
      status: 'COMPLETED',
      createdByUserId: jamie.id,
      createdByRole: 'PATIENT',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
    });
  }

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
  patientId: string;
  doctorId: string;
  serviceId: string;
  startTime: string;
  minOffset: number;
  status: AppointmentStatus;
  reason: string;
  createdByRole: 'PATIENT' | 'RECEPTIONIST' | 'DOCTOR';
  reference: string;
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
