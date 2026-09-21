import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline, moonOutline, sunnyOutline } from 'ionicons/icons';

import { AuthService } from '../core/auth/auth.service';
import type { AuthSession } from '../core/auth/auth-session';
import { ThemeService } from '../core/theme/theme.service';
import { ROLE_LABELS } from '../domain/labels';

@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  host: { class: 'ion-page' },
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonLabel,
    IonRouterOutlet,
  ],
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly session = this.auth.session;
  readonly isDark = this.theme.isDark;

  constructor() {
    addIcons({ moonOutline, sunnyOutline, logOutOutline });
  }

  sessionLabel(session: AuthSession): string {
    return ROLE_LABELS[session.role];
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  logout(): void {
    this.auth.clearSession();
    void this.router.navigateByUrl('/login');
  }
}
