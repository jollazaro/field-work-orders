import type { UserRole } from './user-role';

/** Authenticated user as seen by domain rules (matches JWT / demo session). */
export interface Actor {
  id: number;
  email: string;
  role: UserRole;
}
