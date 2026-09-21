import type { UserRole } from '../../domain/models/user-role';

export type { UserRole };

export interface AuthSession {
  token: string;
  /** Actor id (demo user id or JWT subject numeric id). */
  id: number;
  email: string;
  role: UserRole;
}
