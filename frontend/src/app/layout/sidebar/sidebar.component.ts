import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { AlertService } from '../../core/services/alert.service';
import { LegalService } from '../../core/legal/services/legal.service';
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
  legalService = inject(LegalService);

  openLegalModal(): void {
    this.sidebarService.close();
    this.legalService.openLegalViewer();
  }

  get navItems(): NavItem[] {
    const role: UserRole = this.authService.currentUser()?.role || 'Seller';

    // Para SuperAdmin, únicamente mostrar Usuarios del Sistema y Auditoría
    if (role === 'SuperAdmin') {
      return [
        { label: 'Usuarios del Sistema', route: '/users', icon: 'users', allowedRoles: ['SuperAdmin'] },
        { label: 'Auditoría', route: '/audit', icon: 'shield', allowedRoles: ['SuperAdmin'] }
      ];
    }

    const items: NavItem[] = [
      { label: 'Panel Principal', route: '/dashboard', icon: 'grid', allowedRoles: ['Admin', 'Warehouse', 'Seller'] },
      { label: role === 'Admin' ? 'Sedes / Almacenes' : 'Clientes & Almacenes', route: '/warehouses', icon: 'building', allowedRoles: ['Admin'] },
      { label: 'Productos', route: '/products', icon: 'tag', allowedRoles: ['Admin', 'Warehouse', 'Seller'] },
      { label: 'Inventario / Kardex', route: '/inventory', icon: 'box', allowedRoles: ['Admin', 'Warehouse'] },
      { label: 'Caja POS', route: '/cash-register', icon: 'cash', allowedRoles: ['Admin', 'Seller'] },
      { label: 'Ventas', route: '/sales', icon: 'shopping-bag', allowedRoles: ['Admin', 'Seller'] },
      { label: 'Compras', route: '/purchases', icon: 'truck', allowedRoles: ['Admin', 'Warehouse'] },
      { label: 'Clientes', route: '/customers', icon: 'user', allowedRoles: ['Admin', 'Seller'] },
      { label: 'Categorías & Prov.', route: '/directory', icon: 'folder', allowedRoles: ['Admin', 'Warehouse'] },
      { label: 'Reportes', route: '/reports', icon: 'chart', allowedRoles: ['Admin'] },
      {
        label: 'Alertas',
        route: '/alerts',
        icon: 'bell',
        badge: this.alertService?.hasUnreadAlerts()
          ? (this.alertService.unreadCount() > 0 ? (this.alertService.unreadCount() > 9 ? '9+' : `${this.alertService.unreadCount()}`) : '!')
          : undefined,
        allowedRoles: ['Admin', 'Warehouse']
      },
      { label: 'Auditoría', route: '/audit', icon: 'shield', allowedRoles: ['Admin'] },
      {
        label: 'Empleados de Sede',
        route: '/users',
        icon: 'users',
        allowedRoles: ['Admin']
      }
    ];

    return items.filter(item => item.allowedRoles.includes(role));
  }

  get userRole(): UserRole {
    return this.authService.currentUser()?.role || 'Seller';
  }

  get canAccessSettings(): boolean {
    return this.userRole === 'Admin';
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
