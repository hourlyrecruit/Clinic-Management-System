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
  | 'arrow-up-right'
  | 'chat'
  | 'close'
  | 'menu'
  | 'check'
  | 'search'
  | 'chevron-down'
  | 'user'
  | 'mail'
  | 'inbox'
  | 'users'
  | 'quote'
  | 'alert'
  | 'spark'
  | 'root'
  | 'award'
  | 'cpu'
  | 'heart'
  | 'tag'
  | 'chevron-left'
  | 'chevron-right'
  | 'send'
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'linkedin'
  | 'x-social';

export interface Service {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly icon: IconName;
  readonly duration: string;
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
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  readonly id: string;
  readonly reference: string;
  readonly patientName: string;
  readonly email: string;
  readonly phone: string;
  readonly serviceId: string;
  readonly dentistId: string;
  /** ISO calendar date, e.g. 2026-10-29 */
  readonly date: string;
  /** 24h time, e.g. 09:30 */
  readonly time: string;
  readonly notes: string;
  readonly status: AppointmentStatus;
  readonly createdAt: string;
}

export interface BookingInput {
  readonly patientName: string;
  readonly email: string;
  readonly phone: string;
  readonly serviceId: string;
  readonly dentistId: string;
  readonly date: string;
  readonly time: string;
  readonly notes: string;
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

export interface Reason {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly icon: IconName;
  readonly stat?: string;
}

export interface SocialLink {
  readonly label: string;
  readonly href: string;
  readonly icon: IconName;
}
