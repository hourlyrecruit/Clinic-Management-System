import { SLOT_INTERVAL_MINUTES, scheduleFor, serviceById } from './clinic-data';
import { addMinutes, isPastSlot, rangesOverlap, timeToMinutes, todayIso } from './date.utils';
import { Appointment, Slot } from './models';

/** Statuses that keep a doctor's diary slot occupied. */
const BLOCKING_STATUSES: readonly Appointment['status'][] = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
];

export function endTimeFor(serviceId: string, startTime: string): string {
  const duration = serviceById(serviceId)?.durationMinutes ?? 30;
  return addMinutes(startTime, duration);
}

export function isSlotAvailable(
  appointments: readonly Appointment[],
  input: {
    doctorId: string;
    date: string;
    startTime: string;
    durationMinutes: number;
    excludeAppointmentId?: string;
  },
): boolean {
  const { doctorId, date, startTime, durationMinutes, excludeAppointmentId } = input;
  if (!date || date < todayIso()) {
    return false;
  }
  if (date === todayIso() && isPastSlot(date, startTime)) {
    return false;
  }

  const block = scheduleFor(doctorId, date);
  if (!block) {
    return false;
  }

  const endTime = addMinutes(startTime, durationMinutes);
  if (timeToMinutes(startTime) < timeToMinutes(block.start)) {
    return false;
  }
  if (timeToMinutes(endTime) > timeToMinutes(block.end)) {
    return false;
  }
  const offset = timeToMinutes(startTime) - timeToMinutes(block.start);
  if (offset % SLOT_INTERVAL_MINUTES !== 0) {
    return false;
  }

  return !appointments.some(
    (appointment) =>
      appointment.id !== excludeAppointmentId &&
      appointment.doctorId === doctorId &&
      appointment.appointmentDate === date &&
      BLOCKING_STATUSES.includes(appointment.status) &&
      rangesOverlap(startTime, endTime, appointment.startTime, appointment.endTime),
  );
}

export function slotsForDoctor(
  appointments: readonly Appointment[],
  input: {
    doctorId: string;
    date: string;
    serviceId: string;
    excludeAppointmentId?: string;
  },
): Slot[] {
  const { doctorId, date, serviceId, excludeAppointmentId } = input;
  const block = scheduleFor(doctorId, date);
  const duration = serviceById(serviceId)?.durationMinutes ?? 30;
  if (!block) {
    return [];
  }

  const slots: Slot[] = [];
  const lastStart = timeToMinutes(block.end) - duration;
  for (
    let start = timeToMinutes(block.start);
    start <= lastStart;
    start += SLOT_INTERVAL_MINUTES
  ) {
    const startTime = `${`${Math.floor(start / 60)}`.padStart(2, '0')}:${`${start % 60}`.padStart(
      2,
      '0',
    )}`;
    slots.push({
      startTime,
      endTime: addMinutes(startTime, duration),
      available: isSlotAvailable(appointments, {
        doctorId,
        date,
        startTime,
        durationMinutes: duration,
        excludeAppointmentId,
      }),
    });
  }
  return slots;
}

/** Next date (within `days`) with a free slot for this doctor and treatment. */
export function nextAvailableDate(
  appointments: readonly Appointment[],
  doctorId: string,
  serviceId: string,
  days = 21,
): string | undefined {
  for (let index = 0; index < days; index += 1) {
    const date = addDaysIso(todayIso(), index);
    if (slotsForDoctor(appointments, { doctorId, date, serviceId }).some((slot) => slot.available)) {
      return date;
    }
  }
  return undefined;
}

function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}
