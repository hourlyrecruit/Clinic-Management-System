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
    name: 'Ananya Sharma',
    email: 'patient@demo.com',
    phone: '+91 98450 14421',
  },
  {
    id: 'p-ava',
    name: 'Aarav Mehta',
    email: 'aarav.mehta@example.com',
    phone: '+91 98450 11018',
  },
  {
    id: 'p-noah',
    name: 'Nikhil Patel',
    email: 'nikhil.patel@example.com',
    phone: '+91 98450 11073',
  },
  {
    id: 'p-grace',
    name: 'Kavya Krishnan',
    email: 'kavya.krishnan@example.com',
    phone: '+91 98450 11040',
  },
  {
    id: 'p-liam',
    name: 'Rohan Sharma',
    email: 'rohan.sharma@example.com',
    phone: '+91 98450 11026',
  },
  {
    id: 'p-sofia',
    name: 'Sneha Iyer',
    email: 'sneha.iyer@example.com',
    phone: '+91 98450 11055',
  },
  {
    id: 'p-ethan',
    name: 'Aditya Verma',
    email: 'aditya.verma@example.com',
    phone: '+91 98450 11064',
  },
  {
    id: 'p-mia',
    name: 'Meera Chandran',
    email: 'meera.chandran@example.com',
    phone: '+91 98450 11012',
  },
  {
    id: 'p-olivia',
    name: 'Ishita Nair',
    email: 'ishita.nair@example.com',
    phone: '+91 98450 11089',
  },
  {
    id: 'p-jonah',
    name: 'Vikram Desai',
    email: 'vikram.desai@example.com',
    phone: '+91 98450 11091',
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
    name: 'Nandini Shetty',
    email: 'receptionist@demo.com',
    phone: '+91 98450 11002',
  },
  {
    id: 'doctor-ada',
    role: 'DOCTOR',
    name: 'Dr. Ananya Rao',
    email: 'doctor@demo.com',
    phone: '+91 98450 11006',
    doctorId: 'ada',
  },
  {
    id: 'doctor-maya',
    role: 'DOCTOR',
    name: 'Dr. Meera Iyer',
    email: 'doctor.maya@demo.com',
    phone: '+91 98450 11008',
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
    description: "Dr. Ananya Rao's own list only",
  },
];

export const SECOND_DOCTOR_EMAIL = 'doctor.maya@demo.com';

export function seedPatientById(id: string): SeedPatient | undefined {
  return SEED_PATIENTS.find((patient) => patient.id === id);
}
