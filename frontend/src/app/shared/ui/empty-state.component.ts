import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon, IonText } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { fileTrayOutline } from 'ionicons/icons';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty">
      <ion-icon name="file-tray-outline" aria-hidden="true"></ion-icon>
      <ion-text color="medium">
        <p>{{ message() }}</p>
      </ion-text>
    </div>
  `,
  styles: `
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 2.5rem 1rem;
      text-align: center;
    }
    ion-icon {
      font-size: 2.5rem;
      color: var(--ion-color-medium);
    }
    p {
      margin: 0;
      max-width: 20rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonText],
})
export class EmptyStateComponent {
  readonly message = input('No hay órdenes para mostrar.');

  constructor() {
    addIcons({ fileTrayOutline });
  }
}
