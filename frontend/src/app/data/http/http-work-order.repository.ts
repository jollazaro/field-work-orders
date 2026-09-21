import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Actor } from '../../domain/models/actor';
import type { Technician } from '../../domain/models/technician';
import type { WorkOrder, WorkOrderDetail } from '../../domain/models/work-order';
import type { WorkOrderStatus } from '../../domain/models/work-order-status';
import type {
  CreateWorkOrderInput,
  WorkOrderListPage,
  WorkOrderListQuery,
  WorkOrderRepository,
} from '../work-order.repository';
import { throwAsApiError } from './http-api-error';

/**
 * HTTP adapter against Spring `/api`. Auth comes from the JWT interceptor;
 * the `actor` argument is unused (kept for the shared port).
 */
@Injectable()
export class HttpWorkOrderRepository implements WorkOrderRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  async list(_actor: Actor, query: WorkOrderListQuery = {}): Promise<WorkOrderListPage> {
    let params = new HttpParams();
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.priority) {
      params = params.set('priority', query.priority);
    }
    if (query.unassigned != null) {
      params = params.set('unassigned', String(query.unassigned));
    }
    if (query.q?.trim()) {
      params = params.set('q', query.q.trim());
    }
    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.size != null) {
      params = params.set('size', String(query.size));
    }
    if (query.sort) {
      params = params.set('sort', query.sort);
    }
    try {
      return await firstValueFrom(
        this.http.get<WorkOrderListPage>(this.url('/api/work-orders'), { params }),
      );
    } catch (err) {
      throwAsApiError(err);
    }
  }

  async exportExcel(_actor: Actor, query: WorkOrderListQuery = {}): Promise<Blob> {
    let params = new HttpParams();
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.priority) {
      params = params.set('priority', query.priority);
    }
    if (query.unassigned != null) {
      params = params.set('unassigned', String(query.unassigned));
    }
    if (query.q?.trim()) {
      params = params.set('q', query.q.trim());
    }
    if (query.sort) {
      params = params.set('sort', query.sort);
    }
    try {
      return await firstValueFrom(
        this.http.get(this.url('/api/work-orders/export'), {
          params,
          responseType: 'blob',
        }),
      );
    } catch (err) {
      throwAsApiError(err);
    }
  }

  async get(_actor: Actor, id: number): Promise<WorkOrderDetail> {
    try {
      return await firstValueFrom(
        this.http.get<WorkOrderDetail>(this.url(`/api/work-orders/${id}`)),
      );
    } catch (err) {
      throwAsApiError(err);
    }
  }

  async create(_actor: Actor, input: CreateWorkOrderInput): Promise<WorkOrder> {
    try {
      return await firstValueFrom(
        this.http.post<WorkOrder>(this.url('/api/work-orders'), {
          title: input.title,
          site: input.site,
          instruction: input.instruction,
          priority: input.priority,
          assignedTechnicianId: input.assignedTechnicianId ?? null,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
        }),
      );
    } catch (err) {
      throwAsApiError(err);
    }
  }

  async assign(
    _actor: Actor,
    id: number,
    technicianId?: number | null,
  ): Promise<WorkOrder> {
    const body =
      technicianId == null ? {} : { technicianId };
    try {
      return await firstValueFrom(
        this.http.post<WorkOrder>(this.url(`/api/work-orders/${id}/assignment`), body),
      );
    } catch (err) {
      throwAsApiError(err);
    }
  }

  async changeStatus(
    _actor: Actor,
    id: number,
    target: WorkOrderStatus,
  ): Promise<WorkOrder> {
    try {
      return await firstValueFrom(
        this.http.post<WorkOrder>(this.url(`/api/work-orders/${id}/status`), {
          status: target,
        }),
      );
    } catch (err) {
      throwAsApiError(err);
    }
  }

  async uploadPhoto(_actor: Actor, id: number, photoDataUrl: string): Promise<WorkOrder> {
    const blob = dataUrlToBlob(photoDataUrl);
    const form = new FormData();
    form.append('file', blob, guessFileName(blob.type));
    try {
      return await firstValueFrom(
        this.http.post<WorkOrder>(this.url(`/api/work-orders/${id}/photo`), form),
      );
    } catch (err) {
      throwAsApiError(err);
    }
  }

  async setLocation(
    _actor: Actor,
    id: number,
    lat: number,
    lng: number,
  ): Promise<WorkOrder> {
    try {
      return await firstValueFrom(
        this.http.post<WorkOrder>(this.url(`/api/work-orders/${id}/location`), {
          lat,
          lng,
        }),
      );
    } catch (err) {
      throwAsApiError(err);
    }
  }

  async listTechnicians(_actor: Actor): Promise<Technician[]> {
    try {
      return await firstValueFrom(
        this.http.get<Technician[]>(this.url('/api/technicians')),
      );
    } catch (err) {
      throwAsApiError(err);
    }
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid photo data URL');
  }
  const mime = match[1] || 'application/octet-stream';
  const isBase64 = !!match[2];
  const data = match[3];
  if (isBase64) {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(data)], { type: mime });
}

function guessFileName(mime: string): string {
  if (mime.includes('png')) {
    return 'photo.png';
  }
  if (mime.includes('webp')) {
    return 'photo.webp';
  }
  if (mime.includes('gif')) {
    return 'photo.gif';
  }
  return 'photo.jpg';
}
