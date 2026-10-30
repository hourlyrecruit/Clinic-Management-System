import { Role } from './models';

/**
 * All accounts below are fictional demonstration data. The shared password is
 * public on purpose: this is a frontend-only demo, not a real credential store.
 */
export const DEMO_PASSWORD = 'Lumina2026!';

export interface SeedPatient {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
}

export const SEED_PATIENTS: readonly SeedPatient[] = [
  {
    id: 'p-demo',
    name: 'Jamie Rivera',
    email: 'patient@demo.com',
    phone: '(503) 555-0142',
  },
  {
    id: 'p-ava',
    name: 'Ava Thompson',
    email: 'ava.thompson@example.com',
    phone: '(503) 555-0118',
  },
  {
    id: 'p-noah',
    name: 'Noah Patel',
    email: 'noah.patel@example.com',
    phone: '(503) 555-0173',
  },
  {
    id: 'p-grace',
    name: 'Grace Kim',
    email: 'grace.kim@example.com',
    phone: '(503) 555-0140',
  },
  {
    id: 'p-liam',
    name: 'Liam Rivera',
    email: 'liam.rivera@example.com',
    phone: '(503) 555-0126',
  },
  {
    id: 'p-sofia',
    name: 'Sofia Alvarez',
    email: 'sofia.alvarez@example.com',
    phone: '(503) 555-0155',
  },
  {
    id: 'p-ethan',
    name: 'Ethan Brooks',
    email: 'ethan.brooks@example.com',
    phone: '(503) 555-0164',
  },
  {
    id: 'p-mia',
    name: 'Mia Chen',
    email: 'mia.chen@example.com',
    phone: '(503) 555-0112',
  },
  {
    id: 'p-olivia',
    name: 'Olivia Grant',
    email: 'olivia.grant@example.com',
    phone: '(503) 555-0189',
  },
  {
    id: 'p-jonah',
    name: 'Jonah Weber',
    email: 'jonah.weber@example.com',
    phone: '(503) 555-0191',
  },
];

export interface SeedStaff {
  readonly id: string;
  readonly role: Extract<Role, 'RECEPTIONIST' | 'DOCTOR'>;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly doctorId?: string;
}

export const SEED_STAFF: readonly SeedStaff[] = [
  {
    id: 'staff-reception',
    role: 'RECEPTIONIST',
    name: 'Nora Whitfield',
    email: 'receptionist@demo.com',
    phone: '(503) 555-0102',
  },
  {
    id: 'doctor-ada',
    role: 'DOCTOR',
    name: 'Dr. Ada Bennett',
    email: 'doctor@demo.com',
    phone: '(503) 555-0106',
    doctorId: 'ada',
  },
  {
    id: 'doctor-maya',
    role: 'DOCTOR',
    name: 'Dr. Maya Okafor',
    email: 'doctor.maya@demo.com',
    phone: '(503) 555-0108',
    doctorId: 'maya',
  },
];

export interface DemoCredential {
  readonly role: Role;
  readonly label: string;
  readonly email: string;
  readonly description: string;
}

export const DEMO_CREDENTIALS: readonly DemoCredential[] = [
  {
    role: 'PATIENT',
    label: 'Patient',
    email: 'patient@demo.com',
    description: 'Book visits and see your own history',
  },
  {
    role: 'RECEPTIONIST',
    label: 'Receptionist',
    email: 'receptionist@demo.com',
    description: 'Manage the whole clinic diary',
  },
  {
    role: 'DOCTOR',
    label: 'Doctor',
    email: 'doctor@demo.com',
    description: "Dr. Ada Bennett's own list only",
  },
];

export const SECOND_DOCTOR_EMAIL = 'doctor.maya@demo.com';

export function seedPatientById(id: string): SeedPatient | undefined {
  return SEED_PATIENTS.find((patient) => patient.id === id);
}
