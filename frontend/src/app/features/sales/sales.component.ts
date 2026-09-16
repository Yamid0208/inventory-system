import { Component, OnInit, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SaleService } from '../../core/services/sale.service';
import { ProductService } from '../../core/services/product.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { AlertService } from '../../core/services/alert.service';
import { Sale, SaleFilterParams, CreateSaleRequest } from '../../core/models/sale.model';
import { Product } from '../../core/models/product.model';
import { Warehouse } from '../../core/models/warehouse.model';
import { SaleModalComponent } from './components/sale-modal/sale-modal.component';
import { SaleDetailModalComponent } from './components/sale-detail-modal/sale-detail-modal.component';
import { InvoiceViewerComponent } from './components/invoice-viewer/invoice-viewer.component';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppPaginationComponent } from '../../shared/components/app-pagination/app-pagination.component';
import { PageChangeEvent } from '../../shared/models/pagination.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [
    CommonModule,
    SaleModalComponent,
    SaleDetailModalComponent,
    InvoiceViewerComponent,
    AppButtonComponent,
    AppPaginationComponent,
    CurrencyFormatPipe
  ],
  templateUrl: './sales.component.html'
})
export class SalesComponent implements OnInit {
  private saleService = inject(SaleService);
  private productService = inject(ProductService);
  private warehouseService = inject(WarehouseService);
  branchContextService = inject(BranchContextService);
  private authService = inject(AuthService);
  private confirmationService = inject(ConfirmationService);
  private alertService = inject(AlertService, { optional: true });
  private route = inject(ActivatedRoute);

  sales = signal<Sale[]>([]);
  products = signal<Product[]>([]);
  warehouses = signal<Warehouse[]>([]);
  loading = signal<boolean>(false);

  userRole = computed(() => this.authService.currentUser()?.role || 'Seller');
  canFilterByWarehouse = computed(() => this.userRole() === 'SuperAdmin' || this.userRole() === 'Admin');

  // Paginación
  totalCount = signal<number>(0);
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);

  // Filtros
  statusFilter = signal<string>('all');
  selectedWarehouseId = signal<number | null>(null);
  searchQuery = signal<string>('');

  // Modales
  isCreateModalOpen = signal<boolean>(false);
  selectedSaleForDetail = signal<Sale | null>(null);
  selectedSaleForInvoice = signal<Sale | null>(null);
  autoPrintInvoice = signal<boolean>(false);
  modalLoading = signal<boolean>(false);
  modalError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const activeBranchId = this.branchContextService.selectedWarehouseId();
      untracked(() => {
        this.selectedWarehouseId.set(activeBranchId);
        this.pageNumber.set(1);
        this.loadSales();
      });
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    if (this.canFilterByWarehouse()) {
      this.loadWarehouses();
    }

    this.route.queryParams.subscribe(params => {
      if (params['new'] === 'true') {
        this.openCreateModal();
      }
    });
  }

  loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (res) => this.warehouses.set(res),
      error: () => {}
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

  loadSales(): void {
    this.loading.set(true);

    const wid = this.branchContextService.selectedWarehouseId();

    const params: SaleFilterParams = {
      status: this.statusFilter(),
      search: this.searchQuery(),
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      warehouseId: (wid && wid > 0) ? wid : undefined
    };

    this.saleService.getSales(params).subscribe({
      next: (res) => {
        this.sales.set(res.items);
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
    this.loadSales();
  }

  onWarehouseFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const val = select.value === 'all' || !select.value ? null : Number(select.value);
    this.branchContextService.setSelectedWarehouseId(val);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.pageNumber.set(1);
    this.loadSales();
  }

  onPaginationChange(event: PageChangeEvent): void {
    this.pageNumber.set(event.pageNumber);
    this.pageSize.set(event.pageSize);
    this.loadSales();
  }

  openCreateModal(): void {
    this.modalError.set(null);
    this.loadProducts(); // Asegurar existencias más recientes
    this.isCreateModalOpen.set(true);
  }

  onCreateSale(request: CreateSaleRequest): void {
    this.modalLoading.set(true);
    this.modalError.set(null);

    this.saleService.createSale(request).subscribe({
      next: (createdSale) => {
        this.modalLoading.set(false);
        this.isCreateModalOpen.set(false);
        this.loadProducts();
        this.loadSales();
        this.alertService?.checkUnreadStatus();

        // En el caso de factura tradicional, se abre el visor y se imprime automáticamente
        if (createdSale.invoiceType === 'Traditional' || !createdSale.invoiceType) {
          this.autoPrintInvoice.set(true);
          this.selectedSaleForInvoice.set(createdSale);
        } else {
          // Factura Electrónica: se visualiza el comprobante informativo con CUFE sin auto-impresión
          this.autoPrintInvoice.set(false);
          this.selectedSaleForInvoice.set(createdSale);
        }
      },
      error: (err) => {
        this.modalLoading.set(false);
        const detail = err.error?.detail || err.error?.title || 'No se pudo procesar la venta.';
        this.modalError.set(detail);
      }
    });
  }

  openDetail(sale: Sale): void {
    this.selectedSaleForDetail.set(sale);
  }

  openInvoice(sale: Sale): void {
    this.autoPrintInvoice.set(false);
    this.selectedSaleForInvoice.set(sale);
  }

  closeInvoice(): void {
    this.selectedSaleForInvoice.set(null);
    this.autoPrintInvoice.set(false);
  }

  async onCancelSale(id: number): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: '¿Anular Factura de Venta?',
      message: 'Esta acción anulará el comprobante y reincorporará los artículos al stock disponible.',
      confirmText: 'Sí, anular venta',
      cancelText: 'Mantener venta',
      variant: 'danger'
    });
    if (!confirmed) return;

    this.saleService.cancelSale(id).subscribe({
      next: () => {
        this.selectedSaleForDetail.set(null);
        this.loadProducts();
        this.loadSales();
      }
    });
  }

  getPaymentMethodLabel(method: string): string {
    switch (method) {
      case 'Cash': return 'Efectivo';
      case 'CreditCard': return 'Tarjeta';
      case 'Transfer': return 'Transferencia';
      case 'Credit': return 'Crédito';
      default: return method;
    }
  }
}
