export type IconName =
  | 'tooth'
  | 'sparkles'
  | 'shield'
  | 'align'
  | 'implant'
  | 'smile'
  | 'star'
  | 'clock'
  | 'calendar'
  | 'phone'
  | 'pin'
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up-right'
  | 'chat'
  | 'close'
  | 'menu'
  | 'check'
  | 'check-circle'
  | 'search'
  | 'chevron-down'
  | 'user'
  | 'users'
  | 'mail'
  | 'inbox'
  | 'quote'
  | 'alert'
  | 'spark'
  | 'dashboard'
  | 'plus'
  | 'edit'
  | 'refresh'
  | 'log-out'
  | 'stethoscope'
  | 'eye'
  | 'eye-off';

export interface Service {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly icon: IconName;
  readonly duration: string;
  /** Used for demo availability calculations. */
  readonly durationMinutes: number;
  readonly fromPrice: string;
  readonly highlights: readonly string[];
  readonly featured?: boolean;
}

export interface Dentist {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly focus: readonly string[];
  readonly bio: string;
  readonly image: string;
  readonly availability: string;
  readonly years: number;
  readonly email: string;
}

export type Role = 'PATIENT' | 'RECEPTIONIST' | 'DOCTOR';

export interface AuthUser {
  readonly id: string;
  readonly role: Role;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  /** Hash of the demo password. Never the password itself. */
  readonly passwordHash?: string;
  /** Links doctor accounts to their clinic profile. */
  readonly doctorId?: string;
  /** Reception-created patient with no sign-in credentials yet. */
  readonly provisional?: boolean;
  readonly createdAt: string;
}

export interface DemoSession {
  readonly userId: string;
  readonly signedInAt: string;
}

export interface AccountState {
  readonly users: AuthUser[];
  readonly session: DemoSession | null;
}

export interface PatientProfileInput {
  readonly name: string;
  readonly phone: string;
}

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface Appointment {
  readonly id: string;
  readonly reference: string;
  readonly patientId: string;
  readonly patientName: string;
  readonly email: string;
  readonly phone: string;
  readonly doctorId: string;
  readonly serviceId: string;
  /** ISO calendar date, e.g. 2026-10-29 */
  readonly appointmentDate: string;
  /** 24h time, e.g. 09:30 */
  readonly startTime: string;
  /** Derived from the service duration. */
  readonly endTime: string;
  readonly reason: string;
  readonly status: AppointmentStatus;
  readonly createdByUserId: string;
  readonly createdByRole: Role;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateAppointmentInput {
  readonly patientId: string;
  readonly patientName: string;
  readonly email: string;
  readonly phone: string;
  readonly doctorId: string;
  readonly serviceId: string;
  readonly appointmentDate: string;
  readonly startTime: string;
  readonly reason: string;
  readonly createdByUserId: string;
  readonly createdByRole: Role;
}

export interface AppointmentResult {
  readonly ok: boolean;
  readonly appointment?: Appointment;
  readonly error?: string;
}

export interface Slot {
  readonly startTime: string;
  readonly endTime: string;
  readonly available: boolean;
}

export type MessageSource = 'consultation' | 'chat' | 'form';
export type MessageStatus = 'open' | 'resolved';

export interface ClinicMessage {
  readonly id: string;
  readonly name: string;
  readonly contact: string;
  readonly topic: string;
  readonly message: string;
  readonly source: MessageSource;
  readonly createdAt: string;
  readonly status: MessageStatus;
}

export interface Testimonial {
  readonly quote: string;
  readonly name: string;
  readonly treatment: string;
}

export interface Faq {
  readonly question: string;
  readonly answer: string;
}

export interface ChatMessage {
  readonly id: string;
  readonly from: 'patient' | 'team';
  readonly text: string;
}
