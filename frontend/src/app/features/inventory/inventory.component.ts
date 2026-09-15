import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../core/services/inventory.service';
import { ProductService } from '../../core/services/product.service';
import { AlertService } from '../../core/services/alert.service';
import { InventoryMovement, KardexFilterParams, CreateStockAdjustmentRequest } from '../../core/models/inventory.model';
import { Product } from '../../core/models/product.model';
import { StockAdjustmentModalComponent } from './components/stock-adjustment-modal/stock-adjustment-modal.component';
import { ReturnModalComponent } from './components/return-modal/return-modal.component';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppPaginationComponent } from '../../shared/components/app-pagination/app-pagination.component';
import { PageChangeEvent } from '../../shared/models/pagination.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    StockAdjustmentModalComponent,
    ReturnModalComponent,
    AppButtonComponent,
    AppPaginationComponent,
    CurrencyFormatPipe
  ],
  templateUrl: './inventory.component.html'
})
export class InventoryComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private productService = inject(ProductService);
  private alertService = inject(AlertService, { optional: true });

  readonly Math = Math;

  // Estado
  movements = signal<InventoryMovement[]>([]);
  products = signal<Product[]>([]);
  loading = signal<boolean>(false);
  exporting = signal<boolean>(false);

  // Paginación
  totalCount = signal<number>(0);
  pageNumber = signal<number>(1);
  pageSize = signal<number>(15);

  // Filtros
  dateRange = signal<'today' | '7d' | '1m' | '1y' | 'custom'>('7d');
  selectedType = signal<string>('all');
  searchQuery = signal<string>('');

  // Modal de Ajuste Manual
  isAdjustmentModalOpen = signal<boolean>(false);
  isReturnModalOpen = signal<boolean>(false);
  modalLoading = signal<boolean>(false);
  modalError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadProductsCatalog();
    this.loadKardex();
  }

  loadProductsCatalog(): void {
    this.productService.getProducts({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res) => this.products.set(res.items)
    });
  }

  loadKardex(): void {
    this.loading.set(true);

    const { startDate, endDate } = this.calculateDateRange(this.dateRange());

    const params: KardexFilterParams = {
      movementType: this.selectedType(),
      startDate,
      endDate,
      search: this.searchQuery(),
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize()
    };

    this.inventoryService.getKardex(params).subscribe({
      next: (res) => {
        this.movements.set(res.items);
        this.totalCount.set(res.totalCount);
        this.pageNumber.set(res.pageNumber);
        this.pageSize.set(res.pageSize);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setDateRange(range: 'today' | '7d' | '1m' | '1y' | 'custom'): void {
    this.dateRange.set(range);
    this.pageNumber.set(1);
    this.loadKardex();
  }

  onTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedType.set(select.value);
    this.pageNumber.set(1);
    this.loadKardex();
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.pageNumber.set(1);
    this.loadKardex();
  }

  onPaginationChange(event: PageChangeEvent): void {
    this.pageNumber.set(event.pageNumber);
    this.pageSize.set(event.pageSize);
    this.loadKardex();
  }

  openAdjustmentModal(): void {
    this.modalError.set(null);
    this.isAdjustmentModalOpen.set(true);
  }

  onSaveAdjustment(request: CreateStockAdjustmentRequest): void {
    this.modalLoading.set(true);
    this.modalError.set(null);

    this.inventoryService.createAdjustment(request).subscribe({
      next: () => {
        this.modalLoading.set(false);
        this.isAdjustmentModalOpen.set(false);
        this.loadProductsCatalog(); // Refrescar catálogo con stock actualizado
        this.loadKardex(); // Refrescar movimientos en tabla
        this.alertService?.checkUnreadStatus();
      },
      error: (err) => {
        this.modalLoading.set(false);
        const detail = err.error?.detail || err.error?.title || 'No se pudo registrar el ajuste.';
        this.modalError.set(detail);
      }
    });
  }

  onReturnSaved(): void {
    this.isReturnModalOpen.set(false);
    this.loadProductsCatalog();
    this.loadKardex();
    this.alertService?.checkUnreadStatus();
  }

  exportCsv(): void {
    this.exporting.set(true);
    const { startDate, endDate } = this.calculateDateRange(this.dateRange());

    const params: KardexFilterParams = {
      movementType: this.selectedType(),
      startDate,
      endDate,
      search: this.searchQuery()
    };

    this.inventoryService.exportCsv(params).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Kardex_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => this.exporting.set(false)
    });
  }

  getInitials(name: string): string {
    if (!name) return 'S';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  private calculateDateRange(range: 'today' | '7d' | '1m' | '1y' | 'custom'): { startDate?: string; endDate?: string } {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endDate = endOfDay.toISOString();

    if (range === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return { startDate: start.toISOString(), endDate };
    }
    if (range === '7d') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate };
    }
    if (range === '1m') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate };
    }
    if (range === '1y') {
      const start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate };
    }
    return {};
  }
}
