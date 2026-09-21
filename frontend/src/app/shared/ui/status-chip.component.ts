import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonBadge } from '@ionic/angular';

import { PRIORITY_LABELS, statusDisplayLabel } from '../../domain/labels';
import type { WorkOrderPriority } from '../../domain/models/work-order-priority';
import type { WorkOrderStatus } from '../../domain/models/work-order-status';

@Component({
  selector: 'app-status-chip',
  template: `<ion-badge [color]="color()">{{ label() }}</ion-badge>`,
  styles: `
    ion-badge {
      font-size: 1rem;
      font-weight: 700;
      padding: 0.55rem 0.75rem;
      min-height: var(--fw-chip-min, 48px);
      display: inline-flex;
      align-items: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonBadge],
})
export class StatusChipComponent {
  readonly status = input.required<WorkOrderStatus>();
  /** When null/undefined and status is PENDING, chip shows "Sin asignar". */
  readonly assignedTechnicianId = input<number | null>(null);

  label(): string {
    return statusDisplayLabel(this.status(), this.assignedTechnicianId());
  }

  color(): string {
    if (this.status() === 'PENDING' && this.assignedTechnicianId() == null) {
      return 'medium';
    }
    switch (this.status()) {
      case 'PENDING':
        return 'warning';
      case 'IN_PROGRESS':
        return 'primary';
      case 'DONE':
        return 'success';
    }
  }
}

/** Only HIGH priority is shown (ADR 002: normal = no chip). */
@Component({
  selector: 'app-priority-chip',
  template: `
    @if (priority() === 'HIGH') {
      <ion-badge color="danger">{{ label() }}</ion-badge>
    }
  `,
  styles: `
    ion-badge {
      font-size: 1rem;
      font-weight: 700;
      padding: 0.55rem 0.75rem;
      min-height: var(--fw-chip-min, 48px);
      display: inline-flex;
      align-items: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonBadge],
})
export class PriorityChipComponent {
  readonly priority = input.required<WorkOrderPriority>();

  label(): string {
    return PRIORITY_LABELS[this.priority()];
  }
}
