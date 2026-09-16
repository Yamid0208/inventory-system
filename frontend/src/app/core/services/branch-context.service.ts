import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { WarehouseService } from './warehouse.service';
import { AuthService } from '../auth/services/auth.service';
import { Warehouse } from '../models/warehouse.model';

@Injectable({
  providedIn: 'root'
})
export class BranchContextService {
  private warehouseService = inject(WarehouseService);
  private authService = inject(AuthService);

  private readonly STORAGE_KEY = 'inventory_active_branch_id';

  warehouses = signal<Warehouse[]>([]);
  selectedWarehouseId = signal<number | null>(null);
  loading = signal<boolean>(false);

  canChangeBranch = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === 'Admin' || role === 'SuperAdmin';
  });

  selectedWarehouse = computed(() => {
    const id = this.selectedWarehouseId();
    if (!id) return null;
    return this.warehouses().find(w => w.id === id) || null;
  });

  assignedWarehouseName = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return 'Almacén';
    if (this.selectedWarehouse()) {
      return this.selectedWarehouse()!.name;
    }
    if (user.warehouseName) {
      return user.warehouseName;
    }
    return 'Todas las Sedes (Consolidado)';
  });

  constructor() {
    // Escuchar cambios de sesión
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.initializeBranchContext();
      } else {
        this.warehouses.set([]);
        this.selectedWarehouseId.set(null);
      }
    }, { allowSignalWrites: true });
  }

  initializeBranchContext(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    if (this.canChangeBranch()) {
      this.loading.set(true);
      this.warehouseService.getWarehouses().subscribe({
        next: (data) => {
          this.warehouses.set(data);
          this.loading.set(false);

          // Recuperar sede guardada en localStorage si existe en la lista
          const savedIdStr = localStorage.getItem(this.STORAGE_KEY);
          if (savedIdStr) {
            const savedId = Number(savedIdStr);
            if (data.some(w => w.id === savedId)) {
              this.selectedWarehouseId.set(savedId);
              return;
            }
          }

          // Si el usuario tiene una sede asignada en su perfil y existe en la lista
          if (user.warehouseId && data.some(w => w.id === user.warehouseId)) {
            this.selectedWarehouseId.set(user.warehouseId);
            localStorage.setItem(this.STORAGE_KEY, String(user.warehouseId));
            return;
          }

          // Por defecto seleccionar la primera sede disponible
          if (data.length > 0) {
            this.selectedWarehouseId.set(data[0].id);
            localStorage.setItem(this.STORAGE_KEY, String(data[0].id));
          } else {
            this.selectedWarehouseId.set(null);
          }
        },
        error: () => this.loading.set(false)
      });
    } else {
      // Empleado con sede fija
      if (user.warehouseId) {
        this.selectedWarehouseId.set(user.warehouseId);
      }
    }
  }

  setSelectedWarehouseId(id: number | null): void {
    if (!this.canChangeBranch()) return;

    this.selectedWarehouseId.set(id);
    if (id !== null && id !== undefined) {
      localStorage.setItem(this.STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  clearBranch(): void {
    this.setSelectedWarehouseId(null);
  }
}
