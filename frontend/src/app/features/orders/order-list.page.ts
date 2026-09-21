import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

import { FeedbackService } from '../../core/feedback/feedback.service';
import type { WorkOrder } from '../../domain/models/work-order';
import type { WorkOrderPriority } from '../../domain/models/work-order-priority';
import type { WorkOrderStatus } from '../../domain/models/work-order-status';
import {
  personDisplayName,
  PRIORITY_LABELS,
  STATUS_LABELS,
  UNASSIGNED_FILTER,
  UNASSIGNED_LABEL,
} from '../../domain/labels';
import type { StatusFilterValue } from '../../domain/labels';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { ErrorBannerComponent } from '../../shared/ui/error-banner.component';
import {
  PriorityChipComponent,
  StatusChipComponent,
} from '../../shared/ui/status-chip.component';
import { WorkOrderFacade } from './work-order.facade';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-order-list-page',
  templateUrl: './order-list.page.html',
  styleUrls: ['./order-list.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonSearchbar,
    IonButton,
    IonFab,
    IonFabButton,
    IonIcon,
    IonSpinner,
    IonText,
    StatusChipComponent,
    PriorityChipComponent,
    EmptyStateComponent,
    ErrorBannerComponent,
  ],
})
export class OrderListPage implements ViewWillEnter {
  private readonly facade = inject(WorkOrderFacade);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);

  readonly statusLabels = STATUS_LABELS;
  readonly unassignedFilter = UNASSIGNED_FILTER;
  readonly unassignedLabel = UNASSIGNED_LABEL;
  readonly priorityLabels = PRIORITY_LABELS;
  readonly statuses: WorkOrderStatus[] = ['PENDING', 'IN_PROGRESS', 'DONE'];
  readonly priorities: WorkOrderPriority[] = ['NORMAL', 'HIGH'];
  readonly sortOptions = [
    { value: 'updatedAt,desc', label: 'Más recientes' },
    { value: 'updatedAt,asc', label: 'Más antiguas' },
    { value: 'title,asc', label: 'Título A–Z' },
    { value: 'title,desc', label: 'Título Z–A' },
    { value: 'priority,desc', label: 'Prioridad' },
    { value: 'status,asc', label: 'Estado' },
  ];

  readonly orders = signal<WorkOrder[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly statusFilter = signal<StatusFilterValue>('');
  readonly priorityFilter = signal<WorkOrderPriority | ''>('');
  readonly searchQuery = signal('');
  readonly sort = signal('updatedAt,desc');
  readonly page = signal(0);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly exporting = signal(false);
  readonly canCreate = computed(() => this.facade.canCreate());
  readonly listTitle = computed(() =>
    this.canCreate() ? 'Órdenes del día' : 'Mis órdenes',
  );
  readonly hasActiveFilters = computed(
    () =>
      this.statusFilter() !== '' ||
      this.priorityFilter() !== '' ||
      this.searchQuery().trim() !== '' ||
      this.sort() !== 'updatedAt,desc',
  );
  readonly canGoPrev = computed(() => this.page() > 0);
  readonly canGoNext = computed(() => this.page() + 1 < this.totalPages());
  readonly pageLabel = computed(() => {
    const total = this.totalElements();
    if (total === 0) {
      return '0 resultados';
    }
    const pages = Math.max(this.totalPages(), 1);
    return `${total} · pág. ${this.page() + 1}/${pages}`;
  });

  constructor() {
    addIcons({ addOutline, chevronBackOutline, chevronForwardOutline });
  }

  /** Single load on enter (also refreshes when returning from detail). */
  ionViewWillEnter(): void {
    void this.reload();
  }

  clearFilters(): void {
    this.statusFilter.set('');
    this.priorityFilter.set('');
    this.searchQuery.set('');
    this.sort.set('updatedAt,desc');
    this.page.set(0);
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const status = this.statusFilter();
      const priority = this.priorityFilter();
      const q = this.searchQuery().trim();
      const unassigned = status === UNASSIGNED_FILTER ? true : undefined;
      const query = {
        status: status === '' || status === UNASSIGNED_FILTER ? undefined : status,
        priority: priority === '' ? undefined : priority,
        unassigned,
        q: q || undefined,
        page: this.page(),
        size: PAGE_SIZE,
        sort: this.sort(),
      } as const;

      let result = await this.facade.list(query);
      if (!Array.isArray(result.items)) {
        throw new Error('Unexpected list response shape');
      }
      if (result.totalPages > 0 && this.page() >= result.totalPages) {
        this.page.set(result.totalPages - 1);
        result = await this.facade.list({ ...query, page: this.page() });
      }

      this.orders.set(result.items ?? []);
      this.totalElements.set(result.totalElements ?? 0);
      this.totalPages.set(result.totalPages ?? 0);
    } catch (err) {
      this.error.set('No se pudieron cargar las órdenes.');
      await this.feedback.fromError(err);
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(value: string | null | undefined): void {
    this.searchQuery.set(value ?? '');
    this.page.set(0);
    void this.reload();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set((value || '') as StatusFilterValue);
    this.page.set(0);
    void this.reload();
  }

  onPriorityChange(value: string): void {
    this.priorityFilter.set((value || '') as WorkOrderPriority | '');
    this.page.set(0);
    void this.reload();
  }

  onSortChange(value: string): void {
    this.sort.set(value || 'updatedAt,desc');
    this.page.set(0);
    void this.reload();
  }

  async exportExcel(): Promise<void> {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);
    try {
      const status = this.statusFilter();
      const priority = this.priorityFilter();
      const q = this.searchQuery().trim();
      await this.facade.exportExcel({
        status: status === '' || status === UNASSIGNED_FILTER ? undefined : status,
        priority: priority === '' ? undefined : priority,
        unassigned: status === UNASSIGNED_FILTER ? true : undefined,
        q: q || undefined,
        sort: this.sort(),
      });
    } finally {
      this.exporting.set(false);
    }
  }

  goPrev(): void {
    if (!this.canGoPrev()) {
      return;
    }
    this.page.update((p) => p - 1);
    void this.reload();
  }

  goNext(): void {
    if (!this.canGoNext()) {
      return;
    }
    this.page.update((p) => p + 1);
    void this.reload();
  }

  openDetail(id: number): void {
    void this.router.navigate(['/orders', id]);
  }

  technicianLabel(order: WorkOrder): string {
    return personDisplayName(order.assignedTechnicianEmail);
  }
}
