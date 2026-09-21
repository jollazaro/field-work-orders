import type { Provider } from '@angular/core';

import { environment } from '../../environments/environment';
import { DemoWorkOrderRepository } from './demo/demo-work-order.repository';
import { HttpWorkOrderRepository } from './http/http-work-order.repository';
import { WORK_ORDER_REPOSITORY } from './work-order.repository';

/**
 * Binds {@link WORK_ORDER_REPOSITORY}: demo (in-memory) when `apiBaseUrl` is empty,
 * otherwise the HTTP adapter against Spring.
 */
export function provideWorkOrderRepository(): Provider[] {
  if (environment.apiBaseUrl) {
    return [
      {
        provide: WORK_ORDER_REPOSITORY,
        useClass: HttpWorkOrderRepository,
      },
    ];
  }

  return [
    {
      provide: WORK_ORDER_REPOSITORY,
      useFactory: () => DemoWorkOrderRepository.withSeed(),
    },
  ];
}
