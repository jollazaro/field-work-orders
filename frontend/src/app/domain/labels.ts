import type { UserRole } from './models/user-role';
import type { WorkOrderPriority } from './models/work-order-priority';
import type { WorkOrderStatus } from './models/work-order-status';

/** Field-operator labels (ADR 002). API enums stay in English. */
export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  DONE: 'Completada',
};

/** UI-only: PENDING without technician (API still stores PENDING). */
export const UNASSIGNED_LABEL = 'Sin asignar';

/** Sentinel for list filter → `unassigned=true` (not a DB status). */
export const UNASSIGNED_FILTER = 'UNASSIGNED' as const;

export type StatusFilterValue = WorkOrderStatus | typeof UNASSIGNED_FILTER | '';

export function statusDisplayLabel(
  status: WorkOrderStatus,
  assignedTechnicianId: number | null | undefined,
): string {
  if (status === 'PENDING' && assignedTechnicianId == null) {
    return UNASSIGNED_LABEL;
  }
  return STATUS_LABELS[status];
}

export const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  NORMAL: 'Normal',
  HIGH: 'Urgente',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPERVISOR: 'Supervisor',
  TECHNICIAN: 'Técnico',
};

/** Short display name for people in list/detail (email stays in auth). */
export function personDisplayName(email: string | null | undefined): string {
  if (!email) {
    return UNASSIGNED_LABEL;
  }
  const known: Record<string, string> = {
    'tecnico@demo.com': 'Técnico demo',
    'supervisor@demo.com': 'Supervisor demo',
  };
  const key = email.trim().toLowerCase();
  if (known[key]) {
    return known[key];
  }
  const local = email.split('@')[0]?.trim();
  return local || email;
}
