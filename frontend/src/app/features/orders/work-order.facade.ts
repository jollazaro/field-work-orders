import { Injectable, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { FeedbackService } from '../../core/feedback/feedback.service';
import type {
  CreateWorkOrderInput,
  WorkOrderListPage,
  WorkOrderListQuery,
  WorkOrderRepository,
} from '../../data/work-order.repository';
import { WORK_ORDER_REPOSITORY } from '../../data/work-order.repository';
import { ApiError } from '../../domain/api-error';
import type { Technician } from '../../domain/models/technician';
import type { WorkOrder, WorkOrderDetail } from '../../domain/models/work-order';
import type { WorkOrderStatus } from '../../domain/models/work-order-status';
import { WorkOrderRules } from '../../domain/work-order.rules';
import { triggerBrowserDownload } from '../../shared/excel-export';

/** Button visibility for the detail page — pages bind these, no rule `if`s. */
export interface OrderActionFlags {
  canClaim: boolean;
  canAssign: boolean;
  canStart: boolean;
  canComplete: boolean;
  /** IN_PROGRESS assigned tech, but missing photo — Completar shown disabled. */
  completeBlockedByPhoto: boolean;
  canReopen: boolean;
  canAttachEvidence: boolean;
}

/**
 * Facade between pages and repository/rules.
 * Owns toasts for mutations; pages stay free of business-rule branching.
 */
@Injectable({ providedIn: 'root' })
export class WorkOrderFacade {
  private readonly repo = inject<WorkOrderRepository>(WORK_ORDER_REPOSITORY);
  private readonly auth = inject(AuthService);
  private readonly feedback = inject(FeedbackService);
  private readonly rules = new WorkOrderRules();

  canCreate(): boolean {
    const actor = this.auth.actor();
    return actor != null && this.rules.canCreate(actor);
  }

  actionsFor(
    order: Pick<WorkOrder, 'status' | 'assignedTechnicianId' | 'photoUrl'>,
  ): OrderActionFlags {
    const actor = this.auth.requireActor();
    const canAttachEvidence = this.rules.canAttachEvidence(actor, order);
    return {
      canClaim: this.rules.canAssign(actor, order) && actor.role === 'TECHNICIAN',
      canAssign: actor.role === 'SUPERVISOR' && order.status === 'PENDING',
      canStart: this.rules.canChangeStatus(actor, order, 'IN_PROGRESS'),
      canComplete: this.rules.canChangeStatus(actor, order, 'DONE'),
      completeBlockedByPhoto: canAttachEvidence && !order.photoUrl,
      canReopen: this.rules.canChangeStatus(actor, order, 'PENDING'),
      canAttachEvidence,
    };
  }

  async list(query?: WorkOrderListQuery): Promise<WorkOrderListPage> {
    return this.repo.list(this.auth.requireActor(), query);
  }

  async exportExcel(query?: WorkOrderListQuery): Promise<boolean> {
    try {
      const blob = await this.repo.exportExcel(this.auth.requireActor(), query);
      const filename =
        blob.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          ? 'ordenes.xlsx'
          : 'ordenes.xls';
      triggerBrowserDownload(blob, filename);
      await this.feedback.success('Excel descargado');
      return true;
    } catch (err) {
      await this.feedback.fromError(err);
      return false;
    }
  }

  async get(id: number): Promise<WorkOrderDetail> {
    return this.repo.get(this.auth.requireActor(), id);
  }

  async listTechnicians(): Promise<Technician[]> {
    return this.repo.listTechnicians(this.auth.requireActor());
  }

  async create(input: CreateWorkOrderInput): Promise<WorkOrder | null> {
    try {
      const created = await this.repo.create(this.auth.requireActor(), input);
      await this.feedback.success('Orden creada');
      return created;
    } catch (err) {
      await this.feedback.fromError(err);
      return null;
    }
  }

  async claim(id: number): Promise<WorkOrder | null> {
    try {
      const updated = await this.repo.assign(this.auth.requireActor(), id);
      await this.feedback.success('Orden tomada');
      return updated;
    } catch (err) {
      await this.feedback.fromError(err);
      return null;
    }
  }

  async assign(id: number, technicianId: number): Promise<WorkOrder | null> {
    try {
      const updated = await this.repo.assign(this.auth.requireActor(), id, technicianId);
      await this.feedback.success('Técnico asignado');
      return updated;
    } catch (err) {
      await this.feedback.fromError(err);
      return null;
    }
  }

  async changeStatus(id: number, target: WorkOrderStatus): Promise<WorkOrder | null> {
    if (target === 'PENDING') {
      const ok = await this.feedback.confirm({
        header: 'Pasar a Pendiente',
        message: 'La orden pasa a Pendiente. Se conservan técnico, foto y ubicación.',
        confirmText: 'Confirmar',
      });
      if (!ok) {
        return null;
      }
    }

    try {
      const updated = await this.repo.changeStatus(this.auth.requireActor(), id, target);
      await this.feedback.success(statusSuccessMessage(target));
      return updated;
    } catch (err) {
      if (err instanceof ApiError && err.message === WorkOrderRules.ASSIGN_TECHNICIAN_FIRST) {
        await this.feedback.warning('Asigná un técnico primero');
        return null;
      }
      if (err instanceof ApiError && err.message === WorkOrderRules.PHOTO_REQUIRED_TO_COMPLETE) {
        await this.feedback.warning('Adjuntá una foto antes de completar');
        return null;
      }
      await this.feedback.fromError(err);
      return null;
    }
  }

  async uploadPhoto(id: number, photoDataUrl: string, replacing: boolean): Promise<WorkOrder | null> {
    if (replacing) {
      const ok = await this.feedback.confirm({
        header: 'Reemplazar foto',
        message: 'Se reemplazará la foto actual de esta orden.',
        confirmText: 'Reemplazar',
      });
      if (!ok) {
        return null;
      }
    }

    try {
      const updated = await this.repo.uploadPhoto(this.auth.requireActor(), id, photoDataUrl);
      await this.feedback.success('Foto guardada');
      return updated;
    } catch (err) {
      await this.feedback.fromError(err);
      return null;
    }
  }

  async setLocation(id: number, lat: number, lng: number): Promise<WorkOrder | null> {
    try {
      const updated = await this.repo.setLocation(this.auth.requireActor(), id, lat, lng);
      await this.feedback.success('Ubicación guardada');
      return updated;
    } catch (err) {
      await this.feedback.fromError(err);
      return null;
    }
  }

  /** Tries GPS; on denial/failure shows a warning and returns null (caller uses map click). */
  async tryGeolocation(): Promise<{ lat: number; lng: number } | null> {
    if (!navigator.geolocation) {
      await this.feedback.warning('GPS no disponible. Tocá el mapa para ubicar.');
      return null;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60_000,
        });
      });
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    } catch {
      await this.feedback.warning('GPS denegado. Tocá el mapa para ubicar.');
      return null;
    }
  }
}

function statusSuccessMessage(target: WorkOrderStatus): string {
  if (target === 'IN_PROGRESS') {
    return 'Orden en curso';
  }
  if (target === 'DONE') {
    return 'Orden marcada como completada';
  }
  return 'Orden pasada a Pendiente';
}
