import { Component, OnInit, inject, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AlertService } from '../../core/services/alert.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { StockAlert, StockAlertSummary, StockAlertFilterParams } from '../../core/models/alert.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppTableToolbarComponent } from '../../shared/components/app-table-toolbar/app-table-toolbar.component';
import { AppSortableHeaderComponent } from '../../shared/components/app-sortable-header/app-sortable-header.component';
import { TableStateManager } from '../../shared/utils/table-state-manager';
import { CsvExportService } from '../../shared/services/csv-export.service';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CurrencyFormatPipe,
    AppButtonComponent,
    AppTableToolbarComponent,
    AppSortableHeaderComponent
  ],
  templateUrl: './alerts.component.html'
})
export class AlertsComponent implements OnInit {
  private alertService = inject(AlertService);
  private router = inject(Router);
  branchContextService = inject(BranchContextService);
  private csvExportService = inject(CsvExportService);

  alerts = signal<StockAlert[]>([]);
  summary = signal<StockAlertSummary | null>(null);
  loading = signal<boolean>(false);

  // Gestor reactivo para ordenamiento y búsqueda omni-campo en alertas de stock
  readonly tableState = new TableStateManager<StockAlert>({
    data: () => this.alerts()
  });

  exportAlertsCsv(): void {
    const data = this.tableState.processedItems();
    if (!data.length) return;
    this.csvExportService.exportToCsv({
      filename: `alertas_stock_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { key: 'severity', header: 'Severidad' },
        { key: 'name', header: 'Producto' },
        { key: 'sku', header: 'SKU' },
        { key: 'categoryName', header: 'Categoría' },
        { key: 'currentStock', header: 'Stock Actual' },
        { key: 'minimumStock', header: 'Stock Mínimo' },
        { key: 'deficit', header: 'Déficit' },
        { key: 'supplierName', header: 'Proveedor Habitual' },
        { key: 'estimatedTotalCost', header: 'Costo Estimado' }
      ],
      data
    });
  }

  severityFilter = signal<string>('all');
  searchQuery = signal<string>('');

  constructor() {
    try {
      effect(() => {
        const wid = this.branchContextService.selectedWarehouseId();
        untracked(() => {
          this.loadData(wid);
        });
      }, { allowSignalWrites: true });
    } catch {}
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(warehouseId?: number | null): void {
    this.loading.set(true);
    const wid = warehouseId !== undefined ? warehouseId : this.branchContextService.selectedWarehouseId();

    const params: StockAlertFilterParams = {
      severity: this.severityFilter(),
      search: this.searchQuery(),
      warehouseId: (wid && wid > 0) ? wid : undefined
    };

    this.alertService.getStockAlerts(params).subscribe({
      next: (data) => {
        this.alerts.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    this.alertService.getSummary(wid).subscribe({
      next: (sum) => {
        this.summary.set(sum);
        this.alertService.markAsSeen(sum.totalAlerts);
      }
    });
  }

  setSeverityFilter(sev: string): void {
    this.severityFilter.set(sev);
    this.loadData();
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.loadData();
  }

  goToOrders(): void {
    this.router.navigate(['/purchases']);
  }

  createOrderForAlert(alert: StockAlert): void {
    const qParams: Record<string, any> = {
      new: 'true',
      productId: alert.productId
    };

    if (alert.supplierId && alert.supplierId > 0) {
      qParams['supplierId'] = alert.supplierId;
    }

    this.router.navigate(['/purchases'], { queryParams: qParams });
  }

  goToProducts(): void {
    this.router.navigate(['/products']);
  }

  getStockBarPercentage(current: number, min: number): number {
    if (min <= 0) return current > 0 ? 100 : 0;
    const pct = Math.round((current / min) * 100);
    return Math.min(100, Math.max(0, pct));
  }
}
