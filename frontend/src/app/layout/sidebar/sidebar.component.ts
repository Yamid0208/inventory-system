import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { AlertService } from '../../core/services/alert.service';
import { UserRole } from '../../core/auth/models/auth.models';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: string;
  allowedRoles: UserRole[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  private router = inject(Router);
  authService = inject(AuthService);
  sidebarService = inject(SidebarService);
  alertService = inject(AlertService, { optional: true });

  get navItems(): NavItem[] {
    const role: UserRole = this.authService.currentUser()?.role || 'Seller';
    const items: NavItem[] = [
      { label: 'Panel Principal', route: '/dashboard', icon: 'grid', allowedRoles: ['SuperAdmin', 'Admin', 'Warehouse', 'Seller'] },
      { label: 'Clientes & Almacenes', route: '/warehouses', icon: 'building', allowedRoles: ['SuperAdmin'] },
      { label: 'Productos', route: '/products', icon: 'tag', allowedRoles: ['SuperAdmin', 'Admin', 'Warehouse', 'Seller'] },
      { label: 'Inventario / Kardex', route: '/inventory', icon: 'box', allowedRoles: ['SuperAdmin', 'Admin', 'Warehouse'] },
      { label: 'Ventas', route: '/sales', icon: 'shopping-bag', allowedRoles: ['SuperAdmin', 'Admin', 'Seller'] },
      { label: 'Compras', route: '/purchases', icon: 'truck', allowedRoles: ['SuperAdmin', 'Admin', 'Warehouse'] },
      { label: 'Clientes', route: '/customers', icon: 'user', allowedRoles: ['SuperAdmin', 'Admin', 'Seller'] },
      { label: 'Categorías & Prov.', route: '/directory', icon: 'folder', allowedRoles: ['SuperAdmin', 'Admin', 'Warehouse'] },
      { label: 'Reportes', route: '/reports', icon: 'chart', allowedRoles: ['SuperAdmin', 'Admin'] },
      {
        label: 'Alertas',
        route: '/alerts',
        icon: 'bell',
        badge: this.alertService?.hasUnreadAlerts()
          ? (this.alertService.unreadCount() > 0 ? (this.alertService.unreadCount() > 9 ? '9+' : `${this.alertService.unreadCount()}`) : '!')
          : undefined,
        allowedRoles: ['SuperAdmin', 'Admin', 'Warehouse']
      },
      { label: 'Auditoría', route: '/audit', icon: 'shield', allowedRoles: ['SuperAdmin'] },
      {
        label: role === 'Admin' ? 'Empleados de Sede' : 'Usuarios del Sistema',
        route: '/users',
        icon: 'users',
        allowedRoles: ['SuperAdmin', 'Admin']
      }
    ];

    return items.filter(item => item.allowedRoles.includes(role));
  }

  get userRole(): UserRole {
    return this.authService.currentUser()?.role || 'Seller';
  }

  get canAccessSettings(): boolean {
    return this.userRole === 'SuperAdmin' || this.userRole === 'Admin';
  }

  isActive(route: string): boolean {
    if (route.includes('?')) {
      const baseRoute = route.split('?')[0];
      return this.router.url.startsWith(baseRoute);
    }
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  onNavClick(): void {
    this.sidebarService.close();
  }
}
