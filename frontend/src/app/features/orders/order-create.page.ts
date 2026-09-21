import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonText,
} from '@ionic/angular';

import { FeedbackService } from '../../core/feedback/feedback.service';
import { GeocodeService } from '../../core/geocode/geocode.service';
import type { Technician } from '../../domain/models/technician';
import type { WorkOrderPriority } from '../../domain/models/work-order-priority';
import { personDisplayName, PRIORITY_LABELS } from '../../domain/labels';
import { ErrorBannerComponent } from '../../shared/ui/error-banner.component';
import {
  LocationMapComponent,
  type MapLatLng,
} from '../../shared/ui/location-map.component';
import { WorkOrderFacade } from './work-order.facade';

@Component({
  selector: 'app-order-create-page',
  templateUrl: './order-create.page.html',
  styleUrls: ['./order-create.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonSpinner,
    IonText,
    ErrorBannerComponent,
    LocationMapComponent,
  ],
})
export class OrderCreatePage implements OnInit {
  private readonly facade = inject(WorkOrderFacade);
  private readonly feedback = inject(FeedbackService);
  private readonly geocode = inject(GeocodeService);
  private readonly router = inject(Router);

  readonly priorityLabels = PRIORITY_LABELS;
  readonly priorities: WorkOrderPriority[] = ['NORMAL', 'HIGH'];

  readonly title = signal('');
  readonly site = signal('');
  readonly instruction = signal('');
  readonly priority = signal<WorkOrderPriority>('NORMAL');
  readonly technicianId = signal<number | ''>('');
  readonly lat = signal<number | null>(null);
  readonly lng = signal<number | null>(null);
  readonly technicians = signal<Technician[]>([]);
  readonly submitting = signal(false);
  readonly loadingTechs = signal(true);
  readonly geocoding = signal(false);

  readonly titleError = signal<string | null>(null);
  readonly siteError = signal<string | null>(null);
  readonly locationError = signal<string | null>(null);
  readonly instructionError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    if (!this.facade.canCreate()) {
      await this.feedback.error('Solo el supervisor puede crear órdenes.');
      await this.router.navigateByUrl('/orders');
      return;
    }
    try {
      this.technicians.set(await this.facade.listTechnicians());
    } catch (err) {
      await this.feedback.fromError(err);
    } finally {
      this.loadingTechs.set(false);
    }
  }

  onTechnicianChange(value: unknown): void {
    if (value === '' || value == null) {
      this.technicianId.set('');
      return;
    }
    this.technicianId.set(Number(value));
  }

  onMapPick(point: MapLatLng): void {
    this.lat.set(point.lat);
    this.lng.set(point.lng);
    this.locationError.set(null);
  }

  clearPin(): void {
    this.lat.set(null);
    this.lng.set(null);
  }

  async searchOnMap(): Promise<void> {
    const q = this.site().trim();
    if (!q) {
      this.siteError.set('Escribí una dirección para buscarla en el mapa.');
      return;
    }
    this.siteError.set(null);
    this.geocoding.set(true);
    try {
      const hit = await this.geocode.lookup(q);
      this.lat.set(hit.lat);
      this.lng.set(hit.lng);
      this.locationError.set(null);
      await this.feedback.success('Ubicación encontrada en el mapa');
    } catch (err) {
      await this.feedback.fromError(err);
    } finally {
      this.geocoding.set(false);
    }
  }

  async submit(): Promise<void> {
    if (!this.validate()) {
      return;
    }

    this.submitting.set(true);
    try {
      const tech = this.technicianId();
      const created = await this.facade.create({
        title: this.title().trim(),
        site: this.site().trim(),
        instruction: this.instruction().trim(),
        priority: this.priority(),
        assignedTechnicianId: tech === '' ? null : tech,
        lat: this.lat()!,
        lng: this.lng()!,
      });
      if (created) {
        await this.router.navigate(['/orders', created.id]);
      }
    } finally {
      this.submitting.set(false);
    }
  }

  cancel(): void {
    void this.router.navigateByUrl('/orders');
  }

  techLabel(email: string): string {
    return personDisplayName(email);
  }

  private validate(): boolean {
    const title = this.title().trim();
    const site = this.site().trim();
    const instruction = this.instruction().trim();
    let ok = true;

    if (!title) {
      this.titleError.set('El título es obligatorio.');
      ok = false;
    } else if (title.length > 200) {
      this.titleError.set('Máximo 200 caracteres.');
      ok = false;
    } else {
      this.titleError.set(null);
    }

    if (!site) {
      this.siteError.set('La ubicación es obligatoria.');
      ok = false;
    } else if (site.length > 200) {
      this.siteError.set('Máximo 200 caracteres.');
      ok = false;
    } else {
      this.siteError.set(null);
    }

    if (this.lat() == null || this.lng() == null) {
      this.locationError.set('Marcá el pin en el mapa (buscá la dirección o tocá el mapa).');
      ok = false;
    } else {
      this.locationError.set(null);
    }

    if (!instruction) {
      this.instructionError.set('La instrucción es obligatoria.');
      ok = false;
    } else if (instruction.length > 2000) {
      this.instructionError.set('Máximo 2000 caracteres.');
      ok = false;
    } else {
      this.instructionError.set(null);
    }

    return ok;
  }
}
