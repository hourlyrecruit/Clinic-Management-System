import { AppointmentStatus } from './models';

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Pending confirmation',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No-show',
};

export const STATUS_SHORT_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No-show',
};

const TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'NO_SHOW', 'CANCELLED'],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitions(status: AppointmentStatus): readonly AppointmentStatus[] {
  return TRANSITIONS[status];
}

export function isActive(status: AppointmentStatus): boolean {
  return status === 'PENDING' || status === 'CONFIRMED';
}

export function statusTone(status: AppointmentStatus): string {
  return `db-badge--${status.toLowerCase().replace('_', '-')}`;
}
