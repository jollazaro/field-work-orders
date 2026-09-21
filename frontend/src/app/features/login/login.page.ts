import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { moonOutline, sunnyOutline } from 'ionicons/icons';

import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import {
  DEMO_LOGIN_PASSWORD,
  DEMO_SUPERVISOR,
  DEMO_TECHNICIAN_ACTOR,
} from '../../data/demo/demo-users';
import { ErrorBannerComponent } from '../../shared/ui/error-banner.component';

@Component({
  selector: 'app-login-page',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    ErrorBannerComponent,
  ],
})
export class LoginPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly password = signal(DEMO_LOGIN_PASSWORD);
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly showEmailForm = signal(false);
  readonly isDark = this.theme.isDark;

  constructor() {
    addIcons({ moonOutline, sunnyOutline });
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      void this.router.navigateByUrl('/orders');
    }
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  async enterAsSupervisor(): Promise<void> {
    await this.loginWith(DEMO_SUPERVISOR.email, DEMO_LOGIN_PASSWORD);
  }

  async enterAsTechnician(): Promise<void> {
    await this.loginWith(DEMO_TECHNICIAN_ACTOR.email, DEMO_LOGIN_PASSWORD);
  }

  openEmailForm(): void {
    this.showEmailForm.set(true);
    this.formError.set(null);
  }

  async submit(): Promise<void> {
    this.formError.set(null);
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password) {
      this.formError.set('Completá email y contraseña.');
      return;
    }
    await this.loginWith(email, password);
  }

  private async loginWith(email: string, password: string): Promise<void> {
    this.formError.set(null);
    this.submitting.set(true);
    try {
      const ok = await this.auth.login(email, password);
      if (!ok) {
        this.formError.set('Email o contraseña incorrectos.');
        return;
      }
      await this.router.navigateByUrl('/orders');
    } catch {
      this.formError.set('No se pudo iniciar sesión. Probá de nuevo.');
    } finally {
      this.submitting.set(false);
    }
  }
}
