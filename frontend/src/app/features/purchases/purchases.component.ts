import { Component, OnInit, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PurchaseService } from '../../core/services/purchase.service';
import { SupplierService } from '../../core/services/supplier.service';
import { ProductService } from '../../core/services/product.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { AlertService } from '../../core/services/alert.service';
import { Purchase, PurchaseFilterParams, CreatePurchaseRequest, ReturnPurchaseRequest } from '../../core/models/purchase.model';
import { Supplier } from '../../core/models/supplier.model';
import { Product } from '../../core/models/product.model';
import { PurchaseModalComponent } from './components/purchase-modal/purchase-modal.component';
import { PurchaseDetailModalComponent } from './components/purchase-detail-modal/purchase-detail-modal.component';
import { PurchaseReturnModalComponent } from './components/purchase-return-modal/purchase-return-modal.component';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppPaginationComponent } from '../../shared/components/app-pagination/app-pagination.component';
import { PageChangeEvent } from '../../shared/models/pagination.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [
    CommonModule,
    PurchaseModalComponent,
    PurchaseDetailModalComponent,
    PurchaseReturnModalComponent,
    AppButtonComponent,
    AppPaginationComponent,
    CurrencyFormatPipe
  ],
  templateUrl: './purchases.component.html'
})
export class PurchasesComponent implements OnInit {
  private purchaseService = inject(PurchaseService);
  private supplierService = inject(SupplierService);
  private productService = inject(ProductService);
  branchContextService = inject(BranchContextService);
  private confirmationService = inject(ConfirmationService);
  private alertService = inject(AlertService, { optional: true });
  private route = inject(ActivatedRoute);

  purchases = signal<Purchase[]>([]);
  suppliers = signal<Supplier[]>([]);
  products = signal<Product[]>([]);
  loading = signal<boolean>(false);

  constructor() {
    effect(() => {
      const wid = this.branchContextService.selectedWarehouseId();
      untracked(() => {
        this.loadPurchases();
      });
    }, { allowSignalWrites: true });
  }

  // Paginación
  totalCount = signal<number>(0);
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);

  // Filtros
  statusFilter = signal<string>('all');
  searchQuery = signal<string>('');

  // Modales
  isCreateModalOpen = signal<boolean>(false);
  selectedPurchaseForDetail = signal<Purchase | null>(null);
  selectedPurchaseForReturn = signal<Purchase | null>(null);
  modalLoading = signal<boolean>(false);
  modalError = signal<string | null>(null);
  returnModalLoading = signal<boolean>(false);
  returnModalError = signal<string | null>(null);
  initialPreloadedItem = signal<{ productId?: number; quantity?: number; supplierId?: number } | null>(null);

  ngOnInit(): void {
    this.loadSuppliers();
    this.loadProducts();
    this.loadPurchases();

    this.route.queryParams.subscribe(params => {
      if (params['new'] === 'true') {
        const productId = params['productId'] ? Number(params['productId']) : undefined;
        const quantity = params['quantity'] ? Number(params['quantity']) : undefined;
        const supplierId = params['supplierId'] ? Number(params['supplierId']) : undefined;

        if (productId || quantity || supplierId) {
          this.initialPreloadedItem.set({ productId, quantity, supplierId });
        } else {
          this.initialPreloadedItem.set(null);
        }
        this.openCreateModal();
      }
    });
  }

  loadSuppliers(): void {
    this.supplierService.getSuppliers().subscribe({
      next: (res) => this.suppliers.set(res)
    });
  }

  loadProducts(): void {
    const wid = this.branchContextService.selectedWarehouseId();
    this.productService.getProducts({
      pageNumber: 1,
      pageSize: 200,
      warehouseId: (wid && wid > 0) ? wid : undefined
    }).subscribe({
      next: (res) => this.products.set(res.items)
    });
  }

  loadPurchases(): void {
    this.loading.set(true);

    const params: PurchaseFilterParams = {
      warehouseId: this.branchContextService.selectedWarehouseId() ?? undefined,
      status: this.statusFilter(),
      search: this.searchQuery(),
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize()
    };

    this.purchaseService.getPurchases(params).subscribe({
      next: (res) => {
        this.purchases.set(res.items);
        this.totalCount.set(res.totalCount);
        this.pageNumber.set(res.pageNumber);
        this.pageSize.set(res.pageSize);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
    this.pageNumber.set(1);
    this.loadPurchases();
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.pageNumber.set(1);
    this.loadPurchases();
  }

  onPaginationChange(event: PageChangeEvent): void {
    this.pageNumber.set(event.pageNumber);
    this.pageSize.set(event.pageSize);
    this.loadPurchases();
  }

  openCreateModal(): void {
    this.modalError.set(null);
    this.isCreateModalOpen.set(true);
  }

  onCreatePurchase(request: CreatePurchaseRequest): void {
    this.modalLoading.set(true);
    this.modalError.set(null);

    this.purchaseService.createPurchase(request).subscribe({
      next: () => {
        this.modalLoading.set(false);
        this.isCreateModalOpen.set(false);
        this.loadPurchases();
        this.alertService?.checkUnreadStatus();
      },
      error: (err) => {
        this.modalLoading.set(false);
        const detail = err.error?.detail || err.error?.title || 'No se pudo crear la orden de compra.';
        this.modalError.set(detail);
      }
    });
  }

  openDetail(purchase: Purchase): void {
    this.selectedPurchaseForDetail.set(purchase);
  }

  openReturnModal(purchase: Purchase): void {
    this.returnModalError.set(null);
    this.selectedPurchaseForReturn.set(purchase);
  }

  onConfirmReturn(request: ReturnPurchaseRequest): void {
    const purchase = this.selectedPurchaseForReturn();
    if (!purchase) return;

    this.returnModalLoading.set(true);
    this.returnModalError.set(null);

    this.purchaseService.returnPurchase(purchase.id, request).subscribe({
      next: () => {
        this.returnModalLoading.set(false);
        this.selectedPurchaseForReturn.set(null);
        this.loadPurchases();
        this.alertService?.checkUnreadStatus();
      },
      error: (err) => {
        this.returnModalLoading.set(false);
        const detail = err.error?.detail || err.error?.title || 'No se pudo registrar la devolución de la compra al proveedor.';
        this.returnModalError.set(detail);
      }
    });
  }

  receivePurchase(id: number): void {
    this.purchaseService.receivePurchase(id).subscribe({
      next: (updated) => {
        this.selectedPurchaseForDetail.set(null);
        this.loadPurchases();
        this.alertService?.checkUnreadStatus();
      }
    });
  }

  async cancelPurchase(id: number): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: '¿Cancelar Orden de Compra?',
      message: 'Esta orden de compra cambiará a estado Cancelada y no podrá ser recibida en el inventario.',
      confirmText: 'Sí, cancelar orden',
      cancelText: 'Mantener orden',
      variant: 'danger'
    });
    if (!confirmed) return;

    this.purchaseService.cancelPurchase(id).subscribe({
      next: () => this.loadPurchases()
    });
  }
}
