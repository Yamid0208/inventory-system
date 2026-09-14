import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserAdminService } from '../../core/services/user-admin.service';
import { RoleService } from '../../core/services/role.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { RolePermissionMatrixItem } from '../../core/models/role.model';
import { Warehouse } from '../../core/models/warehouse.model';
import { AuthService } from '../../core/auth/services/auth.service';
import {
  UserDetail,
  CreateUserAdminRequest,
  UpdateUserAdminRequest,
  ResetUserPasswordRequest,
  UserAdminFilterParams
} from '../../core/models/user-admin.model';
import { UserModalComponent } from './components/user-modal/user-modal.component';
import { ResetPasswordModalComponent } from './components/reset-password-modal/reset-password-modal.component';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppPaginationComponent } from '../../shared/components/app-pagination/app-pagination.component';
import { PageChangeEvent } from '../../shared/models/pagination.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    UserModalComponent,
    ResetPasswordModalComponent,
    AppButtonComponent,
    AppPaginationComponent
  ],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  private userAdminService = inject(UserAdminService);
  private roleService = inject(RoleService);
  private warehouseService = inject(WarehouseService);
  private confirmationService = inject(ConfirmationService);
  authService = inject(AuthService);

  // Pestañas
  activeTab = signal<'users' | 'matrix'>('users');
  matrix = signal<RolePermissionMatrixItem[]>([]);
  loadingMatrix = signal<boolean>(false);

  users = signal<UserDetail[]>([]);
  loading = signal<boolean>(false);

  // Paginación
  totalCount = signal<number>(0);
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);

  // Filtros
  roleFilter = signal<string>('all');
  statusFilter = signal<string>('all');
  warehouseFilter = signal<string>('all');
  searchQuery = signal<string>('');
  warehouses = signal<Warehouse[]>([]);

  // Modales
  isUserModalOpen = signal<boolean>(false);
  selectedUserForEdit = signal<UserDetail | null>(null);
  selectedUserForPassword = signal<UserDetail | null>(null);
  modalLoading = signal<boolean>(false);
  modalError = signal<string | null>(null);

  // Estructura de módulos para la matriz
  readonly permissionModules = [
    {
      name: 'Catálogo de Productos',
      icon: 'box',
      permissions: [
        { code: 'Products:Read', label: 'Consultar Catálogo', desc: 'Ver productos, precios y categorías' },
        { code: 'Products:Write', label: 'Crear / Editar Producto', desc: 'Registrar y actualizar fichas de producto' },
        { code: 'Products:Delete', label: 'Eliminar Producto', desc: 'Baja lógica permanente de referencias' }
      ]
    },
    {
      name: 'Kardex e Inventario',
      icon: 'clipboard',
      permissions: [
        { code: 'Inventory:Read', label: 'Consultar Kardex', desc: 'Auditoría cronológica de movimientos' },
        { code: 'Inventory:Adjust', label: 'Ajuste Manual de Stock', desc: 'Mermas, conteos y calibraciones' }
      ]
    },
    {
      name: 'Compras y Proveedores',
      icon: 'shopping-bag',
      permissions: [
        { code: 'Purchases:Read', label: 'Ver Órdenes de Compra', desc: 'Listado y seguimiento a proveedores' },
        { code: 'Purchases:Create', label: 'Generar Orden de Compra', desc: 'Crear pedidos en borrador' },
        { code: 'Purchases:Receive', label: 'Recepción en Bodega', desc: 'Acreditar stock físico a almacén' },
        { code: 'Purchases:Cancel', label: 'Cancelar Orden', desc: 'Anular pedido antes de su recepción' }
      ]
    },
    {
      name: 'Ventas y Facturación',
      icon: 'credit-card',
      permissions: [
        { code: 'Sales:Read', label: 'Consultar Ventas', desc: 'Historial de facturas y cobros' },
        { code: 'Sales:Create', label: 'Registrar Venta Directa', desc: 'Punto de venta y débito de inventario' },
        { code: 'Sales:Cancel', label: 'Anulación / Devolución', desc: 'Restitución de existencias al almacén' }
      ]
    },
    {
      name: 'Usuarios y Seguridad',
      icon: 'users',
      permissions: [
        { code: 'Users:Read', label: 'Consultar Usuarios', desc: 'Directorio de accesos' },
        { code: 'Users:Write', label: 'Gestionar Cuentas y Roles', desc: 'Alta, edición, reset y desactivación' }
      ]
    },
    {
      name: 'Dashboard y Reportes',
      icon: 'chart',
      permissions: [
        { code: 'Dashboard:Read', label: 'Dashboard Ejecutivo', desc: 'KPIs, valuación y stock crítico en vivo' },
        { code: 'Reports:Export', label: 'Exportación de Datos', desc: 'Descarga de reportes CSV / Excel' }
      ]
    }
  ];

  ngOnInit(): void {
    if (this.authService.currentUser()?.role === 'SuperAdmin') {
      this.warehouseService.getWarehouses().subscribe({
        next: (data) => this.warehouses.set(data),
        error: () => {}
      });
    }
    this.loadUsers();
    this.loadMatrix();
  }

  switchTab(tab: 'users' | 'matrix'): void {
    this.activeTab.set(tab);
    if (tab === 'matrix' && this.matrix().length === 0) {
      this.loadMatrix();
    }
  }

  loadMatrix(): void {
    this.loadingMatrix.set(true);
    this.roleService.getMatrix().subscribe({
      next: (res) => {
        this.matrix.set(res);
        this.loadingMatrix.set(false);
      },
      error: () => this.loadingMatrix.set(false)
    });
  }

  hasRolePermission(roleCode: string, permCode: string): boolean {
    const roleItem = this.matrix().find(m => m.role.toLowerCase() === roleCode.toLowerCase());
    return roleItem ? roleItem.permissions.includes(permCode) : false;
  }

  loadUsers(): void {
    this.loading.set(true);

    const isActive = this.statusFilter() === 'all'
      ? undefined
      : (this.statusFilter() === 'active');

    const params: UserAdminFilterParams = {
      role: this.roleFilter(),
      isActive,
      search: this.searchQuery(),
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      warehouseId: this.warehouseFilter() === 'all' ? undefined : Number(this.warehouseFilter())
    };

    this.userAdminService.getUsers(params).subscribe({
      next: (res) => {
        this.users.set(res.items);
        this.totalCount.set(res.totalCount);
        this.pageNumber.set(res.pageNumber);
        this.pageSize.set(res.pageSize);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setRoleFilter(role: string): void {
    this.roleFilter.set(role);
    this.pageNumber.set(1);
    this.loadUsers();
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
    this.pageNumber.set(1);
    this.loadUsers();
  }

  setWarehouseFilter(warehouseId: string): void {
    this.warehouseFilter.set(warehouseId);
    this.pageNumber.set(1);
    this.loadUsers();
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.pageNumber.set(1);
    this.loadUsers();
  }

  onPaginationChange(event: PageChangeEvent): void {
    this.pageNumber.set(event.pageNumber);
    this.pageSize.set(event.pageSize);
    this.loadUsers();
  }

  openCreateModal(): void {
    this.selectedUserForEdit.set(null);
    this.modalError.set(null);
    this.isUserModalOpen.set(true);
  }

  openEditModal(user: UserDetail): void {
    this.selectedUserForEdit.set(user);
    this.modalError.set(null);
    this.isUserModalOpen.set(true);
  }

  openResetPasswordModal(user: UserDetail): void {
    this.selectedUserForPassword.set(user);
    this.modalError.set(null);
  }

  onSaveUser(payload: any): void {
    this.modalLoading.set(true);
    this.modalError.set(null);

    if (payload.id) {
      this.userAdminService.updateUser(payload.id, payload.request).subscribe({
        next: () => {
          this.modalLoading.set(false);
          this.isUserModalOpen.set(false);
          this.loadUsers();
        },
        error: (err) => {
          this.modalLoading.set(false);
          this.modalError.set(err.error?.detail || 'No se pudo actualizar el usuario.');
        }
      });
    } else {
      this.userAdminService.createUser(payload).subscribe({
        next: () => {
          this.modalLoading.set(false);
          this.isUserModalOpen.set(false);
          this.loadUsers();
        },
        error: (err) => {
          this.modalLoading.set(false);
          this.modalError.set(err.error?.detail || 'No se pudo crear el usuario.');
        }
      });
    }
  }

  onSavePassword(event: { id: number; request: ResetUserPasswordRequest }): void {
    this.modalLoading.set(true);
    this.userAdminService.resetPassword(event.id, event.request).subscribe({
      next: () => {
        this.modalLoading.set(false);
        this.selectedUserForPassword.set(null);
        alert('Contraseña restablecida exitosamente. Todas las sesiones anteriores fueron cerradas.');
      },
      error: (err) => {
        this.modalLoading.set(false);
        alert(err.error?.detail || 'Error al restablecer contraseña.');
      }
    });
  }

  async toggleStatus(user: UserDetail): Promise<void> {
    const action = user.isActive ? 'desactivar' : 'activar';
    const confirmed = await this.confirmationService.confirm({
      title: user.isActive ? '¿Desactivar Usuario?' : '¿Reactivar Usuario?',
      message: `¿Está seguro de ${action} al usuario '${user.fullName}'? ${user.isActive ? 'El usuario no podrá iniciar sesión.' : 'El usuario recuperará el acceso al sistema.'}`,
      confirmText: user.isActive ? 'Sí, desactivar' : 'Sí, reactivar',
      cancelText: 'Cancelar',
      variant: user.isActive ? 'danger' : 'primary'
    });
    if (!confirmed) return;

    this.userAdminService.toggleStatus(user.id).subscribe({
      next: () => this.loadUsers(),
      error: (err) => alert(err.error?.detail || `Error al ${action} usuario.`)
    });
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  getRoleBadge(role: string): { label: string; class: string } {
    switch (role) {
      case 'SuperAdmin':
        return { label: '👑 Super Admin', class: 'bg-amber-50 text-amber-800 border-amber-300 font-bold' };
      case 'Admin':
        return { label: 'Administrador Titular', class: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'Warehouse':
        return { label: 'Bodega / Almacén', class: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'Seller':
        return { label: 'Ventas / Comercial', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      default:
        return { label: role, class: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  }
}
