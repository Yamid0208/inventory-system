import { Component, OnInit, OnDestroy, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ReportService } from '../../core/services/report.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import {
  ReportMetadata,
  ReportsCatalogSummary,
  ReportCategoryKey,
  ReportTypeKey,
  DatePreset,
  PagedReportResult,
  ProductReportItem,
  InventoryKardexReportItem,
  SalesReportItem,
  PurchasesReportItem,
  LowStockReportItem,
  SalesSummaryMetrics,
  TopProductReportItem,
  ProfitabilitySummary,
  CashRegisterReconciliationSummary,
  AuditActivityReportItem,
  SalesAnalyticsSummary,
  SalesByCategoryItem,
  HourlyActivityItem,
  SalesByEmployeeItem,
  SalesTrendItem
} from '../../core/models/report.model';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { CountUpDirective } from '../../shared/directives/count-up.directive';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFormatPipe, AppButtonComponent, CountUpDirective],
  templateUrl: './reports.component.html'
})
export class ReportsComponent implements OnInit, OnDestroy {
  protected readonly Math = Math;
  private reportService = inject(ReportService);
  private dashboardService = inject(DashboardService);
  branchContextService = inject(BranchContextService);

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  summary = signal<ReportsCatalogSummary | null>(null);
  dashboardData = signal<DashboardSummary | null>(null);
  loading = signal<boolean>(false);
  downloadingKey = signal<string | null>(null);

  // Categoría Principal INSINCRO (Ventas, Finanzas, Inventario, Catálogo, Compras, Caja, Auditoría)
  selectedCategory = signal<ReportCategoryKey>('sales');

  // Tipo de reporte / subvista activa
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
  salesMetrics = signal<SalesSummaryMetrics | null>(null);
  salesAnalytics = signal<SalesAnalyticsSummary | null>(null);
  salesCategories = signal<SalesByCategoryItem[]>([]);
  hourlyActivity = signal<HourlyActivityItem[]>([]);
  salesEmployees = signal<SalesByEmployeeItem[]>([]);
  salesTrends = signal<SalesTrendItem[]>([]);
  topProductsData = signal<TopProductReportItem[]>([]);

  // Modo de visualización gráfica en ventas: 'trend' (Tendencia cronológica) o 'comparison' (Comparativa períodos)
  salesGraphMode = signal<'trend' | 'comparison'>('trend');

  // Cálculo geométrico de la gráfica SVG de tendencias en el tiempo
  trendChartData = computed(() => {
    const raw = this.salesTrends();
    if (!raw || raw.length === 0) {
      return {
        hasData: false,
        linePath: '',
        areaPath: '',
        points: [] as { x: number; y: number; label: string; amount: number; count: number }[],
        maxRevenue: 0,
        totalRevenue: 0,
        averageRevenue: 0,
        peakDay: null as SalesTrendItem | null
      };
    }

    const totalRevenue = raw.reduce((acc, cur) => acc + cur.totalRevenue, 0);
    const averageRevenue = totalRevenue / raw.length;
    const maxRevenue = Math.max(...raw.map(r => r.totalRevenue), 1);
    const peakDay = [...raw].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];

    const width = 640;
    const height = 180;
    const padX = 40;
    const padTop = 25;
    const padBottom = 35;
    const usableW = width - padX * 2;
    const usableH = height - padTop - padBottom;

    const points = raw.map((item, idx) => {
      const x = raw.length === 1
        ? width / 2
        : padX + (idx / (raw.length - 1)) * usableW;
      const y = height - padBottom - (item.totalRevenue / maxRevenue) * usableH;
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        label: item.label,
        amount: item.totalRevenue,
        count: item.transactionCount
      };
    });

    let linePath = '';
    let areaPath = '';

    if (points.length === 1) {
      linePath = `M ${points[0].x - 40} ${points[0].y} L ${points[0].x + 40} ${points[0].y}`;
      areaPath = `M ${points[0].x - 40} ${points[0].y} L ${points[0].x + 40} ${points[0].y} L ${points[0].x + 40} ${height - padBottom} L ${points[0].x - 40} ${height - padBottom} Z`;
    } else {
      linePath = points.reduce((acc, pt, idx) => {
        return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
      }, '');
      const lastX = points[points.length - 1].x;
      const firstX = points[0].x;
      const baseY = height - padBottom;
      areaPath = `${linePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
    }

    return {
      hasData: true,
      linePath,
      areaPath,
      points,
      maxRevenue,
      totalRevenue,
      averageRevenue,
      peakDay
    };
  });

  // Métricas comparativas (Período Actual vs Período Anterior)
  comparativeAnalysis = computed(() => {
    const sa = this.salesAnalytics();
    if (!sa) return null;

    const curRev = sa.totalRevenue;
    const prevRev = sa.prevTotalRevenue;
    const revDiff = curRev - prevRev;
    const maxRev = Math.max(curRev, prevRev, 1);

    const curTx = sa.transactionCount;
    const prevTx = sa.prevTransactionCount;
    const txDiff = curTx - prevTx;
    const maxTx = Math.max(curTx, prevTx, 1);

    const curTicket = sa.averageTicket;
    const prevTicket = sa.prevAverageTicket;
    const ticketDiff = curTicket - prevTicket;
    const maxTicket = Math.max(curTicket, prevTicket, 1);

    return {
      curRev,
      prevRev,
      revDiff,
      revPct: sa.revenueGrowthPct,
      curRevBarWidth: Math.max(Math.round((curRev / maxRev) * 100), 2),
      prevRevBarWidth: Math.max(Math.round((prevRev / maxRev) * 100), 2),

      curTx,
      prevTx,
      txDiff,
      txPct: sa.transactionsGrowthPct,
      curTxBarWidth: Math.max(Math.round((curTx / maxTx) * 100), 2),
      prevTxBarWidth: Math.max(Math.round((prevTx / maxTx) * 100), 2),

      curTicket,
      prevTicket,
      ticketDiff,
      ticketPct: sa.ticketGrowthPct,
      curTicketBarWidth: Math.max(Math.round((curTicket / maxTicket) * 100), 2),
      prevTicketBarWidth: Math.max(Math.round((prevTicket / maxTicket) * 100), 2)
    };
  });

  // Segmentos SVG del Donut de Métodos de Pago
  paymentDonutSegments = computed(() => {
    const sa = this.salesAnalytics() || this.salesMetrics();
    const methods = sa?.paymentMethods || [];
    if (!methods.length) return [];

    const colors: Record<string, string> = {
      Cash: '#10b981',       // Verde Esmeralda
      Efectivo: '#10b981',
      Mixed: '#f59e0b',      // Ámbar
      Mixto: '#f59e0b',
      Card: '#0ea5e9',       // Azul Celeste
      Tarjeta: '#0ea5e9',
      Transfer: '#6366f1',   // Índigo
      Transferencia: '#6366f1'
    };

    let accumulatedPct = 0;
    return methods.map((m, idx) => {
      const pct = m.percentage;
      const strokeDash = `${pct} ${Math.max(100 - pct, 0)}`;
      const strokeOffset = 100 - accumulatedPct + 25;
      accumulatedPct += pct;
      const color = colors[m.method] || (idx % 2 === 0 ? '#8b5cf6' : '#ec4899');
      return {
        method: m.method,
        percentage: pct,
        amount: m.totalAmount,
        count: m.transactionCount,
        color,
        strokeDash,
        strokeOffset
      };
    });
  });

  filteredHourlyActivity = computed(() => {
    const term = this.searchTerm();
    return this.hourlyActivity().filter(h => h.transactionCount > 0 || !term);
  });
  profitabilityData = signal<ProfitabilitySummary | null>(null);
  cashReconciliationData = signal<CashRegisterReconciliationSummary | null>(null);
  inventoryData = signal<PagedReportResult<InventoryKardexReportItem> | null>(null);
  purchasesData = signal<PagedReportResult<PurchasesReportItem> | null>(null);
  productsData = signal<PagedReportResult<ProductReportItem> | null>(null);
  lowStockData = signal<PagedReportResult<LowStockReportItem> | null>(null);
  auditData = signal<PagedReportResult<AuditActivityReportItem> | null>(null);

  tableTitle = computed(() => {
    switch (this.selectedReport()) {
      case 'sales': return '💳 Historial y Facturación de Ventas';
      case 'sales-top': return '⭐ Ranking de Top Productos Más Vendidos';
      case 'sales-categories': return '🏷️ Análisis de Ventas por Categoría de Producto';
      case 'sales-hourly': return '⏰ Horarios de Mayor Actividad Comercial (Heatmap)';
      case 'sales-employees': return '👥 Rendimiento y Productividad por Empleado';
      case 'finance': return '📈 Rentabilidad y Utilidad Bruta (CMV Histórico)';
      case 'cash-reconciliation': return '💵 Arqueos y Conciliación de Cajas POS';
      case 'inventory': return '📋 Kardex Transaccional de Inventario';
      case 'products': return '📦 Catálogo de Productos y Valuación';
      case 'low-stock': return '⚠️ Alertas Críticas de Bajo Stock';
      case 'purchases': return '🛍️ Historial de Compras y Abastecimiento';
      case 'audit': return '🛡️ Registro de Auditoría de Operaciones Sensibles';
      default: return 'Detalle de Reporte';
    }
  });

  tableSubtitle = computed(() => {
    const p = this.activePreset();
    const presetLabels: Record<DatePreset, string> = {
      today: 'Período: Hoy',
      yesterday: 'Período: Ayer',
      '7days': 'Período: Últimos 7 días',
      '30days': 'Período: Últimos 30 días',
      thisMonth: 'Período: Mes Actual',
      lastMonth: 'Período: Mes Anterior',
      all: 'Período: Todo el Histórico',
      custom: `Período Personalizado: ${this.startDate() || 'Inicio'} al ${this.endDate() || 'Hoy'}`
    };
    return presetLabels[p] || 'Período activo';
  });

  currentRecordsCount = computed(() => {
    switch (this.selectedReport()) {
      case 'sales': return this.salesData()?.totalCount || 0;
      case 'sales-top': return this.topProductsData().length;
      case 'sales-categories': return this.salesCategories().length;
      case 'sales-hourly': return this.hourlyActivity().filter(h => h.transactionCount > 0).length;
      case 'sales-employees': return this.salesEmployees().length;
      case 'finance': return this.profitabilityData()?.productDetails?.totalCount || 0;
      case 'cash-reconciliation': return this.cashReconciliationData()?.sessions?.totalCount || 0;
      case 'inventory': return this.inventoryData()?.totalCount || 0;
      case 'products': return this.productsData()?.totalCount || 0;
      case 'low-stock': return this.lowStockData()?.totalCount || 0;
      case 'purchases': return this.purchasesData()?.totalCount || 0;
      case 'audit': return this.auditData()?.totalCount || 0;
      default: return 0;
    }
  });

  profitMargin = computed(() => {
    if (this.profitabilityData()) {
      return this.profitabilityData()!.grossMarginPercentage;
    }
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
      case 'finance':
        return this.profitabilityData()?.productDetails ?? null;
      case 'cash-reconciliation':
        return this.cashReconciliationData()?.sessions ?? null;
      case 'audit':
        return this.auditData();
      default:
        return null;
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
    // Pipeline de búsqueda con Debounce (350ms) para evitar llamadas en cada pulsación de tecla
    this.searchSub = this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm.set(term);
      this.pageNumber.set(1);
      this.loadTableData();
    });

    this.loadSummary();
    this.loadAnalytics();
    this.loadTableData();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.searchSubject.complete();
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

  selectCategory(category: ReportCategoryKey): void {
    this.selectedCategory.set(category);
    this.pageNumber.set(1);

    switch (category) {
      case 'sales':
        this.selectedReport.set('sales');
        break;
      case 'finance':
        this.selectedReport.set('finance');
        break;
      case 'inventory':
        this.selectedReport.set('inventory');
        break;
      case 'purchases':
        this.selectedReport.set('purchases');
        break;
      case 'cash':
        this.selectedReport.set('cash-reconciliation');
        break;
      case 'audit':
        this.selectedReport.set('audit');
        break;
    }
    this.loadTableData();
  }

  selectReport(type: ReportTypeKey): void {
    if (this.selectedReport() === type) return;
    this.selectedReport.set(type);

    // Ajustar categoría asociada si aplica
    if (type === 'sales' || type === 'sales-top' || type === 'sales-categories' || type === 'sales-hourly' || type === 'sales-employees') {
      this.selectedCategory.set('sales');
    } else if (type === 'finance') {
      this.selectedCategory.set('finance');
    } else if (type === 'inventory' || type === 'low-stock') {
      this.selectedCategory.set('inventory');
    } else if (type === 'products') {
      this.selectedCategory.set('inventory');
    } else if (type === 'purchases') {
      this.selectedCategory.set('purchases');
    } else if (type === 'cash-reconciliation') {
      this.selectedCategory.set('cash');
    } else if (type === 'audit') {
      this.selectedCategory.set('audit');
    }

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
    } else if (preset === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const yStr = this.formatLocalDate(yesterday);
      this.startDate.set(yStr);
      this.endDate.set(yStr);
    } else if (preset === 'thisMonth') {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      this.startDate.set(this.formatLocalDate(firstDayOfMonth));
      this.endDate.set(todayStr);
    } else if (preset === 'lastMonth') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      this.startDate.set(this.formatLocalDate(firstDayLastMonth));
      this.endDate.set(this.formatLocalDate(lastDayLastMonth));
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
    const term = this.searchTerm()?.trim() || undefined;
    const page = this.pageNumber();
    const size = this.pageSize();

    // En la categoría de ventas, actualizar siempre el resumen analítico ejecutivo, comparativas, tendencias y categorías
    if (this.selectedCategory() === 'sales') {
      this.reportService.getSalesAnalyticsSummary(start, end, wid).subscribe({
        next: (analytics) => this.salesAnalytics.set(analytics),
        error: () => {}
      });
      this.reportService.getSalesTrends(start, end, wid).subscribe({
        next: (trends) => this.salesTrends.set(trends),
        error: () => {}
      });
      this.reportService.getSalesByCategory(start, end, wid).subscribe({
        next: (cats) => this.salesCategories.set(cats),
        error: () => {}
      });
    }

    switch (this.selectedReport()) {
      case 'sales':
        this.reportService.getSalesData(start, end, wid, term, page, size).subscribe({
          next: (res) => {
            this.salesData.set(res);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        this.reportService.getSalesSummaryMetrics(start, end, wid).subscribe({
          next: (metrics) => this.salesMetrics.set(metrics),
          error: () => {}
        });
        break;

      case 'sales-top':
        this.reportService.getTopProducts(start, end, wid, term, 15, false).subscribe({
          next: (items) => {
            this.topProductsData.set(items);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;

      case 'sales-categories':
        this.reportService.getSalesByCategory(start, end, wid, term).subscribe({
          next: (items) => {
            this.salesCategories.set(items);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;

      case 'sales-hourly':
        this.reportService.getSalesHourlyActivity(start, end, wid).subscribe({
          next: (items) => {
            this.hourlyActivity.set(items);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;

      case 'sales-employees':
        this.reportService.getSalesByEmployee(start, end, wid, term).subscribe({
          next: (items) => {
            this.salesEmployees.set(items);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;

      case 'finance':
        this.reportService.getProfitability(start, end, wid, term, page, size).subscribe({
          next: (res) => {
            this.profitabilityData.set(res);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;

      case 'cash-reconciliation':
        this.reportService.getCashRegisterReconciliation(start, end, wid, term, page, size).subscribe({
          next: (res) => {
            this.cashReconciliationData.set(res);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;

      case 'inventory':
        this.reportService.getInventoryKardexData(start, end, wid, term, page, size).subscribe({
          next: (res) => {
            this.inventoryData.set(res);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;

      case 'purchases':
        this.reportService.getPurchasesData(start, end, wid, term, page, size).subscribe({
          next: (res) => {
            this.purchasesData.set(res);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;

      case 'products':
        this.reportService.getProductsData(wid, term, page, size).subscribe({
          next: (res) => {
            this.productsData.set(res);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;

      case 'low-stock':
        this.reportService.getLowStockData(wid, term, page, size).subscribe({
          next: (res) => {
            this.lowStockData.set(res);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;

      case 'audit':
        this.reportService.getAuditActivity(start, end, undefined, term, page, size).subscribe({
          next: (res) => {
            this.auditData.set(res);
            this.tableLoading.set(false);
          },
          error: () => this.tableLoading.set(false)
        });
        break;
    }
  }

  onSearchChange(term: string): void {
    this.searchSubject.next(term);
  }

  clearSearch(): void {
    this.searchTerm.set('');
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
