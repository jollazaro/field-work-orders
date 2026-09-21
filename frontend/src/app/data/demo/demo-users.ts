import type { Actor } from '../../domain/models/actor';
import type { Technician } from '../../domain/models/technician';

/** Fixed demo identities (match SPEC / API seed emails). */
export const DEMO_SUPERVISOR: Actor = {
  id: 1,
  email: 'supervisor@demo.com',
  role: 'SUPERVISOR',
};

export const DEMO_TECHNICIAN: Technician = {
  id: 2,
  email: 'tecnico@demo.com',
};

export const DEMO_TECHNICIAN_ACTOR: Actor = {
  id: DEMO_TECHNICIAN.id,
  email: DEMO_TECHNICIAN.email,
  role: 'TECHNICIAN',
};

const DEMO_PASSWORD = 'demo';

export const DEMO_LOGIN_PASSWORD = DEMO_PASSWORD;

const ACTORS_BY_EMAIL: Record<string, Actor> = {
  [DEMO_SUPERVISOR.email]: DEMO_SUPERVISOR,
  [DEMO_TECHNICIAN_ACTOR.email]: DEMO_TECHNICIAN_ACTOR,
};

/** Resolves a demo login; null if credentials are not the two seeded users. */
export function authenticateDemoUser(email: string, password: string): Actor | null {
  if (password !== DEMO_PASSWORD) {
    return null;
  }
  const normalized = email.trim().toLowerCase();
  return ACTORS_BY_EMAIL[normalized] ?? null;
}
