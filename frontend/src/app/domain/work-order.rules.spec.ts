import { ApiError } from './api-error';
import type { Actor } from './models/actor';
import type { WorkOrder } from './models/work-order';
import { WorkOrderRules } from './work-order.rules';

describe('WorkOrderRules', () => {
  const rules = new WorkOrderRules();

  const supervisor: Actor = {
    id: 1,
    email: 'supervisor@demo.com',
    role: 'SUPERVISOR',
  };
  const technician: Actor = {
    id: 2,
    email: 'tecnico@demo.com',
    role: 'TECHNICIAN',
  };
  const otherTech: Actor = {
    id: 3,
    email: 'otro@demo.com',
    role: 'TECHNICIAN',
  };

  function order(
    overrides: Partial<Pick<WorkOrder, 'status' | 'assignedTechnicianId' | 'photoUrl'>> = {},
  ): Pick<WorkOrder, 'status' | 'assignedTechnicianId' | 'photoUrl'> {
    return {
      status: 'PENDING',
      assignedTechnicianId: null,
      photoUrl: null,
      ...overrides,
    };
  }

  describe('visibility', () => {
    it('lets supervisor see every order', () => {
      expect(rules.canView(supervisor, order({ assignedTechnicianId: 99 }))).toBe(true);
    });

    it('lets technician see unassigned and own orders only', () => {
      expect(rules.canView(technician, order())).toBe(true);
      expect(rules.canView(technician, order({ assignedTechnicianId: 2 }))).toBe(true);
      expect(rules.canView(technician, order({ assignedTechnicianId: 3 }))).toBe(false);
    });

    it('throws 403 when technician views another technician order', () => {
      expect(() =>
        rules.assertCanView(technician, order({ assignedTechnicianId: 3 })),
      ).toThrow(new ApiError(403, WorkOrderRules.NOT_ALLOWED_TO_VIEW));
    });
  });

  describe('create', () => {
    it('allows only supervisors', () => {
      expect(rules.canCreate(supervisor)).toBe(true);
      expect(rules.canCreate(technician)).toBe(false);
      expect(() => rules.assertCanCreate(technician)).toThrow(
        new ApiError(403, WorkOrderRules.ONLY_SUPERVISORS_CREATE),
      );
    });
  });

  describe('assignment', () => {
    it('lets technician claim a free pending order', () => {
      const free = order();
      expect(rules.canAssign(technician, free)).toBe(true);
      expect(() => rules.assertCanAssign(technician, free)).not.toThrow();
    });

    it('returns 403 when technician cannot see an order assigned to another', () => {
      const assignedToOther = order({ assignedTechnicianId: otherTech.id });
      expect(rules.canAssign(technician, assignedToOther)).toBe(false);
      expect(() => rules.assertCanAssign(technician, assignedToOther)).toThrow(
        new ApiError(403, WorkOrderRules.NOT_ALLOWED_TO_VIEW),
      );
    });

    it('returns 409 when technician tries to claim an order already assigned to them', () => {
      const own = order({ assignedTechnicianId: technician.id });
      expect(rules.canAssign(technician, own)).toBe(false);
      expect(() => rules.assertCanAssign(technician, own)).toThrow(
        new ApiError(409, WorkOrderRules.ALREADY_ASSIGNED),
      );
    });

    it('requires technicianId for supervisor assignment', () => {
      expect(() => rules.assertCanAssign(supervisor, order(), null)).toThrow(
        new ApiError(400, WorkOrderRules.TECHNICIAN_ID_REQUIRED),
      );
      expect(rules.canAssign(supervisor, order(), 2)).toBe(true);
    });

    it('rejects assignment when not pending', () => {
      expect(() =>
        rules.assertCanAssign(supervisor, order({ status: 'IN_PROGRESS' }), 2),
      ).toThrow(new ApiError(409, WorkOrderRules.MUST_BE_PENDING_TO_ASSIGN));
    });
  });

  describe('status transitions', () => {
    it('blocks PENDING → IN_PROGRESS without technician for any role', () => {
      const free = order();
      expect(rules.canChangeStatus(supervisor, free, 'IN_PROGRESS')).toBe(false);
      expect(rules.canChangeStatus(technician, free, 'IN_PROGRESS')).toBe(false);
      expect(() => rules.assertCanChangeStatus(technician, free, 'IN_PROGRESS')).toThrow(
        new ApiError(409, WorkOrderRules.ASSIGN_TECHNICIAN_FIRST),
      );
      expect(() => rules.assertCanChangeStatus(supervisor, free, 'IN_PROGRESS')).toThrow(
        new ApiError(409, WorkOrderRules.ASSIGN_TECHNICIAN_FIRST),
      );
    });

    it('lets assigned technician advance PENDING → IN_PROGRESS → DONE with photo', () => {
      const pending = order({ assignedTechnicianId: 2 });
      expect(rules.canChangeStatus(technician, pending, 'IN_PROGRESS')).toBe(true);

      const inProgress = order({ status: 'IN_PROGRESS', assignedTechnicianId: 2 });
      expect(rules.canChangeStatus(technician, inProgress, 'DONE')).toBe(false);
      expect(() => rules.assertCanChangeStatus(technician, inProgress, 'DONE')).toThrow(
        new ApiError(409, WorkOrderRules.PHOTO_REQUIRED_TO_COMPLETE),
      );

      const withPhoto = order({
        status: 'IN_PROGRESS',
        assignedTechnicianId: 2,
        photoUrl: 'data:image/png;base64,xx',
      });
      expect(rules.canChangeStatus(technician, withPhoto, 'DONE')).toBe(true);
      expect(rules.allowedStatusTargets(technician, pending)).toEqual(['IN_PROGRESS']);
    });

    it('lets supervisor start assigned pending and reopen done', () => {
      const pending = order({ assignedTechnicianId: 2 });
      expect(rules.canChangeStatus(supervisor, pending, 'IN_PROGRESS')).toBe(true);

      const done = order({ status: 'DONE', assignedTechnicianId: 2 });
      expect(rules.canChangeStatus(supervisor, done, 'PENDING')).toBe(true);
      expect(rules.canChangeStatus(technician, done, 'PENDING')).toBe(false);
    });

    it('forbids supervisor marking DONE and technician reopening', () => {
      const inProgress = order({ status: 'IN_PROGRESS', assignedTechnicianId: 2 });
      expect(() => rules.assertCanChangeStatus(supervisor, inProgress, 'DONE')).toThrow(
        new ApiError(409, WorkOrderRules.ILLEGAL_TRANSITION),
      );

      const done = order({ status: 'DONE', assignedTechnicianId: 2 });
      expect(() => rules.assertCanChangeStatus(technician, done, 'PENDING')).toThrow(
        new ApiError(409, WorkOrderRules.ILLEGAL_TRANSITION),
      );
    });

    it('forbids technician changing status on someone else order after view check', () => {
      // Visibility already blocks; assert mirrors API 403 for assigned-to-other.
      expect(() =>
        rules.assertCanChangeStatus(
          technician,
          order({ assignedTechnicianId: otherTech.id }),
          'IN_PROGRESS',
        ),
      ).toThrow(new ApiError(403, WorkOrderRules.NOT_ALLOWED_TO_VIEW));
    });
  });

  describe('photo and location', () => {
    it('allows only assigned technician while IN_PROGRESS', () => {
      const inProgress = order({ status: 'IN_PROGRESS', assignedTechnicianId: 2 });
      expect(rules.canAttachEvidence(technician, inProgress)).toBe(true);
      expect(rules.canAttachEvidence(supervisor, inProgress)).toBe(false);
      expect(rules.canAttachEvidence(otherTech, inProgress)).toBe(false);

      const pending = order({ assignedTechnicianId: 2 });
      expect(() => rules.assertCanAttachPhoto(technician, pending)).toThrow(
        new ApiError(409, WorkOrderRules.EVIDENCE_ONLY_IN_PROGRESS),
      );
    });

    it('validates lat/lng ranges', () => {
      expect(() => rules.assertValidCoordinates(91, 0)).toThrow(ApiError);
      expect(() => rules.assertValidCoordinates(0, 181)).toThrow(ApiError);
      expect(() => rules.assertValidCoordinates(-31.42, -64.18)).not.toThrow();
    });
  });
});
