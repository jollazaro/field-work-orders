import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

import { ApiError } from '../../domain/api-error';
import { userFacingMessage } from './user-facing-message';

/** Toast + confirm alerts used by the facade and pages. */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);

  async success(message: string): Promise<void> {
    await this.presentToast(message, 'success', 2200);
  }

  async error(message: string): Promise<void> {
    await this.presentToast(message, 'danger', 3600);
  }

  async warning(message: string): Promise<void> {
    await this.presentToast(message, 'warning', 3200);
  }

  async fromError(err: unknown): Promise<void> {
    if (err instanceof ApiError) {
      await this.error(userFacingMessage(err.message));
      return;
    }
    await this.error('No se pudo completar la acción. Probá de nuevo.');
  }

  /** Returns true if the user confirms. */
  async confirm(opts: {
    header: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header: opts.header,
      message: opts.message,
      buttons: [
        { text: opts.cancelText ?? 'Cancelar', role: 'cancel' },
        { text: opts.confirmText ?? 'Confirmar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  private async presentToast(
    message: string,
    color: 'success' | 'danger' | 'warning',
    duration: number,
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
