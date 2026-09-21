import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { AppShellComponent } from './layout/app-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: 'orders',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/orders/order-list.page').then(
            (m) => m.OrderListPage,
          ),
      },
      {
        path: 'orders/new',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/orders/order-create.page').then(
            (m) => m.OrderCreatePage,
          ),
      },
      {
        path: 'orders/:id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/orders/order-detail.page').then(
            (m) => m.OrderDetailPage,
          ),
      },
      {
        path: '',
        redirectTo: 'orders',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'orders',
  },
];
