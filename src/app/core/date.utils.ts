const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Local-time ISO date (yyyy-mm-dd) without UTC drift. */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(':').map(Number);
  return { hours, minutes };
}

export function formatTime(time: string): string {
  const { hours, minutes } = parseTime(time);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${`${minutes}`.padStart(2, '0')} ${suffix}`;
}

/** e.g. "Thu, Oct 29" */
export function formatDateShort(iso: string): string {
  return fromIsoDate(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** e.g. "Thursday, October 29, 2026" */
export function formatDateLong(iso: string): string {
  return fromIsoDate(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "Today", "Tomorrow" or a weekday + date. */
export function relativeDay(iso: string): string {
  if (iso === todayIso()) {
    return 'Today';
  }
  if (iso === addDays(todayIso(), 1)) {
    return 'Tomorrow';
  }
  return formatDateShort(iso);
}

export function weekdayName(iso: string): string {
  return DAY_LABELS[fromIsoDate(iso).getDay()];
}

/** Clinic is closed on Sundays. */
export function isClosed(iso: string): boolean {
  return fromIsoDate(iso).getDay() === 0;
}

/**
 * Start times that still leave room before closing: 6pm Mon–Thu, 4pm Friday, 2pm Saturday.
 */
export function slotsForDate(iso: string, slots: readonly string[]): readonly string[] {
  const weekday = fromIsoDate(iso).getDay();
  if (weekday === 0) {
    return [];
  }
  const lastStart = weekday === 6 ? '13:30' : weekday === 5 ? '15:30' : '16:30';
  return slots.filter((time) => time <= lastStart);
}

export function isPastSlot(dateIso: string, time: string): boolean {
  const now = new Date();
  const slot = fromIsoDate(dateIso);
  const { hours, minutes } = parseTime(time);
  slot.setHours(hours, minutes, 0, 0);
  return slot.getTime() < now.getTime();
}

export function dayParts(iso: string): { weekday: string; day: string; month: string } {
  const date = fromIsoDate(iso);
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    day: `${date.getDate()}`,
    month: date.toLocaleDateString('en-US', { month: 'short' }),
  };
}

export function formatDayHeading(iso: string): string {
  const date = fromIsoDate(iso);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
