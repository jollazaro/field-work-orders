import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { authenticateDemoUser } from '../../data/demo/demo-users';
import type { Actor } from '../../domain/models/actor';
import type { UserRole } from '../../domain/models/user-role';
import { environment } from '../../../environments/environment';
import { AuthSession } from './auth-session';
import { readUserIdFromJwt } from './jwt-payload';

const SESSION_STORAGE_KEY = 'fieldwork.session';

interface LoginResponse {
  token: string;
  email: string;
  role: UserRole;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionSignal = signal<AuthSession | null>(this.readSession());

  readonly session = this.sessionSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);
  readonly actor = computed<Actor | null>(() => {
    const session = this.sessionSignal();
    if (!session) {
      return null;
    }
    return { id: session.id, email: session.email, role: session.role };
  });

  /** Demo when `apiBaseUrl` is empty; otherwise POST `/api/auth/login`. */
  async login(email: string, password: string): Promise<boolean> {
    if (!environment.apiBaseUrl) {
      return this.loginDemo(email, password);
    }
    return this.loginHttp(email, password);
  }

  /**
   * Demo login when `apiBaseUrl` is empty. Returns false for invalid credentials.
   */
  loginDemo(email: string, password: string): boolean {
    const actor = authenticateDemoUser(email, password);
    if (!actor) {
      return false;
    }
    this.setSession({
      token: `demo-${actor.id}`,
      id: actor.id,
      email: actor.email,
      role: actor.role,
    });
    return true;
  }

  setSession(session: AuthSession): void {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.sessionSignal.set(session);
  }

  clearSession(): void {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    this.sessionSignal.set(null);
  }

  requireActor(): Actor {
    const actor = this.actor();
    if (!actor) {
      throw new Error('Not authenticated');
    }
    return actor;
  }

  private async loginHttp(email: string, password: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.post<LoginResponse>(`${environment.apiBaseUrl}/api/auth/login`, {
          email: email.trim(),
          password,
        }),
      );
      this.setSession({
        token: res.token,
        id: readUserIdFromJwt(res.token),
        email: res.email,
        role: res.role,
      });
      return true;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        return false;
      }
      throw err;
    }
  }

  private readSession(): AuthSession | null {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as AuthSession;
      if (
        typeof parsed.token === 'string' &&
        typeof parsed.id === 'number' &&
        typeof parsed.email === 'string' &&
        (parsed.role === 'SUPERVISOR' || parsed.role === 'TECHNICIAN')
      ) {
        return parsed;
      }
    } catch {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }

    return null;
  }
}
