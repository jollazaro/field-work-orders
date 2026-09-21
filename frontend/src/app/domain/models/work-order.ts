import type { WorkOrderPriority } from './work-order-priority';
import type { WorkOrderStatus } from './work-order-status';

/** List / mutation response shape from API.md. */
export interface WorkOrder {
  id: number;
  title: string;
  site: string;
  instruction: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignedTechnicianId: number | null;
  assignedTechnicianEmail: string | null;
  photoUrl: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistoryEvent {
  fromStatus: WorkOrderStatus | null;
  toStatus: WorkOrderStatus;
  changedByEmail: string;
  changedAt: string;
}

/** Detail response: list fields plus status history. */
export interface WorkOrderDetail extends WorkOrder {
  statusHistory: StatusHistoryEvent[];
}
