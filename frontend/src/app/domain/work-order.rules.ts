import { ApiError } from './api-error';
import type { Actor } from './models/actor';
import type { UserRole } from './models/user-role';
import type { WorkOrder } from './models/work-order';
import type { WorkOrderStatus } from './models/work-order-status';

/**
 * Pure domain rules shared by the demo adapter and UI (button visibility).
 * HTTP adapter trusts the API and does not re-implement these checks.
 */
export class WorkOrderRules {
  static readonly NOT_ALLOWED_TO_VIEW = 'Not allowed to view this work order';
  static readonly ASSIGN_TECHNICIAN_FIRST = 'Assign a technician first';
  static readonly MUST_BE_PENDING_TO_ASSIGN = 'Work order must be pending to change assignment';
  static readonly ALREADY_ASSIGNED = 'Work order already assigned';
  static readonly NOT_ALLOWED_TO_ASSIGN_TECHNICIAN = 'Not allowed to assign this technician';
  static readonly ALREADY_IN_STATUS = 'Work order is already in that status';
  static readonly ILLEGAL_TRANSITION = 'Illegal status transition';
  static readonly ONLY_SUPERVISORS_CREATE = 'Only supervisors can create work orders';
  static readonly ONLY_TECHNICIANS_PHOTO = 'Only technicians can attach a photo';
  static readonly ONLY_TECHNICIANS_LOCATION = 'Only technicians can set location';
  static readonly EVIDENCE_ONLY_IN_PROGRESS =
    'Photo and location can only be set when the work order is in progress';
  static readonly PHOTO_REQUIRED_TO_COMPLETE = 'Photo is required before completing';
  static readonly TECHNICIAN_ID_REQUIRED = 'technicianId is required';
  static readonly MUST_BE_TECHNICIAN = 'Must be a technician';

  canView(actor: Actor, order: Pick<WorkOrder, 'assignedTechnicianId'>): boolean {
    if (actor.role === 'SUPERVISOR') {
      return true;
    }
    const assignedId = order.assignedTechnicianId;
    return assignedId === null || assignedId === actor.id;
  }

  /** Same visibility as list / GET detail (technician: own or unassigned). */
  isListedFor(actor: Actor, order: Pick<WorkOrder, 'assignedTechnicianId'>): boolean {
    return this.canView(actor, order);
  }

  assertCanView(actor: Actor, order: Pick<WorkOrder, 'assignedTechnicianId'>): void {
    if (!this.canView(actor, order)) {
      throw new ApiError(403, WorkOrderRules.NOT_ALLOWED_TO_VIEW);
    }
  }

  canCreate(actor: Actor): boolean {
    return actor.role === 'SUPERVISOR';
  }

  assertCanCreate(actor: Actor): void {
    if (!this.canCreate(actor)) {
      throw new ApiError(403, WorkOrderRules.ONLY_SUPERVISORS_CREATE);
    }
  }

  /**
   * Whether the actor may change assignment on this order.
   * For supervisors, `technicianId` must be a known technician (caller resolves that).
   * For technicians, only claiming a free PENDING order (self).
   */
  canAssign(
    actor: Actor,
    order: Pick<WorkOrder, 'status' | 'assignedTechnicianId'>,
    technicianId?: number | null,
  ): boolean {
    if (!this.canView(actor, order) || order.status !== 'PENDING') {
      return false;
    }
    if (actor.role === 'SUPERVISOR') {
      return technicianId != null;
    }
    if (order.assignedTechnicianId !== null) {
      return false;
    }
    return technicianId == null || technicianId === actor.id;
  }

  /**
   * Enforces assignment rules. Does not mutate.
   * Supervisor path expects `technicianId` already validated as an existing TECHNICIAN.
   */
  assertCanAssign(
    actor: Actor,
    order: Pick<WorkOrder, 'status' | 'assignedTechnicianId'>,
    technicianId?: number | null,
  ): void {
    this.assertCanView(actor, order);
    if (order.status !== 'PENDING') {
      throw new ApiError(409, WorkOrderRules.MUST_BE_PENDING_TO_ASSIGN);
    }

    if (actor.role === 'SUPERVISOR') {
      if (technicianId == null) {
        throw new ApiError(400, WorkOrderRules.TECHNICIAN_ID_REQUIRED);
      }
      return;
    }

    if (order.assignedTechnicianId !== null) {
      throw new ApiError(409, WorkOrderRules.ALREADY_ASSIGNED);
    }
    if (technicianId != null && technicianId !== actor.id) {
      throw new ApiError(403, WorkOrderRules.NOT_ALLOWED_TO_ASSIGN_TECHNICIAN);
    }
  }

  canChangeStatus(
    actor: Actor,
    order: Pick<WorkOrder, 'status' | 'assignedTechnicianId' | 'photoUrl'>,
    target: WorkOrderStatus,
  ): boolean {
    if (!this.canView(actor, order)) {
      return false;
    }
    if (order.status === target) {
      return false;
    }
    if (target === 'IN_PROGRESS' && order.assignedTechnicianId == null) {
      return false;
    }
    if (target === 'DONE' && !order.photoUrl) {
      return false;
    }
    if (actor.role === 'TECHNICIAN' && order.assignedTechnicianId !== actor.id) {
      return false;
    }
    return this.isAllowedTransition(actor.role, order.status, target);
  }

  assertCanChangeStatus(
    actor: Actor,
    order: Pick<WorkOrder, 'status' | 'assignedTechnicianId' | 'photoUrl'>,
    target: WorkOrderStatus,
  ): void {
    this.assertCanView(actor, order);
    if (order.status === target) {
      throw new ApiError(409, WorkOrderRules.ALREADY_IN_STATUS);
    }
    if (target === 'IN_PROGRESS' && order.assignedTechnicianId == null) {
      throw new ApiError(409, WorkOrderRules.ASSIGN_TECHNICIAN_FIRST);
    }
    if (target === 'DONE' && !order.photoUrl) {
      throw new ApiError(409, WorkOrderRules.PHOTO_REQUIRED_TO_COMPLETE);
    }
    if (actor.role === 'TECHNICIAN' && order.assignedTechnicianId !== actor.id) {
      throw new ApiError(403, WorkOrderRules.NOT_ALLOWED_TO_VIEW);
    }
    if (!this.isAllowedTransition(actor.role, order.status, target)) {
      throw new ApiError(409, WorkOrderRules.ILLEGAL_TRANSITION);
    }
  }

  /** Photo and pin: assigned technician, order IN_PROGRESS. */
  canAttachEvidence(
    actor: Actor,
    order: Pick<WorkOrder, 'status' | 'assignedTechnicianId'>,
  ): boolean {
    return (
      actor.role === 'TECHNICIAN' &&
      order.status === 'IN_PROGRESS' &&
      order.assignedTechnicianId === actor.id
    );
  }

  assertCanAttachPhoto(
    actor: Actor,
    order: Pick<WorkOrder, 'status' | 'assignedTechnicianId'>,
  ): void {
    this.assertCanAttachEvidence(actor, order, WorkOrderRules.ONLY_TECHNICIANS_PHOTO);
  }

  assertCanSetLocation(
    actor: Actor,
    order: Pick<WorkOrder, 'status' | 'assignedTechnicianId'>,
  ): void {
    this.assertCanAttachEvidence(actor, order, WorkOrderRules.ONLY_TECHNICIANS_LOCATION);
  }

  assertValidCoordinates(lat: number, lng: number): void {
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new ApiError(400, 'lat must be between -90 and 90');
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new ApiError(400, 'lng must be between -180 and 180');
    }
  }

  /** Status targets the actor may request from the current order (for UI). */
  allowedStatusTargets(
    actor: Actor,
    order: Pick<WorkOrder, 'status' | 'assignedTechnicianId' | 'photoUrl'>,
  ): WorkOrderStatus[] {
    const candidates: WorkOrderStatus[] = ['PENDING', 'IN_PROGRESS', 'DONE'];
    return candidates.filter((target) => this.canChangeStatus(actor, order, target));
  }

  isAllowedTransition(role: UserRole, current: WorkOrderStatus, target: WorkOrderStatus): boolean {
    if (role === 'TECHNICIAN') {
      if (current === 'PENDING') {
        return target === 'IN_PROGRESS';
      }
      if (current === 'IN_PROGRESS') {
        return target === 'DONE';
      }
      return false;
    }
    if (current === 'PENDING') {
      return target === 'IN_PROGRESS';
    }
    if (current === 'DONE') {
      return target === 'PENDING';
    }
    return false;
  }

  private assertCanAttachEvidence(
    actor: Actor,
    order: Pick<WorkOrder, 'status' | 'assignedTechnicianId'>,
    roleMessage: string,
  ): void {
    this.assertCanView(actor, order);
    if (actor.role !== 'TECHNICIAN') {
      throw new ApiError(403, roleMessage);
    }
    if (order.assignedTechnicianId !== actor.id) {
      throw new ApiError(403, WorkOrderRules.NOT_ALLOWED_TO_VIEW);
    }
    if (order.status !== 'IN_PROGRESS') {
      throw new ApiError(409, WorkOrderRules.EVIDENCE_ONLY_IN_PROGRESS);
    }
  }
}
