import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { SupplierService } from '../../core/services/supplier.service';
import { Product, CreateProductRequest, UpdateProductRequest, ProductFilterParams } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { Supplier } from '../../core/models/supplier.model';
import { ProductModalComponent } from './components/product-modal/product-modal.component';
import { ProductDetailModalComponent } from './components/product-detail-modal/product-detail-modal.component';
import { BatchModalComponent } from './components/batch-modal/batch-modal.component';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppPaginationComponent } from '../../shared/components/app-pagination/app-pagination.component';
import { PageChangeEvent } from '../../shared/models/pagination.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    ProductModalComponent,
    ProductDetailModalComponent,
    BatchModalComponent,
    AppButtonComponent,
    AppPaginationComponent,
    CurrencyFormatPipe
  ],
  templateUrl: './products.component.html'
})
export class ProductsComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private supplierService = inject(SupplierService);
  private route = inject(ActivatedRoute);

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

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

    const filters: ProductFilterParams = {
      search: this.searchQuery(),
      categoryId: this.selectedCategoryId() ?? undefined,
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

  onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const val = select.value;
    this.selectedCategoryId.set(val === 'all' ? null : Number(val));
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
    const action$ = current
      ? this.productService.updateProduct(current.id, request as UpdateProductRequest)
      : this.productService.createProduct(request as CreateProductRequest);

    action$.subscribe({
      next: () => {
        this.modalLoading.set(false);
        this.isModalOpen.set(false);
        this.loadProducts();
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
