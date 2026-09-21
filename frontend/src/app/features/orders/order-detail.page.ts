import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  numberAttribute,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
} from '@ionic/angular';

import { FeedbackService } from '../../core/feedback/feedback.service';
import { personDisplayName, STATUS_LABELS } from '../../domain/labels';
import type { Technician } from '../../domain/models/technician';
import type { WorkOrderDetail } from '../../domain/models/work-order';
import { ErrorBannerComponent } from '../../shared/ui/error-banner.component';
import { LocationMapComponent } from '../../shared/ui/location-map.component';
import { PhotoThumbComponent } from '../../shared/ui/photo-thumb.component';
import {
  PriorityChipComponent,
  StatusChipComponent,
} from '../../shared/ui/status-chip.component';
import {
  OrderActionFlags,
  WorkOrderFacade,
} from './work-order.facade';

export type PrimaryActionKind = 'claim' | 'start' | 'complete' | 'reopen';

export interface PrimaryAction {
  kind: PrimaryActionKind;
  label: string;
  color?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-order-detail-page',
  templateUrl: './order-detail.page.html',
  styleUrls: ['./order-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonSpinner,
    IonText,
    StatusChipComponent,
    PriorityChipComponent,
    PhotoThumbComponent,
    LocationMapComponent,
    ErrorBannerComponent,
  ],
})
export class OrderDetailPage implements OnInit {
  private readonly facade = inject(WorkOrderFacade);
  private readonly feedback = inject(FeedbackService);

  /** Bound from route `:id` via `withComponentInputBinding`. */
  readonly id = input(0, { transform: numberAttribute });

  readonly statusLabels = STATUS_LABELS;

  readonly order = signal<WorkOrderDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly technicians = signal<Technician[]>([]);
  readonly assignTechnicianId = signal<number | null>(null);
  readonly pendingLat = signal<number | null>(null);
  readonly pendingLng = signal<number | null>(null);

  readonly actions = computed<OrderActionFlags | null>(() => {
    const current = this.order();
    return current ? this.facade.actionsFor(current) : null;
  });

  /** One primary next-step CTA (claim > complete > start > reopen). */
  readonly primaryAction = computed<PrimaryAction | null>(() => {
    const flags = this.actions();
    if (!flags) {
      return null;
    }
    if (flags.canClaim) {
      return { kind: 'claim', label: 'Tomar' };
    }
    if (flags.canComplete) {
      return { kind: 'complete', label: 'Completar', color: 'success' };
    }
    if (flags.completeBlockedByPhoto) {
      return {
        kind: 'complete',
        label: 'Completar',
        color: 'success',
        disabled: true,
      };
    }
    if (flags.canStart) {
      return { kind: 'start', label: 'Pasar a En curso' };
    }
    if (flags.canReopen) {
      return { kind: 'reopen', label: 'Pasar a Pendiente', color: 'warning' };
    }
    return null;
  });

  readonly mapLat = computed(() => this.pendingLat() ?? this.order()?.lat ?? null);
  readonly mapLng = computed(() => this.pendingLng() ?? this.order()?.lng ?? null);

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(quiet = false): Promise<void> {
    if (!quiet) {
      this.loading.set(true);
    }
    this.error.set(null);
    try {
      const detail = await this.facade.get(this.id());
      this.order.set(detail);
      this.pendingLat.set(null);
      this.pendingLng.set(null);
      this.assignTechnicianId.set(detail.assignedTechnicianId);

      const flags = this.facade.actionsFor(detail);
      if (flags.canAssign) {
        try {
          this.technicians.set(await this.facade.listTechnicians());
        } catch {
          this.technicians.set([]);
        }
      }
    } catch (err) {
      this.order.set(null);
      this.error.set('No se pudo cargar la orden.');
      await this.feedback.fromError(err);
    } finally {
      if (!quiet) {
        this.loading.set(false);
      }
    }
  }

  async claim(): Promise<void> {
    await this.runMutation(() => this.facade.claim(this.id()));
  }

  async runPrimary(): Promise<void> {
    const action = this.primaryAction();
    if (!action || action.disabled) {
      if (action?.disabled && action.kind === 'complete') {
        await this.feedback.warning('Adjuntá una foto antes de completar');
      }
      return;
    }
    switch (action.kind) {
      case 'claim':
        await this.claim();
        break;
      case 'start':
        await this.start();
        break;
      case 'complete':
        await this.complete();
        break;
      case 'reopen':
        await this.reopen();
        break;
    }
  }

  async assign(): Promise<void> {
    const techId = this.assignTechnicianId();
    if (techId == null) {
      await this.feedback.warning('Elegí un técnico');
      return;
    }
    await this.runMutation(() => this.facade.assign(this.id(), techId));
  }

  async start(): Promise<void> {
    await this.runMutation(() => this.facade.changeStatus(this.id(), 'IN_PROGRESS'));
  }

  async complete(): Promise<void> {
    await this.runMutation(() => this.facade.changeStatus(this.id(), 'DONE'));
  }

  async reopen(): Promise<void> {
    await this.runMutation(() => this.facade.changeStatus(this.id(), 'PENDING'));
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/') || file.type.includes('svg')) {
      await this.feedback.error('El archivo debe ser una imagen');
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const replacing = !!this.order()?.photoUrl;
    await this.runMutation(() => this.facade.uploadPhoto(this.id(), dataUrl, replacing));
  }

  async useGps(): Promise<void> {
    const point = await this.facade.tryGeolocation();
    if (!point) {
      return;
    }
    this.pendingLat.set(point.lat);
    this.pendingLng.set(point.lng);
    await this.runMutation(() => this.facade.setLocation(this.id(), point.lat, point.lng));
  }

  onMapPick(point: { lat: number; lng: number }): void {
    this.pendingLat.set(point.lat);
    this.pendingLng.set(point.lng);
    void this.runMutation(() => this.facade.setLocation(this.id(), point.lat, point.lng));
  }

  technicianLabel(order: WorkOrderDetail): string {
    return personDisplayName(order.assignedTechnicianEmail);
  }

  techLabel(email: string): string {
    return personDisplayName(email);
  }

  formatWhen(iso: string): string {
    try {
      return new Date(iso).toLocaleString('es-AR', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  }

  private async runMutation(
    action: () => Promise<unknown>,
  ): Promise<void> {
    this.busy.set(true);
    try {
      const result = await action();
      if (result != null) {
        await this.reload(true);
      }
    } finally {
      this.busy.set(false);
    }
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
