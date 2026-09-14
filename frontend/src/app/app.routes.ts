import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { roleGuard } from './core/auth/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'warehouses',
        loadComponent: () => import('./features/warehouses/warehouses.component').then(m => m.WarehousesComponent),
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin'] }
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent),
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin', 'Warehouse', 'Seller'] }
      },
      {
        path: 'directory',
        loadComponent: () => import('./features/directory/directory.component').then(m => m.DirectoryComponent),
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin', 'Warehouse'] }
      },
      {
        path: 'inventory',
        loadComponent: () => import('./features/inventory/inventory.component').then(m => m.InventoryComponent),
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin', 'Warehouse'] }
      },
      {
        path: 'purchases',
        loadComponent: () => import('./features/purchases/purchases.component').then(m => m.PurchasesComponent),
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin', 'Warehouse'] }
      },
      {
        path: 'sales',
        loadComponent: () => import('./features/sales/sales.component').then(m => m.SalesComponent),
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin', 'Seller'] }
      },
      {
        path: 'customers',
        loadComponent: () => import('./features/customers/customers.component').then(m => m.CustomersComponent),
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin', 'Seller'] }
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent),
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin'] }
      },
      {
        path: 'alerts',
        loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent),
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin', 'Warehouse'] }
      },
      {
        path: 'audit',
        loadComponent: () => import('./features/audit/audit.component').then(m => m.AuditComponent),
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin'] }
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin'] }
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin'] }
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
