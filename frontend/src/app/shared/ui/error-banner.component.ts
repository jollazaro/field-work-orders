import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonText } from '@ionic/angular';

@Component({
  selector: 'app-error-banner',
  template: `
    @if (message()) {
      <div class="banner" role="alert">
        <ion-text color="danger">
          <p>{{ message() }}</p>
        </ion-text>
      </div>
    }
  `,
  styles: `
    .banner {
      padding: 0.75rem 1rem;
      margin-bottom: 0.75rem;
      border-radius: 8px;
      background: color-mix(in srgb, var(--ion-color-danger) 12%, transparent);
    }
    p {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.35;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonText],
})
export class ErrorBannerComponent {
  readonly message = input<string | null>(null);
}
