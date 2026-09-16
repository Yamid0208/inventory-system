import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../core/services/category.service';
import { SupplierService } from '../../core/services/supplier.service';
import { Category, CreateCategoryRequest } from '../../core/models/category.model';
import { Supplier, CreateSupplierRequest } from '../../core/models/supplier.model';
import { CategoryCardComponent } from './components/category-card/category-card.component';
import { CategoryModalComponent } from './components/category-modal/category-modal.component';
import { SupplierModalComponent } from './components/supplier-modal/supplier-modal.component';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppConfirmDialogComponent } from '../../shared/components/app-confirm-dialog/app-confirm-dialog.component';
import { AppBadgeComponent } from '../../shared/components/app-badge/app-badge.component';

@Component({
  selector: 'app-directory',
  standalone: true,
  imports: [
    CommonModule,
    CategoryCardComponent,
    CategoryModalComponent,
    SupplierModalComponent,
    AppButtonComponent,
    AppConfirmDialogComponent,
    AppBadgeComponent
  ],
  templateUrl: './directory.component.html'
})
export class DirectoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private categoryService = inject(CategoryService);
  private supplierService = inject(SupplierService);

  // Pestañas
  activeTab = signal<'categories' | 'suppliers'>('categories');

  // Filtros
  searchQuery = signal<string>('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  // Estados de carga
  loading = signal<boolean>(false);
  modalLoading = signal<boolean>(false);
  modalError = signal<string | null>(null);

  // Datos
  categories = signal<Category[]>([]);
  suppliers = signal<Supplier[]>([]);

  // Modales
  categoryModalOpen = signal<boolean>(false);
  selectedCategory = signal<Category | null>(null);

  supplierModalOpen = signal<boolean>(false);
  selectedSupplier = signal<Supplier | null>(null);

  // Diálogo de confirmación de borrado
  confirmDialogOpen = signal<boolean>(false);
  itemToDelete = signal<{ type: 'category' | 'supplier'; id: number; name: string; hasProducts?: boolean; productCount?: number; totalStock?: number } | null>(null);
  deleteWarning = signal<string | null>(null);

  // Computados
  filteredCategories = computed(() => {
    let list = this.categories();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();

    if (query) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query))
      );
    }

    if (status === 'active') {
      list = list.filter(c => c.isActive);
    } else if (status === 'inactive') {
      list = list.filter(c => !c.isActive);
    }

    return list;
  });

  filteredSuppliers = computed(() => {
    let list = this.suppliers();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();

    if (query) {
      list = list.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.taxId.toLowerCase().includes(query) ||
        (s.contactName && s.contactName.toLowerCase().includes(query)) ||
        (s.email && s.email.toLowerCase().includes(query))
      );
    }

    if (status === 'active') {
      list = list.filter(s => s.isActive);
    } else if (status === 'inactive') {
      list = list.filter(s => !s.isActive);
    }

    return list;
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'suppliers') {
        this.activeTab.set('suppliers');
      }
    });

    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    this.supplierService.getSuppliers().subscribe({
      next: (data) => this.suppliers.set(data)
    });
  }

  switchTab(tab: 'categories' | 'suppliers'): void {
    this.activeTab.set(tab);
    this.searchQuery.set('');
    this.statusFilter.set('all');
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  setStatusFilter(filter: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(filter);
  }

  // Creación y edición
  openAddNew(): void {
    this.modalError.set(null);
    if (this.activeTab() === 'categories') {
      this.selectedCategory.set(null);
      this.categoryModalOpen.set(true);
    } else {
      this.selectedSupplier.set(null);
      this.supplierModalOpen.set(true);
    }
  }

  openEditCategory(category: Category): void {
    this.modalError.set(null);
    this.selectedCategory.set(category);
    this.categoryModalOpen.set(true);
  }

  openEditSupplier(supplier: Supplier): void {
    this.modalError.set(null);
    this.selectedSupplier.set(supplier);
    this.supplierModalOpen.set(true);
  }

  onSaveCategory(request: CreateCategoryRequest): void {
    this.modalLoading.set(true);
    this.modalError.set(null);

    const current = this.selectedCategory();
    const action$ = current
      ? this.categoryService.updateCategory(current.id, request)
      : this.categoryService.createCategory(request);

    action$.subscribe({
      next: (saved) => {
        this.modalLoading.set(false);
        this.categoryModalOpen.set(false);
        this.loadData();
      },
      error: (err) => {
        this.modalLoading.set(false);
        const detail = err.error?.detail || err.error?.title || 'No se pudo guardar la categoría.';
        this.modalError.set(detail);
      }
    });
  }

  onSaveSupplier(request: CreateSupplierRequest): void {
    this.modalLoading.set(true);
    this.modalError.set(null);

    const current = this.selectedSupplier();
    const action$ = current
      ? this.supplierService.updateSupplier(current.id, request)
      : this.supplierService.createSupplier(request);

    action$.subscribe({
      next: () => {
        this.modalLoading.set(false);
        this.supplierModalOpen.set(false);
        this.loadData();
      },
      error: (err) => {
        this.modalLoading.set(false);
        const detail = err.error?.detail || err.error?.title || 'No se pudo guardar el proveedor.';
        this.modalError.set(detail);
      }
    });
  }

  onToggleCategoryStatus(payload: { category: Category; isActive: boolean }): void {
    // Actualización optimista
    this.categories.update(list =>
      list.map(c => c.id === payload.category.id ? { ...c, isActive: payload.isActive } : c)
    );

    this.categoryService.toggleStatus(payload.category.id, payload.isActive).subscribe({
      error: () => {
        // Revertir en caso de error
        this.categories.update(list =>
          list.map(c => c.id === payload.category.id ? { ...c, isActive: !payload.isActive } : c)
        );
      }
    });
  }

  onToggleSupplierStatus(supplier: Supplier): void {
    const nextStatus = !supplier.isActive;
    this.suppliers.update(list =>
      list.map(s => s.id === supplier.id ? { ...s, isActive: nextStatus } : s)
    );

    this.supplierService.toggleStatus(supplier.id, nextStatus).subscribe({
      error: () => {
        this.suppliers.update(list =>
          list.map(s => s.id === supplier.id ? { ...s, isActive: !nextStatus } : s)
        );
      }
    });
  }

  promptDeleteCategory(category: Category): void {
    this.deleteWarning.set(null);
    const productCount = category.productCount ?? 0;
    const totalStock = category.totalStock ?? 0;
    this.itemToDelete.set({
      type: 'category',
      id: category.id,
      name: category.name,
      hasProducts: productCount > 0,
      productCount,
      totalStock
    });
    this.confirmDialogOpen.set(true);
  }

  promptDeleteSupplier(supplier: Supplier): void {
    this.deleteWarning.set(null);
    this.itemToDelete.set({
      type: 'supplier',
      id: supplier.id,
      name: supplier.name
    });
    this.confirmDialogOpen.set(true);
  }

  executeDelete(): void {
    const target = this.itemToDelete();
    if (!target) return;

    if (target.type === 'category') {
      this.categoryService.deleteCategory(target.id).subscribe({
        next: () => {
          this.confirmDialogOpen.set(false);
          this.itemToDelete.set(null);
          this.loadData();
        },
        error: (err) => {
          const detail = err.error?.detail || 'No se pudo eliminar la categoría.';
          this.deleteWarning.set(detail);
        }
      });
    } else {
      this.supplierService.deleteSupplier(target.id).subscribe({
        next: () => {
          this.confirmDialogOpen.set(false);
          this.itemToDelete.set(null);
          this.loadData();
        },
        error: (err) => {
          const detail = err.error?.detail || 'No se pudo eliminar el proveedor.';
          this.deleteWarning.set(detail);
        }
      });
    }
  }

  closeDeleteDialog(): void {
    this.confirmDialogOpen.set(false);
    this.itemToDelete.set(null);
    this.deleteWarning.set(null);
  }
}
