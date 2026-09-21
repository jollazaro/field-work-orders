import { InjectionToken } from '@angular/core';

import type { Actor } from '../domain/models/actor';
import type { Technician } from '../domain/models/technician';
import type { WorkOrder, WorkOrderDetail } from '../domain/models/work-order';
import type { WorkOrderPriority } from '../domain/models/work-order-priority';
import type { WorkOrderStatus } from '../domain/models/work-order-status';

/** Query filters for list; omitted fields mean no filter. */
export interface WorkOrderListQuery {
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  /** When true, only orders without technician; when false, only assigned. */
  unassigned?: boolean;
  /** Partial match on title, site, instruction, technician email. */
  q?: string;
  /** 0-based page index. */
  page?: number;
  size?: number;
  /** e.g. `updatedAt,desc` or `title,asc`. */
  sort?: string;
}

export interface WorkOrderListPage {
  items: WorkOrder[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CreateWorkOrderInput {
  title: string;
  site: string;
  instruction: string;
  priority: WorkOrderPriority;
  assignedTechnicianId?: number | null;
  lat?: number | null;
  lng?: number | null;
}

/**
 * Port for work-order persistence. Demo and HTTP adapters implement this.
 * All methods return Promises; failures throw {@link ApiError} `{ status, message }`.
 */
export interface WorkOrderRepository {
  list(actor: Actor, query?: WorkOrderListQuery): Promise<WorkOrderListPage>;
  /** Excel/Spreadsheet export of all rows matching filters (no pagination). */
  exportExcel(actor: Actor, query?: WorkOrderListQuery): Promise<Blob>;
  get(actor: Actor, id: number): Promise<WorkOrderDetail>;
  create(actor: Actor, input: CreateWorkOrderInput): Promise<WorkOrder>;
  assign(actor: Actor, id: number, technicianId?: number | null): Promise<WorkOrder>;
  changeStatus(actor: Actor, id: number, target: WorkOrderStatus): Promise<WorkOrder>;
  /** Demo: `photoDataUrl` is a `data:image/...` URL. HTTP will map multipart. */
  uploadPhoto(actor: Actor, id: number, photoDataUrl: string): Promise<WorkOrder>;
  setLocation(actor: Actor, id: number, lat: number, lng: number): Promise<WorkOrder>;
  listTechnicians(actor: Actor): Promise<Technician[]>;
}

export const WORK_ORDER_REPOSITORY = new InjectionToken<WorkOrderRepository>('WorkOrderRepository');
