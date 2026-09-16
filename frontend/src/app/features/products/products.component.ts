import { Component, OnInit, OnDestroy, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { SupplierService } from '../../core/services/supplier.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { AlertService } from '../../core/services/alert.service';
import { Product, ProductFilterParams, CreateProductRequest, UpdateProductRequest } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { Supplier } from '../../core/models/supplier.model';
import { ProductModalComponent } from './components/product-modal/product-modal.component';
import { ProductDetailModalComponent } from './components/product-detail-modal/product-detail-modal.component';
import { BatchManagementModalComponent } from './components/batch-management-modal/batch-management-modal.component';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppPaginationComponent } from '../../shared/components/app-pagination/app-pagination.component';
import { AppAutocompleteComponent, AutocompleteOption } from '../../shared/components/app-autocomplete/app-autocomplete.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { PageChangeEvent } from '../../shared/models/pagination.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ProductModalComponent,
    ProductDetailModalComponent,
    BatchManagementModalComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppAutocompleteComponent,
    CurrencyFormatPipe
  ],
  templateUrl: './products.component.html'
})
export class ProductsComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private supplierService = inject(SupplierService);
  branchContextService = inject(BranchContextService);
  private alertService = inject(AlertService, { optional: true });
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  constructor() {
    effect(() => {
      const wid = this.branchContextService.selectedWarehouseId();
      untracked(() => {
        this.pageNumber.set(1);
        this.loadProducts();
      });
    }, { allowSignalWrites: true });
  }

  // Datos
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  suppliers = signal<Supplier[]>([]);

  readonly Math = Math;

  // Paginación y Carga
  loading = signal<boolean>(false);
  totalCount = signal<number>(0);
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(1);

  // Filtros
  searchQuery = signal<string>('');
  selectedCategoryId = signal<number | null>(null);
  stockStatus = signal<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  categoryOptions = computed<AutocompleteOption[]>(() => {
    return [
      { value: null, label: 'Todas las Categorías' },
      ...this.categories().map(c => ({ value: c.id, label: c.name }))
    ];
  });

  // Modales
  isModalOpen = signal<boolean>(false);
  selectedProduct = signal<Product | null>(null);
  modalLoading = signal<boolean>(false);
  modalError = signal<string | null>(null);

  isDetailModalOpen = signal<boolean>(false);
  detailProduct = signal<Product | null>(null);

  // Modal de Lotes y Vencimientos
  isBatchModalOpen = signal<boolean>(false);
  batchProduct = signal<Product | null>(null);

  // Diálogo de eliminación
  confirmDialogOpen = signal<boolean>(false);
  productToDelete = signal<Product | null>(null);
  deleteWarning = signal<string | null>(null);

  openBatchModal(product: Product): void {
    this.batchProduct.set(product);
    this.isBatchModalOpen.set(true);
  }

  ngOnInit(): void {
    this.searchSub = this.searchSubject
      .pipe(
        debounceTime(350),
        distinctUntilChanged()
      )
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.pageNumber.set(1);
        this.loadProducts();
      });

    this.loadFilterLookups();
    this.loadProducts();

    this.route.queryParams.subscribe(params => {
      if (params['search'] !== undefined) {
        this.searchQuery.set(params['search']);
        this.pageNumber.set(1);
        this.loadProducts();
      }
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  loadFilterLookups(): void {
    this.categoryService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats)
    });

    this.supplierService.getSuppliers().subscribe({
      next: (sups) => this.suppliers.set(sups)
    });
  }

  loadProducts(): void {
    this.loading.set(true);

    const wid = this.branchContextService.selectedWarehouseId();

    const filters: ProductFilterParams = {
      search: this.searchQuery(),
      categoryId: this.selectedCategoryId() ?? undefined,
      warehouseId: (wid && wid > 0) ? wid : undefined,
      stockStatus: this.stockStatus(),
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize()
    };

    this.productService.getProducts(filters).subscribe({
      next: (result) => {
        this.products.set(result.items);
        this.totalCount.set(result.totalCount);
        this.pageNumber.set(result.pageNumber);
        this.pageSize.set(result.pageSize);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
  }

  setStockFilter(status: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'): void {
    this.stockStatus.set(status);
    this.pageNumber.set(1);
    this.loadProducts();
  }

  onCategorySelect(categoryId: any): void {
    const val = categoryId ? Number(categoryId) : null;
    this.selectedCategoryId.set(val);
    this.pageNumber.set(1);
    this.loadProducts();
  }

  onCategoryChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target.value && target.value !== 'all' ? Number(target.value) : null;
    this.selectedCategoryId.set(val);
    this.pageNumber.set(1);
    this.loadProducts();
  }

  onPaginationChange(event: PageChangeEvent): void {
    this.pageNumber.set(event.pageNumber);
    this.pageSize.set(event.pageSize);
    this.loadProducts();
  }

  // Modales
  openCreateModal(): void {
    this.modalError.set(null);
    this.selectedProduct.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(product: Product): void {
    this.modalError.set(null);
    this.selectedProduct.set(product);
    this.isModalOpen.set(true);
  }

  openDetailModal(product: Product): void {
    this.detailProduct.set(product);
    this.isDetailModalOpen.set(true);
  }

  onSaveProduct(request: CreateProductRequest | UpdateProductRequest): void {
    this.modalLoading.set(true);
    this.modalError.set(null);

    const current = this.selectedProduct();
    let action$;

    if (current) {
      action$ = this.productService.updateProduct(current.id, request as UpdateProductRequest);
    } else {
      const createReq = request as CreateProductRequest;
      if (!createReq.warehouseId) {
        createReq.warehouseId = this.branchContextService.selectedWarehouseId();
      }
      action$ = this.productService.createProduct(createReq);
    }

    action$.subscribe({
      next: () => {
        this.modalLoading.set(false);
        this.isModalOpen.set(false);
        this.loadProducts();
        this.alertService?.checkUnreadStatus();
      },
      error: (err) => {
        this.modalLoading.set(false);
        const detail = err.error?.detail || err.error?.title || 'No se pudo guardar el producto.';
        this.modalError.set(detail);
      }
    });
  }

  promptDelete(product: Product): void {
    this.deleteWarning.set(null);
    this.productToDelete.set(product);
    this.confirmDialogOpen.set(true);
  }

  executeDelete(): void {
    const product = this.productToDelete();
    if (!product) return;

    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.confirmDialogOpen.set(false);
        this.productToDelete.set(null);
        this.loadProducts();
      },
      error: (err) => {
        const detail = err.error?.detail || 'No se pudo eliminar el producto.';
        this.deleteWarning.set(detail);
      }
    });
  }

  closeDeleteDialog(): void {
    this.confirmDialogOpen.set(false);
    this.productToDelete.set(null);
    this.deleteWarning.set(null);
  }

  getCategoryBadgeClass(categoryName: string): string {
    const name = categoryName.toLowerCase();
    if (name.includes('electr') || name.includes('compu')) {
      return 'bg-purple-100 text-purple-700 border-purple-200';
    }
    if (name.includes('mueb') || name.includes('mobil')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (name.includes('embal') || name.includes('pack')) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }

  getStockBarWidth(current: number, minimum: number): number {
    if (current <= 0) return 0;
    const maxReference = Math.max(minimum * 3, current, 100);
    return Math.min(100, Math.round((current / maxReference) * 100));
  }
}
