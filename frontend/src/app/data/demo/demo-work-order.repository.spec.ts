import { ApiError } from '../../domain/api-error';
import { WorkOrderRules } from '../../domain/work-order.rules';
import { DEMO_PLACEHOLDER_PHOTO_DATA_URL, DEMO_SEED_TARGET } from './demo-seed';
import {
  authenticateDemoUser,
  DEMO_SUPERVISOR,
  DEMO_TECHNICIAN_ACTOR,
} from './demo-users';
import { DemoWorkOrderRepository } from './demo-work-order.repository';

describe('DemoWorkOrderRepository', () => {
  const supervisor = DEMO_SUPERVISOR;
  const technician = DEMO_TECHNICIAN_ACTOR;

  function emptyRepo(): DemoWorkOrderRepository {
    return new DemoWorkOrderRepository([{ id: 2, email: 'tecnico@demo.com' }]);
  }

  describe('seed', () => {
    it('starts with showcase orders plus bulk seed for pagination', async () => {
      const repo = DemoWorkOrderRepository.withSeed();
      const listed = await repo.list(supervisor, { size: DEMO_SEED_TARGET, sort: 'id,asc' });

      expect(listed.totalElements).toBe(DEMO_SEED_TARGET);
      expect(listed.items).toHaveLength(DEMO_SEED_TARGET);

      const free = listed.items.find((o) => o.title === 'Revision de tablero')!;
      expect(free.status).toBe('PENDING');
      expect(free.priority).toBe('HIGH');
      expect(free.assignedTechnicianId).toBeNull();

      const inProgress = await repo.get(supervisor, 2);
      expect(inProgress.status).toBe('IN_PROGRESS');
      expect(inProgress.lat).toBe(-31.4201);
      expect(inProgress.lng).toBe(-64.1888);
      expect(inProgress.statusHistory).toHaveLength(2);

      const done = await repo.get(supervisor, 3);
      expect(done.status).toBe('DONE');
      expect(done.photoUrl).toBe(DEMO_PLACEHOLDER_PHOTO_DATA_URL);
      expect(done.statusHistory).toHaveLength(3);
    });

    it('hides another technician order from the technician list', async () => {
      const repo = DemoWorkOrderRepository.withSeed();
      const listed = await repo.list(technician, { size: DEMO_SEED_TARGET });
      expect(listed.items.every((o) => o.assignedTechnicianId === null || o.assignedTechnicianId === 2)).toBe(
        true,
      );
      expect(listed.totalElements).toBe(DEMO_SEED_TARGET);
    });
  });

  describe('visibility and errors', () => {
    it('returns 404 for missing id and 403 for foreign assigned order', async () => {
      const withOther = new DemoWorkOrderRepository([
        { id: 2, email: 'tecnico@demo.com' },
        { id: 3, email: 'otro@demo.com' },
      ]);
      const created = await withOther.create(supervisor, {
        title: 'De otro',
        site: 'Sitio',
        instruction: 'No mirar',
        priority: 'NORMAL',
        assignedTechnicianId: 3,
        lat: -34.6037,
        lng: -58.3816,
      });

      await expect(withOther.get(technician, 999)).rejects.toEqual(
        new ApiError(404, 'Work order not found'),
      );
      await expect(withOther.get(technician, created.id)).rejects.toEqual(
        new ApiError(403, WorkOrderRules.NOT_ALLOWED_TO_VIEW),
      );
    });

    it('filters list by status and priority', async () => {
      const repo = DemoWorkOrderRepository.withSeed();
      const high = await repo.list(supervisor, { priority: 'HIGH', size: DEMO_SEED_TARGET });
      expect(high.totalElements).toBeGreaterThanOrEqual(1);
      expect(high.items.some((o) => o.title === 'Revision de tablero')).toBe(true);
      expect(high.items.every((o) => o.priority === 'HIGH')).toBe(true);

      const pending = await repo.list(supervisor, { status: 'PENDING', size: DEMO_SEED_TARGET });
      expect(pending.items.every((o) => o.status === 'PENDING')).toBe(true);
    });

    it('searches accent-insensitively and paginates', async () => {
      const repo = DemoWorkOrderRepository.withSeed();
      await repo.create(supervisor, {
        title: 'Inspección eléctrica',
        site: 'Córdoba',
        instruction: 'Medición',
        priority: 'NORMAL',
        lat: -34.6037,
        lng: -58.3816,
      });

      const byTitle = await repo.list(supervisor, { q: 'inspeccion', sort: 'title,asc', size: 20 });
      expect(byTitle.totalElements).toBeGreaterThanOrEqual(1);
      expect(byTitle.items.some((o) => /inspecci[oó]n/i.test(o.title))).toBe(true);

      const page0 = await repo.list(supervisor, { page: 0, size: 10, sort: 'title,asc' });
      expect(page0.items).toHaveLength(10);
      expect(page0.totalPages).toBeGreaterThanOrEqual(5);
    });
  });

  describe('domain-rules scenarios', () => {
    it('technician claims a free order and stays PENDING', async () => {
      const repo = emptyRepo();
      const created = await repo.create(supervisor, {
        title: 'Libre',
        site: 'Sitio',
        instruction: 'Tomar',
        priority: 'NORMAL',
        lat: -34.6037,
        lng: -58.3816,
      });

      const assigned = await repo.assign(technician, created.id);
      expect(assigned.status).toBe('PENDING');
      expect(assigned.assignedTechnicianId).toBe(2);
      expect(assigned.assignedTechnicianEmail).toBe('tecnico@demo.com');
    });

    it('returns 409 Assign a technician first when starting an unassigned order', async () => {
      const repo = emptyRepo();
      const created = await repo.create(supervisor, {
        title: 'Sin tecnico',
        site: 'Sitio',
        instruction: 'Asignar primero',
        priority: 'HIGH',
        lat: -34.6037,
        lng: -58.3816,
      });

      await expect(repo.changeStatus(technician, created.id, 'IN_PROGRESS')).rejects.toEqual(
        new ApiError(409, WorkOrderRules.ASSIGN_TECHNICIAN_FIRST),
      );
      await expect(repo.changeStatus(supervisor, created.id, 'IN_PROGRESS')).rejects.toEqual(
        new ApiError(409, WorkOrderRules.ASSIGN_TECHNICIAN_FIRST),
      );

      const detail = await repo.get(supervisor, created.id);
      expect(detail.status).toBe('PENDING');
      expect(detail.assignedTechnicianId).toBeNull();
    });
  });

  describe('photo and location', () => {
    it('lets assigned technician set photo and pin only while IN_PROGRESS', async () => {
      const repo = emptyRepo();
      const created = await repo.create(supervisor, {
        title: 'Con evidencia',
        site: 'Sitio',
        instruction: 'Foto y pin',
        priority: 'NORMAL',
        assignedTechnicianId: 2,
        lat: -34.6037,
        lng: -58.3816,
      });
      await repo.changeStatus(technician, created.id, 'IN_PROGRESS');

      const withPin = await repo.setLocation(technician, created.id, -31.4, -64.2);
      expect(withPin.lat).toBe(-31.4);
      expect(withPin.lng).toBe(-64.2);

      const withPhoto = await repo.uploadPhoto(
        technician,
        created.id,
        DEMO_PLACEHOLDER_PHOTO_DATA_URL,
      );
      expect(withPhoto.photoUrl).toBe(DEMO_PLACEHOLDER_PHOTO_DATA_URL);

      await expect(
        repo.uploadPhoto(technician, created.id, 'data:text/plain;base64,YQ=='),
      ).rejects.toEqual(new ApiError(400, 'File must be an image'));
    });

    it('rejects photo when order is not IN_PROGRESS', async () => {
      const repo = DemoWorkOrderRepository.withSeed();
      await expect(
        repo.uploadPhoto(technician, 3, DEMO_PLACEHOLDER_PHOTO_DATA_URL),
      ).rejects.toEqual(new ApiError(409, WorkOrderRules.EVIDENCE_ONLY_IN_PROGRESS));
    });
  });

  describe('reopen', () => {
    it('supervisor reopen keeps technician photo and pin', async () => {
      const repo = DemoWorkOrderRepository.withSeed();
      const before = await repo.get(supervisor, 3);
      const reopened = await repo.changeStatus(supervisor, 3, 'PENDING');

      expect(reopened.status).toBe('PENDING');
      expect(reopened.assignedTechnicianId).toBe(before.assignedTechnicianId);
      expect(reopened.photoUrl).toBe(before.photoUrl);
      expect(reopened.lat).toBe(before.lat);
      expect(reopened.lng).toBe(before.lng);

      const detail = await repo.get(supervisor, 3);
      expect(detail.statusHistory.at(-1)).toMatchObject({
        fromStatus: 'DONE',
        toStatus: 'PENDING',
        changedByEmail: supervisor.email,
      });
    });
  });

  describe('authenticateDemoUser', () => {
    it('accepts only the two demo users with password demo', () => {
      expect(authenticateDemoUser('supervisor@demo.com', 'demo')).toEqual(supervisor);
      expect(authenticateDemoUser('tecnico@demo.com', 'demo')).toEqual(technician);
      expect(authenticateDemoUser('supervisor@demo.com', 'wrong')).toBeNull();
      expect(authenticateDemoUser('otro@demo.com', 'demo')).toBeNull();
    });
  });

  it('lists technicians for supervisor only', async () => {
    const repo = DemoWorkOrderRepository.withSeed();
    await expect(repo.listTechnicians(supervisor)).resolves.toEqual([
      { id: 2, email: 'tecnico@demo.com' },
    ]);
    await expect(repo.listTechnicians(technician)).rejects.toEqual(
      new ApiError(403, WorkOrderRules.ONLY_SUPERVISORS_CREATE),
    );
  });
});
