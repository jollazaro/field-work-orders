import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  OnDestroy,
  signal,
} from '@angular/core';
import { IonText } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

/**
 * Photo thumbnail. Data URLs render as-is (demo).
 * Relative `/api/.../photo` paths are fetched with the JWT interceptor as a blob.
 */
@Component({
  selector: 'app-photo-thumb',
  template: `
    @if (displaySrc()) {
      <img class="thumb" [src]="displaySrc()!" [alt]="alt()" />
    } @else {
      <ion-text color="medium">
        <p class="missing">{{ missingLabel() }}</p>
      </ion-text>
    }
  `,
  styles: `
    .thumb {
      display: block;
      width: 100%;
      max-height: 240px;
      object-fit: cover;
      border-radius: 8px;
    }
    .missing {
      margin: 0;
      font-size: 0.9rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonText],
})
export class PhotoThumbComponent implements OnDestroy {
  private readonly http = inject(HttpClient);

  readonly src = input<string | null>(null);
  readonly alt = input('Foto de la orden');

  readonly displaySrc = signal<string | null>(null);
  readonly missingLabel = signal('Sin foto');

  private objectUrl: string | null = null;
  private resolveSeq = 0;

  constructor() {
    effect(() => {
      const src = this.src();
      void this.resolve(src);
    });
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }

  private async resolve(src: string | null): Promise<void> {
    const seq = ++this.resolveSeq;
    this.revokeObjectUrl();

    if (!src) {
      if (seq === this.resolveSeq) {
        this.displaySrc.set(null);
        this.missingLabel.set('Sin foto');
      }
      return;
    }

    if (src.startsWith('data:') || src.startsWith('blob:')) {
      if (seq === this.resolveSeq) {
        this.displaySrc.set(src);
      }
      return;
    }

    if (!environment.apiBaseUrl) {
      if (seq === this.resolveSeq) {
        this.displaySrc.set(src);
      }
      return;
    }

    const url = src.startsWith('http') ? src : `${environment.apiBaseUrl}${src}`;
    try {
      const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
      if (seq !== this.resolveSeq) {
        return;
      }
      this.objectUrl = URL.createObjectURL(blob);
      this.displaySrc.set(this.objectUrl);
    } catch {
      if (seq === this.resolveSeq) {
        this.displaySrc.set(null);
        this.missingLabel.set('No se pudo cargar la foto');
      }
    }
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
