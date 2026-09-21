import { ApiError } from '../../domain/api-error';
import type { Actor } from '../../domain/models/actor';
import type { Technician } from '../../domain/models/technician';
import type {
  StatusHistoryEvent,
  WorkOrder,
  WorkOrderDetail,
} from '../../domain/models/work-order';
import type { WorkOrderStatus } from '../../domain/models/work-order-status';
import { WorkOrderRules } from '../../domain/work-order.rules';
import type {
  CreateWorkOrderInput,
  WorkOrderListPage,
  WorkOrderListQuery,
  WorkOrderRepository,
} from '../work-order.repository';
import { foldSearchText, matchesSearch } from '../../shared/text-search';
import { buildWorkOrdersSpreadsheetMl } from '../../shared/excel-export';
import { buildDemoSeedOrders } from './demo-seed';
import { DEMO_TECHNICIAN } from './demo-users';

/**
 * In-memory {@link WorkOrderRepository}. Mutations use {@link WorkOrderRules}.
 * State is lost on reload (Pages demo).
 */
export class DemoWorkOrderRepository implements WorkOrderRepository {
  private readonly rules = new WorkOrderRules();
  private nextId = 1;
  private readonly technicians = new Map<number, Technician>();
  private readonly orders = new Map<number, WorkOrderDetail>();

  constructor(technicians: Technician[] = []) {
    for (const tech of technicians) {
      this.technicians.set(tech.id, tech);
    }
  }

  /** Seeded board: demo technician + 3 orders matching the API seeder. */
  static withSeed(): DemoWorkOrderRepository {
    const repo = new DemoWorkOrderRepository([DEMO_TECHNICIAN]);
    for (const order of buildDemoSeedOrders()) {
      repo.orders.set(order.id, structuredClone(order));
      if (order.id >= repo.nextId) {
        repo.nextId = order.id + 1;
      }
    }
    return repo;
  }

  async list(actor: Actor, query: WorkOrderListQuery = {}): Promise<WorkOrderListPage> {
    const page = Math.max(query.page ?? 0, 0);
    const size = Math.min(Math.max(query.size ?? 10, 1), 50);
    const foldedQ = foldSearchText(query.q);
    const sort = query.sort?.trim() || 'updatedAt,desc';

    let items = [...this.orders.values()]
      .filter((order) => this.rules.isListedFor(actor, order))
      .filter((order) => (query.status == null ? true : order.status === query.status))
      .filter((order) => (query.priority == null ? true : order.priority === query.priority))
      .filter((order) => {
        if (query.unassigned == null) {
          return true;
        }
        const isUnassigned = order.assignedTechnicianId == null;
        return query.unassigned ? isUnassigned : !isUnassigned;
      })
      .filter((order) => {
        if (!foldedQ) {
          return true;
        }
        return (
          matchesSearch(order.title, foldedQ) ||
          matchesSearch(order.site, foldedQ) ||
          matchesSearch(order.instruction, foldedQ) ||
          matchesSearch(order.assignedTechnicianEmail, foldedQ)
        );
      });

    items = sortDemoOrders(items, sort);

    const totalElements = items.length;
    const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
    const start = page * size;
    const pageItems = items.slice(start, start + size).map((order) => this.toListItem(order));

    return {
      items: pageItems,
      page,
      size,
      totalElements,
      totalPages,
    };
  }

  async exportExcel(actor: Actor, query: WorkOrderListQuery = {}): Promise<Blob> {
    const page = await this.list(actor, { ...query, page: 0, size: 50 });
    let items = [...page.items];
    for (let p = 1; p < page.totalPages; p++) {
      const next = await this.list(actor, { ...query, page: p, size: 50 });
      items = items.concat(next.items);
    }
    return buildWorkOrdersSpreadsheetMl(items);
  }

  async listTechnicians(actor: Actor): Promise<Technician[]> {
    this.rules.assertCanCreate(actor);
    return [...this.technicians.values()];
  }

  async create(actor: Actor, input: CreateWorkOrderInput): Promise<WorkOrder> {
    this.rules.assertCanCreate(actor);
    this.assertCreateFields(input);

    let technician: Technician | null = null;
    if (input.assignedTechnicianId != null) {
      technician = this.requireTechnician(input.assignedTechnicianId);
    }

    const now = new Date().toISOString();
    const id = this.nextId++;
    const history: StatusHistoryEvent = {
      fromStatus: null,
      toStatus: 'PENDING',
      changedByEmail: actor.email,
      changedAt: now,
    };
    const detail: WorkOrderDetail = {
      id,
      title: input.title.trim(),
      site: input.site.trim(),
      instruction: input.instruction.trim(),
      priority: input.priority,
      status: 'PENDING',
      assignedTechnicianId: technician?.id ?? null,
      assignedTechnicianEmail: technician?.email ?? null,
      photoUrl: null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      createdAt: now,
      updatedAt: now,
      statusHistory: [history],
    };
    this.orders.set(id, detail);
    return this.toListItem(detail);
  }

  async get(actor: Actor, id: number): Promise<WorkOrderDetail> {
    const order = this.requireOrder(id);
    this.rules.assertCanView(actor, order);
    return structuredClone(order);
  }

  async assign(actor: Actor, id: number, technicianId?: number | null): Promise<WorkOrder> {
    const order = this.requireOrder(id);
    this.rules.assertCanAssign(actor, order, technicianId);

    let technician: Technician;
    if (actor.role === 'SUPERVISOR') {
      technician = this.requireTechnician(technicianId!);
    } else {
      technician = this.requireTechnician(actor.id);
    }

    order.assignedTechnicianId = technician.id;
    order.assignedTechnicianEmail = technician.email;
    order.updatedAt = new Date().toISOString();
    return this.toListItem(order);
  }

  async changeStatus(actor: Actor, id: number, target: WorkOrderStatus): Promise<WorkOrder> {
    const order = this.requireOrder(id);
    this.rules.assertCanChangeStatus(actor, order, target);

    const fromStatus = order.status;
    const now = new Date().toISOString();
    order.status = target;
    order.updatedAt = now;
    order.statusHistory.push({
      fromStatus,
      toStatus: target,
      changedByEmail: actor.email,
      changedAt: now,
    });
    return this.toListItem(order);
  }

  async uploadPhoto(actor: Actor, id: number, photoDataUrl: string): Promise<WorkOrder> {
    const order = this.requireOrder(id);
    this.rules.assertCanAttachPhoto(actor, order);
    this.assertImageDataUrl(photoDataUrl);

    order.photoUrl = photoDataUrl;
    order.updatedAt = new Date().toISOString();
    return this.toListItem(order);
  }

  async setLocation(actor: Actor, id: number, lat: number, lng: number): Promise<WorkOrder> {
    const order = this.requireOrder(id);
    this.rules.assertCanSetLocation(actor, order);
    this.rules.assertValidCoordinates(lat, lng);

    order.lat = lat;
    order.lng = lng;
    order.updatedAt = new Date().toISOString();
    return this.toListItem(order);
  }

  private requireOrder(id: number): WorkOrderDetail {
    const order = this.orders.get(id);
    if (!order) {
      throw new ApiError(404, 'Work order not found');
    }
    return order;
  }

  private requireTechnician(id: number): Technician {
    const technician = this.technicians.get(id);
    if (!technician) {
      throw new ApiError(404, 'Technician not found');
    }
    return technician;
  }

  private assertCreateFields(input: CreateWorkOrderInput): void {
    const title = input.title?.trim() ?? '';
    const site = input.site?.trim() ?? '';
    const instruction = input.instruction?.trim() ?? '';
    if (!title || title.length > 200) {
      throw new ApiError(400, 'title is required (max 200)');
    }
    if (!site || site.length > 200) {
      throw new ApiError(400, 'site is required (max 200)');
    }
    if (!instruction || instruction.length > 2000) {
      throw new ApiError(400, 'instruction is required (max 2000)');
    }
    if (input.priority !== 'NORMAL' && input.priority !== 'HIGH') {
      throw new ApiError(400, 'priority is required');
    }
    const hasLat = input.lat != null;
    const hasLng = input.lng != null;
    if (!hasLat || !hasLng) {
      throw new ApiError(400, 'lat and lng are required');
    }
    if (input.lat! < -90 || input.lat! > 90 || input.lng! < -180 || input.lng! > 180) {
      throw new ApiError(400, 'lat/lng out of range');
    }
  }

  private assertImageDataUrl(photoDataUrl: string): void {
    if (typeof photoDataUrl !== 'string' || !photoDataUrl.startsWith('data:image/')) {
      throw new ApiError(400, 'File must be an image');
    }
    if (photoDataUrl.toLowerCase().includes('image/svg')) {
      throw new ApiError(400, 'File must be an image');
    }
  }

  private toListItem(order: WorkOrderDetail): WorkOrder {
    return {
      id: order.id,
      title: order.title,
      site: order.site,
      instruction: order.instruction,
      priority: order.priority,
      status: order.status,
      assignedTechnicianId: order.assignedTechnicianId,
      assignedTechnicianEmail: order.assignedTechnicianEmail,
      photoUrl: order.photoUrl,
      lat: order.lat,
      lng: order.lng,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}

const SORTABLE = new Set(['updatedAt', 'createdAt', 'title', 'site', 'status', 'priority']);

function sortDemoOrders(items: WorkOrderDetail[], sort: string): WorkOrderDetail[] {
  const [rawProp, rawDir] = sort.split(',', 2);
  const property = (rawProp?.trim() || 'updatedAt') as keyof WorkOrderDetail;
  const asc = (rawDir?.trim() || 'desc').toLowerCase() === 'asc';
  const key = SORTABLE.has(String(property)) ? property : 'updatedAt';

  return [...items].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) {
      return 0;
    }
    if (av == null) {
      return asc ? -1 : 1;
    }
    if (bv == null) {
      return asc ? 1 : -1;
    }
    if (av < bv) {
      return asc ? -1 : 1;
    }
    if (av > bv) {
      return asc ? 1 : -1;
    }
    return 0;
  });
}
