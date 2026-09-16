import { Injectable, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WarehouseService } from './warehouse.service';
import { AuthService } from '../auth/services/auth.service';
import { Warehouse } from '../models/warehouse.model';

@Injectable({
  providedIn: 'root'
})
export class BranchContextService implements OnDestroy {
  private warehouseService = inject(WarehouseService);
  private authService = inject(AuthService);
  private changeSub?: Subscription;

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

  private isInitialized = false;

  constructor() {
    // Escuchar cambios de sesión
    try {
      effect(() => {
        const user = this.authService.currentUser();
        if (user) {
          this.initializeBranchContext();
        } else {
          this.isInitialized = false;
          this.warehouses.set([]);
          this.selectedWarehouseId.set(null);
        }
      }, { allowSignalWrites: true });
    } catch {}

    // Escuchar mutaciones globales de sedes para refrescar en tiempo real
    this.changeSub = this.warehouseService.warehousesChanged$.subscribe((changed) => {
      this.refreshWarehouses(changed?.id);
    });
  }

  ngOnDestroy(): void {
    this.changeSub?.unsubscribe();
  }

  initializeBranchContext(): void {
    this.refreshWarehouses();
  }

  refreshWarehouses(autoSelectId?: number): void {
    const user = this.authService.currentUser();
    if (!user) return;

    if (this.canChangeBranch()) {
      this.loading.set(true);
      this.warehouseService.getWarehouses().subscribe({
        next: (data) => {
          this.warehouses.set(data);
          this.loading.set(false);

          // Si se indicó seleccionar una sede en particular (por ejemplo la recién creada)
          if (autoSelectId !== undefined) {
            if (autoSelectId === null || data.some(w => w.id === autoSelectId)) {
              this.setSelectedWarehouseId(autoSelectId);
              this.isInitialized = true;
              return;
            }
          }

          // Si ya estaba inicializado y la sede actual sigue siendo válida, mantenerla
          if (this.isInitialized) {
            const currentId = this.selectedWarehouseId();
            if (currentId === null || data.some(w => w.id === currentId)) {
              return;
            }
          }

          // Recuperar sede guardada en localStorage si existe en la lista
          const savedIdStr = localStorage.getItem(this.STORAGE_KEY);
          if (savedIdStr === 'all') {
            this.selectedWarehouseId.set(null);
            this.isInitialized = true;
            return;
          }
          if (savedIdStr) {
            const savedId = Number(savedIdStr);
            if (data.some(w => w.id === savedId)) {
              this.selectedWarehouseId.set(savedId);
              this.isInitialized = true;
              return;
            }
          }

          // Si el usuario tiene una sede asignada en su perfil y existe en la lista
          if (user.warehouseId && data.some(w => w.id === user.warehouseId)) {
            this.selectedWarehouseId.set(user.warehouseId);
            localStorage.setItem(this.STORAGE_KEY, String(user.warehouseId));
            this.isInitialized = true;
            return;
          }

          // Por defecto seleccionar la primera sede disponible
          if (data.length > 0) {
            this.selectedWarehouseId.set(data[0].id);
            localStorage.setItem(this.STORAGE_KEY, String(data[0].id));
          } else {
            this.selectedWarehouseId.set(null);
          }
          this.isInitialized = true;
        },
        error: () => this.loading.set(false)
      });
    } else {
      // Empleado con sede fija
      if (user.warehouseId) {
        this.selectedWarehouseId.set(user.warehouseId);
      }
      this.isInitialized = true;
    }
  }

  setSelectedWarehouseId(id: number | null): void {
    if (!this.canChangeBranch()) return;

    this.selectedWarehouseId.set(id);
    if (id !== null && id !== undefined) {
      localStorage.setItem(this.STORAGE_KEY, String(id));
    } else {
      localStorage.setItem(this.STORAGE_KEY, 'all');
    }
  }

  clearBranch(): void {
    this.setSelectedWarehouseId(null);
  }
}
