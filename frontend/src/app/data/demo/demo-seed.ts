import type { WorkOrderDetail } from '../../domain/models/work-order';
import type { WorkOrderPriority } from '../../domain/models/work-order-priority';
import type { WorkOrderStatus } from '../../domain/models/work-order-status';
import { DEMO_SUPERVISOR, DEMO_TECHNICIAN } from './demo-users';

/** 1×1 PNG as data URL (same idea as backend placeholder bytes). */
export const DEMO_PLACEHOLDER_PHOTO_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export const DEMO_SEED_TARGET = 50;

const TITLES = [
  'Revisión de tablero',
  'Cambio de medidor',
  'Inspección de conexión',
  'Reparación de luminaria',
  'Verificación de tensión',
  'Instalación de interruptor',
  'Control de transformador',
  'Relevamiento de acometida',
  'Mantenimiento de caja',
  'Prueba de diferencial',
];

const SITES = [
  'Av. Colón 1200',
  'Bv. San Juan 450',
  'Calle 25 de Mayo 80',
  'Av. Rafael Núñez 2100',
  'Calle Obispo Trejo 55',
  'Av. Fuerza Aérea 800',
  'Calle Dean Funes 300',
  'Av. Vélez Sársfield 1500',
  'Calle Ituzaingó 90',
  'Av. Circunvalación km 4',
];

/**
 * Seed board mirroring {@code WorkOrderSeeder}: 3 showcase orders + bulk to 50.
 */
export function buildDemoSeedOrders(): WorkOrderDetail[] {
  const t0 = '2026-09-18T10:00:00.000Z';
  const t1 = '2026-09-18T11:00:00.000Z';
  const t2 = '2026-09-18T12:00:00.000Z';
  const t3 = '2026-09-18T13:00:00.000Z';
  const t4 = '2026-09-18T14:00:00.000Z';

  const freePending: WorkOrderDetail = {
    id: 1,
    title: 'Revision de tablero',
    site: 'Av. Colon 1200',
    instruction: 'Revisar tablero general y reportar fallas visibles.',
    priority: 'HIGH',
    status: 'PENDING',
    assignedTechnicianId: null,
    assignedTechnicianEmail: null,
    photoUrl: null,
    lat: null,
    lng: null,
    createdAt: t0,
    updatedAt: t0,
    statusHistory: [
      {
        fromStatus: null,
        toStatus: 'PENDING',
        changedByEmail: DEMO_SUPERVISOR.email,
        changedAt: t0,
      },
    ],
  };

  const inProgress: WorkOrderDetail = {
    id: 2,
    title: 'Cambio de medidor',
    site: 'Bv. San Juan 450',
    instruction: 'Reemplazar medidor y dejar foto del numero nuevo.',
    priority: 'NORMAL',
    status: 'IN_PROGRESS',
    assignedTechnicianId: DEMO_TECHNICIAN.id,
    assignedTechnicianEmail: DEMO_TECHNICIAN.email,
    photoUrl: null,
    lat: -31.4201,
    lng: -64.1888,
    createdAt: t1,
    updatedAt: t2,
    statusHistory: [
      {
        fromStatus: null,
        toStatus: 'PENDING',
        changedByEmail: DEMO_SUPERVISOR.email,
        changedAt: t1,
      },
      {
        fromStatus: 'PENDING',
        toStatus: 'IN_PROGRESS',
        changedByEmail: DEMO_SUPERVISOR.email,
        changedAt: t2,
      },
    ],
  };

  const done: WorkOrderDetail = {
    id: 3,
    title: 'Inspeccion de conexion',
    site: 'Calle 25 de Mayo 80',
    instruction: 'Verificar conexion domiciliaria y documentar con foto.',
    priority: 'NORMAL',
    status: 'DONE',
    assignedTechnicianId: DEMO_TECHNICIAN.id,
    assignedTechnicianEmail: DEMO_TECHNICIAN.email,
    photoUrl: DEMO_PLACEHOLDER_PHOTO_DATA_URL,
    lat: -31.4167,
    lng: -64.1833,
    createdAt: t1,
    updatedAt: t4,
    statusHistory: [
      {
        fromStatus: null,
        toStatus: 'PENDING',
        changedByEmail: DEMO_SUPERVISOR.email,
        changedAt: t1,
      },
      {
        fromStatus: 'PENDING',
        toStatus: 'IN_PROGRESS',
        changedByEmail: DEMO_TECHNICIAN.email,
        changedAt: t3,
      },
      {
        fromStatus: 'IN_PROGRESS',
        toStatus: 'DONE',
        changedByEmail: DEMO_TECHNICIAN.email,
        changedAt: t4,
      },
    ],
  };

  const orders: WorkOrderDetail[] = [freePending, inProgress, done];

  for (let index = 4; index <= DEMO_SEED_TARGET; index++) {
    const assign = index % 3 !== 0;
    const priority: WorkOrderPriority = index % 5 === 0 ? 'HIGH' : 'NORMAL';
    const lane = index % 4;
    let status: WorkOrderStatus = 'PENDING';
    if (lane === 1 && assign) {
      status = 'IN_PROGRESS';
    } else if (lane === 2 && assign) {
      status = 'DONE';
    }

    const createdAt = `2026-09-18T${String(10 + (index % 10)).padStart(2, '0')}:00:00.000Z`;
    const updatedAt = `2026-09-18T${String(10 + (index % 10)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}:00.000Z`;

    orders.push({
      id: index,
      title: `${TITLES[index % TITLES.length]} #${index}`,
      site: SITES[index % SITES.length],
      instruction: `Orden de demo #${index} para paginación y búsqueda.`,
      priority,
      status,
      assignedTechnicianId: assign ? DEMO_TECHNICIAN.id : null,
      assignedTechnicianEmail: assign ? DEMO_TECHNICIAN.email : null,
      photoUrl: status === 'DONE' ? DEMO_PLACEHOLDER_PHOTO_DATA_URL : null,
      lat: null,
      lng: null,
      createdAt,
      updatedAt,
      statusHistory: [
        {
          fromStatus: null,
          toStatus: 'PENDING',
          changedByEmail: DEMO_SUPERVISOR.email,
          changedAt: createdAt,
        },
      ],
    });
  }

  return orders;
}
