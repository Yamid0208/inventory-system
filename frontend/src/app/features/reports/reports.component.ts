import { Component, OnInit, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/services/report.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import {
  ReportMetadata,
  ReportsCatalogSummary,
  ReportTypeKey,
  PagedReportResult,
  ProductReportItem,
  InventoryKardexReportItem,
  SalesReportItem,
  PurchasesReportItem,
  LowStockReportItem
} from '../../core/models/report.model';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { CountUpDirective } from '../../shared/directives/count-up.directive';

export type DatePreset = 'today' | 'thisMonth' | '7days' | '30days' | 'all' | 'custom';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFormatPipe, AppButtonComponent, CountUpDirective],
  templateUrl: './reports.component.html'
})
export class ReportsComponent implements OnInit {
  private reportService = inject(ReportService);
  private dashboardService = inject(DashboardService);
  branchContextService = inject(BranchContextService);

  summary = signal<ReportsCatalogSummary | null>(null);
  dashboardData = signal<DashboardSummary | null>(null);
  loading = signal<boolean>(false);
  downloadingKey = signal<string | null>(null);

  // Selector de reporte activo
  selectedReport = signal<ReportTypeKey>('sales');

  // Filtros de fecha (Por defecto: "Hoy" con la fecha actual)
  startDate = signal<string>('');
  endDate = signal<string>('');
  activePreset = signal<DatePreset>('today');

  // Paginación y búsqueda
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);
  searchTerm = signal<string>('');
  tableLoading = signal<boolean>(false);

  // Datos tabulares por tipo de reporte
  salesData = signal<PagedReportResult<SalesReportItem> | null>(null);
  inventoryData = signal<PagedReportResult<InventoryKardexReportItem> | null>(null);
  purchasesData = signal<PagedReportResult<PurchasesReportItem> | null>(null);
  productsData = signal<PagedReportResult<ProductReportItem> | null>(null);
  lowStockData = signal<PagedReportResult<LowStockReportItem> | null>(null);

  profitMargin = computed(() => {
    const d = this.dashboardData();
    if (!d || d.kpis.totalSalesAmount <= 0) return 0;
    const margin = ((d.kpis.totalSalesAmount - d.kpis.totalPurchasesAmount) / d.kpis.totalSalesAmount) * 100;
    return Math.round(margin * 10) / 10;
  });

  currentPagination = computed(() => {
    switch (this.selectedReport()) {
      case 'sales':
        return this.salesData();
      case 'inventory':
        return this.inventoryData();
      case 'purchases':
        return this.purchasesData();
      case 'products':
        return this.productsData();
      case 'low-stock':
        return this.lowStockData();
    }
  });

  constructor() {
    // Inicializar fechas en "Hoy" por defecto
    const today = this.formatLocalDate(new Date());
    this.startDate.set(today);
    this.endDate.set(today);

    try {
      effect(() => {
        const wid = this.branchContextService.selectedWarehouseId();
        untracked(() => {
          this.loadSummary(wid);
          this.loadAnalytics(wid);
          this.loadTableData();
        });
      }, { allowSignalWrites: true });
    } catch { }
  }

  ngOnInit(): void {
    this.loadSummary();
    this.loadAnalytics();
    this.loadTableData();
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadSummary(warehouseId?: number | null): void {
    this.loading.set(true);
    const wid = warehouseId !== undefined ? warehouseId : this.branchContextService.selectedWarehouseId();
    this.reportService.getSummary(wid).subscribe({
      next: (res) => {
        this.summary.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadAnalytics(warehouseId?: number | null): void {
    const wid = warehouseId !== undefined ? warehouseId : this.branchContextService.selectedWarehouseId();
    this.dashboardService.getSummary(wid).subscribe({
      next: (data) => this.dashboardData.set(data),
      error: () => { }
    });
  }

  selectReport(type: ReportTypeKey): void {
    if (this.selectedReport() === type) return;
    this.selectedReport.set(type);
    this.pageNumber.set(1);
    this.loadTableData();
  }

  setDatePreset(preset: DatePreset): void {
    this.activePreset.set(preset);
    const now = new Date();
    const todayStr = this.formatLocalDate(now);

    if (preset === 'today') {
      this.startDate.set(todayStr);
      this.endDate.set(todayStr);
    } else if (preset === 'thisMonth') {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      this.startDate.set(this.formatLocalDate(firstDayOfMonth));
      this.endDate.set(todayStr);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      this.startDate.set(this.formatLocalDate(past));
      this.endDate.set(todayStr);
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      this.startDate.set(this.formatLocalDate(past));
      this.endDate.set(todayStr);
    } else if (preset === 'all') {
      this.startDate.set('');
      this.endDate.set('');
    }

    this.pageNumber.set(1);
    this.loadTableData();
  }

  onCustomDateChange(): void {
    this.activePreset.set('custom');
    this.pageNumber.set(1);
    this.loadTableData();
  }

  loadTableData(): void {
    this.tableLoading.set(true);
    const wid = this.branchContextService.selectedWarehouseId();
    const start = this.startDate() || undefined;
    const end = this.endDate() || undefined;
    const page = this.pageNumber();
    const size = this.pageSize();

    switch (this.selectedReport()) {
      case 'sales':
        this.reportService.getSalesData(start, end, wid, page, size).subscribe({
          next: (res) => {
            this.salesData.set(res);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;

      case 'inventory':
        this.reportService.getInventoryKardexData(start, end, wid, page, size).subscribe({
          next: (res) => {
            this.inventoryData.set(res);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;

      case 'purchases':
        this.reportService.getPurchasesData(start, end, wid, page, size).subscribe({
          next: (res) => {
            this.purchasesData.set(res);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;

      case 'products':
        this.reportService.getProductsData(wid, this.searchTerm() || undefined, page, size).subscribe({
          next: (res) => {
            this.productsData.set(res);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;

      case 'low-stock':
        this.reportService.getLowStockData(wid, page, size).subscribe({
          next: (res) => {
            this.lowStockData.set(res);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;
    }
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.pageNumber.set(1);
    this.loadTableData();
  }

  nextPage(): void {
    const meta = this.currentPagination();
    if (meta && this.pageNumber() < meta.totalPages) {
      this.pageNumber.update(p => p + 1);
      this.loadTableData();
    }
  }

  prevPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update(p => p - 1);
      this.loadTableData();
    }
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.pageNumber.set(1);
    this.loadTableData();
  }

  downloadCurrentReport(): void {
    const key = this.selectedReport();
    this.downloadCsvByKey(key);
  }

  downloadCsvByKey(reportKey: string): void {
    this.downloadingKey.set(reportKey);
    const wid = this.branchContextService.selectedWarehouseId();

    this.reportService.downloadReport(
      reportKey,
      this.startDate() || undefined,
      this.endDate() || undefined,
      wid
    ).subscribe({
      next: (blob) => {
        const dateSuffix = this.activePreset() === 'today'
          ? this.startDate()
          : `${this.startDate() || 'inicio'}_${this.endDate() || 'fin'}`;

        this.reportService.triggerBrowserDownload(
          blob,
          `reporte_${reportKey}_${dateSuffix}.csv`
        );
        this.downloadingKey.set(null);
      },
      error: () => {
        this.downloadingKey.set(null);
      }
    });
  }
}
