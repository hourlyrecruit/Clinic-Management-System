import { Injectable, computed, signal } from '@angular/core';
import { DEMO_PASSWORD, SEED_PATIENTS, SEED_STAFF } from './auth.data';
import { AuthUser, DemoSession, PatientProfileInput, Role } from './models';

const USERS_KEY = 'lumina-users-v1';
const SESSION_KEY = 'lumina-session-v1';
const HASH_ITERATIONS = 60_000;

export interface AuthResult {
  readonly ok: boolean;
  readonly user?: AuthUser;
  readonly error?: string;
}

export interface RegisterInput {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly password: string;
}

export interface PatientRecordInput {
  readonly name: string;
  readonly phone: string;
  readonly email?: string;
}

export interface PatientRecordResult extends AuthResult {
  readonly created?: boolean;
}

/**
 * Frontend-only demonstration of accounts and sessions.
 *
 * This is NOT secure authentication: every account, hash and session lives in
 * localStorage and can be read or edited by the visitor. Passwords are hashed
 * with PBKDF2 so no plaintext is stored, but without a server there is no
 * rate limiting, secure cookie, or real credential protection.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly usersSignal = signal<AuthUser[]>([]);
  private readonly sessionSignal = signal<DemoSession | null>(null);
  private initPromise?: Promise<void>;

  readonly users = this.usersSignal.asReadonly();
  readonly session = this.sessionSignal.asReadonly();

  readonly currentUser = computed<AuthUser | null>(() => {
    const session = this.sessionSignal();
    if (!session) {
      return null;
    }
    return this.usersSignal().find((user) => user.id === session.userId) ?? null;
  });

  readonly isSignedIn = computed(() => this.currentUser() !== null);
  readonly patients = computed(() =>
    this.usersSignal()
      .filter((user) => user.role === 'PATIENT')
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  /** Runs once during app bootstrap so guards see a restored session. */
  initialize(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.bootstrap();
    }
    return this.initPromise;
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    await this.initialize();
    const normalized = email.trim().toLowerCase();
    const user = this.usersSignal().find((item) => item.email.toLowerCase() === normalized);

    if (!user || !user.passwordHash) {
      return { ok: false, error: 'Those details do not match a demo account.' };
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { ok: false, error: 'Those details do not match a demo account.' };
    }

    this.startSession(user);
    return { ok: true, user };
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    await this.initialize();
    const email = input.email.trim().toLowerCase();
    if (this.emailExists(email)) {
      return {
        ok: false,
        error: 'An account already uses this email. Try signing in instead.',
      };
    }

    const passwordHash = await hashPassword(input.password);
    const user: AuthUser = {
      id: makeId('user'),
      role: 'PATIENT',
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    this.usersSignal.update((users) => [...users, user]);
    this.persistUsers();
    this.startSession(user);
    return { ok: true, user };
  }

  /** Reception creates a provisional patient record with no usable password. */
  async createPatientRecord(input: PatientRecordInput): Promise<PatientRecordResult> {
    await this.initialize();
    const email = (input.email ?? '').trim().toLowerCase();
    const phone = normalizePhone(input.phone);
    const existing = this.usersSignal().find(
      (user) =>
        user.role === 'PATIENT' &&
        ((email && user.email.toLowerCase() === email) ||
          (phone && normalizePhone(user.phone) === phone)),
    );
    if (existing) {
      return { ok: true, user: existing, created: false };
    }

    const user: AuthUser = {
      id: makeId('user'),
      role: 'PATIENT',
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      provisional: true,
      createdAt: new Date().toISOString(),
    };
    this.usersSignal.update((users) => [...users, user]);
    this.persistUsers();
    return { ok: true, user, created: true };
  }

  updateProfile(input: PatientProfileInput): AuthResult {
    const current = this.currentUser();
    if (!current) {
      return { ok: false, error: 'You are not signed in.' };
    }
    const updated: AuthUser = {
      ...current,
      name: input.name.trim(),
      phone: input.phone.trim(),
    };
    this.usersSignal.update((users) => users.map((user) => (user.id === updated.id ? updated : user)));
    this.persistUsers();
    return { ok: true, user: updated };
  }

  patientById(id: string): AuthUser | undefined {
    return this.usersSignal().find((user) => user.id === id && user.role === 'PATIENT');
  }

  searchPatients(query: string): AuthUser[] {
    const needle = query.trim().toLowerCase();
    const patients = this.patients();
    if (!needle) {
      return patients;
    }
    return patients.filter((patient) =>
      [patient.name, patient.email, patient.phone, normalizePhone(patient.phone)]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }

  emailExists(email: string): boolean {
    const normalized = email.trim().toLowerCase();
    return this.usersSignal().some((user) => user.email.toLowerCase() === normalized);
  }

  signOut(): void {
    this.sessionSignal.set(null);
    removeStorage(SESSION_KEY);
  }

  homePath(user: AuthUser | null = this.currentUser()): string {
    switch (user?.role) {
      case 'RECEPTIONIST':
        return '/receptionist/dashboard';
      case 'DOCTOR':
        return '/doctor/dashboard';
      case 'PATIENT':
        return '/patient/dashboard';
      default:
        return '/signin';
    }
  }

  roleLabel(role: Role | undefined): string {
    switch (role) {
      case 'RECEPTIONIST':
        return 'Reception';
      case 'DOCTOR':
        return 'Clinician';
      case 'PATIENT':
        return 'Patient';
      default:
        return 'Guest';
    }
  }

  async resetDemoAccounts(): Promise<void> {
    this.signOut();
    this.usersSignal.set(await buildSeedUsers());
    this.persistUsers();
  }

  private async bootstrap(): Promise<void> {
    try {
      const stored = readJson<AuthUser[]>(USERS_KEY);
      const validUsers = Array.isArray(stored) ? stored.filter(isStoredUser) : [];
      if (validUsers.length > 0) {
        this.usersSignal.set(validUsers);
      } else {
        this.usersSignal.set(await buildSeedUsers());
        this.persistUsers();
      }

      const storedSession = readJson<DemoSession>(SESSION_KEY);
      if (
        storedSession &&
        typeof storedSession.userId === 'string' &&
        this.usersSignal().some((user) => user.id === storedSession.userId)
      ) {
        this.sessionSignal.set(storedSession);
      } else {
        this.sessionSignal.set(null);
        removeStorage(SESSION_KEY);
      }
    } catch {
      this.usersSignal.set([]);
      this.sessionSignal.set(null);
    }
  }

  private startSession(user: AuthUser): void {
    const session: DemoSession = {
      userId: user.id,
      signedInAt: new Date().toISOString(),
    };
    this.sessionSignal.set(session);
    writeJson(SESSION_KEY, session);
  }

  private persistUsers(): void {
    writeJson(USERS_KEY, this.usersSignal());
  }
}

async function buildSeedUsers(): Promise<AuthUser[]> {
  const createdAt = new Date().toISOString();
  const users: AuthUser[] = [];

  for (const patient of SEED_PATIENTS) {
    users.push({
      id: patient.id,
      role: 'PATIENT',
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      passwordHash:
        patient.id === 'p-demo' ? await hashPassword(DEMO_PASSWORD) : undefined,
      provisional: patient.id !== 'p-demo',
      createdAt,
    });
  }

  for (const staff of SEED_STAFF) {
    users.push({
      id: staff.id,
      role: staff.role,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      doctorId: staff.doctorId,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      createdAt,
    });
  }

  return users;
}

function isStoredUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const user = value as Partial<AuthUser>;
  return (
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'PATIENT' || user.role === 'RECEPTIONIST' || user.role === 'DOCTOR')
  );
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomHex(16);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return `fallback$${salt}$${fallbackHash(`${salt}:${password}`)}`;
  }
  try {
    const encoder = new TextEncoder();
    const key = await subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: HASH_ITERATIONS,
        hash: 'SHA-256',
      },
      key,
      256,
    );
    return `pbkdf2$${HASH_ITERATIONS}$${salt}$${toHex(bits)}`;
  } catch {
    return `fallback$${salt}$${fallbackHash(`${salt}:${password}`)}`;
  }
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, digest] = stored.split('$');
  if (scheme === 'fallback') {
    return fallbackHash(`${salt}:${password}`) === digest;
  }
  if (scheme !== 'pbkdf2' || !iterations || !salt || !digest) {
    return false;
  }
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return false;
  }
  try {
    const encoder = new TextEncoder();
    const key = await subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: Number(iterations),
        hash: 'SHA-256',
      },
      key,
      256,
    );
    return toHex(bits) === digest;
  } catch {
    return false;
  }
}

function fallbackHash(input: string): string {
  // Only used when Web Crypto is unavailable (older embedded browsers).
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function randomHex(bytes: number): string {
  const values = new Uint8Array(bytes);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * 256);
    }
  }
  return toHex(values.buffer);
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

function makeId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

function readJson<T>(key: string): T | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // In-memory demo still works when storage is blocked.
  }
}

function removeStorage(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore blocked storage.
  }
}
