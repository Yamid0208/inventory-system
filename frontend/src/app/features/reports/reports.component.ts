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
  SalesTrendItem,
  InventoryValuationSummary,
  InventoryValuationByCategory,
  InventoryValuationItem
} from '../../core/models/report.model';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { CountUpDirective } from '../../shared/directives/count-up.directive';
import { AppTableToolbarComponent } from '../../shared/components/app-table-toolbar/app-table-toolbar.component';
import { AppSortableHeaderComponent } from '../../shared/components/app-sortable-header/app-sortable-header.component';
import { TableStateManager } from '../../shared/utils/table-state-manager';
import { CsvExportService } from '../../shared/services/csv-export.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyFormatPipe,
    AppButtonComponent,
    CountUpDirective,
    AppTableToolbarComponent,
    AppSortableHeaderComponent
  ],
  templateUrl: './reports.component.html'
})
export class ReportsComponent implements OnInit, OnDestroy {
  protected readonly Math = Math;
  private reportService = inject(ReportService);
  private dashboardService = inject(DashboardService);
  private csvExportService = inject(CsvExportService);
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

  // Datos de Valoración Financiera y Patrimonial de Inventario
  inventoryValuationSummary = signal<InventoryValuationSummary | null>(null);
  inventoryValuationByCategory = signal<InventoryValuationByCategory[]>([]);
  inventoryValuationData = signal<PagedReportResult<InventoryValuationItem> | null>(null);
  selectedAbcClass = signal<string | null>(null);
  stagnantOnlyFilter = signal<boolean>(false);
  selectedValuationCategoryId = signal<number | null>(null);

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
        segments: [] as { x1: number; y1: number; x2: number; y2: number; color: string; type: 'up' | 'down' | 'flat'; diff: number }[],
        points: [] as {
          x: number;
          y: number;
          label: string;
          shortDate: string;
          amount: number;
          formattedAmount: string;
          count: number;
          pointColor: string;
          valueY: number;
          tooltipX: number;
          tooltipY: number;
          tooltipIsAbove: boolean;
        }[],
        maxRevenue: 0,
        totalRevenue: 0,
        averageRevenue: 0,
        peakDay: null as SalesTrendItem | null,
        upCount: 0,
        downCount: 0,
        flatCount: 0
      };
    }

    const totalRevenue = raw.reduce((acc, cur) => acc + cur.totalRevenue, 0);
    const averageRevenue = totalRevenue / raw.length;
    const maxRevenue = Math.max(...raw.map(r => r.totalRevenue), 1);
    const peakDay = [...raw].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];

    const width = 680;
    const height = 220;
    const padX = 45;
    const padTop = 50;
    const padBottom = 45;
    const usableW = width - padX * 2;
    const usableH = height - padTop - padBottom;

    const formatCompact = (val: number): string => {
      if (val >= 1000000) {
        const m = val / 1000000;
        return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
      }
      if (val >= 1000) {
        const k = val / 1000;
        return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(0)}k`;
      }
      return `$${val}`;
    };

    const extractShort = (label: string): string => {
      if (!label) return '';
      if (label.includes('/')) {
        const parts = label.split('/');
        if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
      }
      if (label.includes('-')) {
        const parts = label.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
      }
      return label;
    };

    const points = raw.map((item, idx) => {
      const x = raw.length === 1
        ? width / 2
        : padX + (idx / (raw.length - 1)) * usableW;
      const y = height - padBottom - (item.totalRevenue / maxRevenue) * usableH;
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        label: item.label,
        shortDate: extractShort(item.label),
        amount: item.totalRevenue,
        formattedAmount: formatCompact(item.totalRevenue),
        count: item.transactionCount,
        pointColor: '#6366F1',
        valueY: 0,
        tooltipX: 0,
        tooltipY: 0,
        tooltipIsAbove: true
      };
    });

    // Construcción de segmentos individuales con color según pendiente
    const segments: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      type: 'up' | 'down' | 'flat';
      diff: number;
    }[] = [];

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const diff = p2.amount - p1.amount;
      let color = '#F59E0B'; // Estable / sin variación (amarillo)
      let type: 'up' | 'down' | 'flat' = 'flat';

      if (diff > 0) {
        color = '#10B981'; // Subida (verde)
        type = 'up';
      } else if (diff < 0) {
        color = '#EF4444'; // Bajada (rojo)
        type = 'down';
      }

      segments.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        color,
        type,
        diff
      });
    }

    // Asignar color a cada punto según la pendiente y calcular posición del valor y del tooltip
    points.forEach((pt, idx) => {
      if (idx === 0) {
        pt.pointColor = segments.length > 0 ? segments[0].color : '#6366F1';
      } else {
        pt.pointColor = segments[idx - 1].color;
      }

      // Posición del texto del valor (limpio, sin recuadro) sobre el punto
      const isTopClipped = pt.y < 35;
      pt.valueY = isTopClipped ? pt.y + 15 : pt.y - 10;

      // Posición de la tarjetica flotante en hover
      const isNearTop = pt.y < 65;
      pt.tooltipY = isNearTop ? pt.y + 24 : pt.y - 44;
      pt.tooltipIsAbove = !isNearTop;
      pt.tooltipX = Math.max(56, Math.min(width - 56, pt.x));
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

    const isSingleDay = points.length === 1;

    return {
      hasData: true,
      isSingleDay,
      singleDayLabel: isSingleDay ? points[0].label : '',
      singleDayAmount: isSingleDay ? points[0].amount : 0,
      singleDayCount: isSingleDay ? points[0].count : 0,
      linePath,
      areaPath,
      segments,
      points,
      maxRevenue,
      totalRevenue,
      averageRevenue,
      peakDay,
      upCount: segments.filter(s => s.type === 'up').length,
      downCount: segments.filter(s => s.type === 'down').length,
      flatCount: segments.filter(s => s.type === 'flat').length
    };
  });

  // Métricas comparativas (Período Actual vs Período Anterior)
  comparativeAnalysis = computed(() => {
    const sa = this.salesAnalytics();
    if (!sa) return null;

    const curRev = sa.totalRevenue;
    const prevRev = sa.prevTotalRevenue;
    const revDiff = Math.round((curRev - prevRev) * 100) / 100;
    const maxRev = Math.max(curRev, prevRev, 1);

    const curTx = sa.transactionCount;
    const prevTx = sa.prevTransactionCount;
    const txDiff = curTx - prevTx;
    const maxTx = Math.max(curTx, prevTx, 1);

    const curTicket = sa.averageTicket;
    const prevTicket = sa.prevAverageTicket;
    const ticketDiff = Math.round((curTicket - prevTicket) * 100) / 100;
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
      CreditCard: '#3b82f6',
      'Tarjeta de Crédito': '#3b82f6',
      DebitCard: '#06b6d4',
      'Tarjeta de Débito': '#06b6d4',
      Transfer: '#6366f1',   // Índigo
      Transferencia: '#6366f1',
      Credit: '#8b5cf6',
      'Crédito': '#8b5cf6',
      Nequi: '#a855f7',
      Daviplata: '#ef4444'
    };

    let accumulatedPct = 0;
    return methods.map((m, idx) => {
      const pct = m.percentage;
      const strokeDash = `${pct} ${Math.max(100 - pct, 0)}`;
      const strokeOffset = 100 - accumulatedPct + 25;
      accumulatedPct += pct;
      const color = colors[m.method] || (idx % 2 === 0 ? '#8b5cf6' : '#ec4899');
      return {
        rawMethod: m.method,
        method: this.formatPaymentMethod(m.method),
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

  // Selector de métrica en Top Productos (Facturación vs Unidades)
  topProductsMode = signal<'revenue' | 'volume'>('revenue');

  // Selector de métrica en Actividad Horaria (Transacciones vs Facturación)
  hourlyHistogramMode = signal<'transactions' | 'revenue'>('transactions');

  // 1. Gráfica y Podio de Top Productos
  topProductsChart = computed(() => {
    const items = this.topProductsData();
    if (!items || items.length === 0) return null;
    const maxRevenue = Math.max(...items.map(i => i.totalRevenue), 1);
    const maxUnits = Math.max(...items.map(i => i.unitsSold), 1);
    const totalTopRevenue = items.reduce((acc, i) => acc + i.totalRevenue, 0);
    const totalTopUnits = items.reduce((acc, i) => acc + i.unitsSold, 0);
    const starProduct = items[0];

    const enriched = items.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      revenueBarPct: Math.max(Math.round((item.totalRevenue / maxRevenue) * 100), 4),
      unitsBarPct: Math.max(Math.round((item.unitsSold / maxUnits) * 100), 4),
      revenueSharePct: totalTopRevenue > 0 ? Math.round((item.totalRevenue / totalTopRevenue) * 1000) / 10 : 0,
      unitsSharePct: totalTopUnits > 0 ? Math.round((item.unitsSold / totalTopUnits) * 1000) / 10 : 0
    }));

    return {
      items: enriched,
      starProduct,
      totalTopRevenue,
      totalTopUnits,
      averageUnitPrice: totalTopUnits > 0 ? Math.round(totalTopRevenue / totalTopUnits) : 0
    };
  });

  // 2. Gráfica Donut & Barras de Contribución por Categoría
  categoriesChartData = computed(() => {
    const cats = this.salesCategories();
    if (!cats || cats.length === 0) return null;
    const totalRevenue = cats.reduce((acc, c) => acc + c.totalRevenue, 0);
    const totalUnits = cats.reduce((acc, c) => acc + c.unitsSold, 0);
    const maxRevenue = Math.max(...cats.map(c => c.totalRevenue), 1);

    const palette = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#06b6d4', '#14b8a6'];
    let accumulatedPct = 0;

    const segments = cats.map((cat, idx) => {
      const pct = totalRevenue > 0 ? (cat.totalRevenue / totalRevenue) * 100 : 0;
      const roundedPct = Math.round(pct * 10) / 10;
      const strokeDash = `${roundedPct} ${Math.max(100 - roundedPct, 0)}`;
      const strokeOffset = 100 - accumulatedPct + 25;
      accumulatedPct += roundedPct;
      const color = palette[idx % palette.length];
      const avgTicket = cat.transactionCount > 0 ? Math.round(cat.totalRevenue / cat.transactionCount) : 0;

      return {
        ...cat,
        color,
        sharePct: roundedPct,
        strokeDash,
        strokeOffset,
        avgTicket,
        barWidth: Math.max(Math.round((cat.totalRevenue / maxRevenue) * 100), 4)
      };
    });

    const starCategory = [...cats].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
    const highVolumeCategory = [...cats].sort((a, b) => b.unitsSold - a.unitsSold)[0];

    return {
      totalRevenue,
      totalUnits,
      segments,
      starCategory,
      highVolumeCategory
    };
  });

  // 3. Histograma SVG y Diagrama de Jornadas en Actividad Horaria
  hourlyHistogramData = computed(() => {
    const hours = this.hourlyActivity();
    if (!hours || hours.length === 0) return null;
    const maxTx = Math.max(...hours.map(h => h.transactionCount), 1);
    const maxRev = Math.max(...hours.map(h => h.totalRevenue), 1);
    const totalTx = hours.reduce((acc, h) => acc + h.transactionCount, 0);
    const totalRev = hours.reduce((acc, h) => acc + h.totalRevenue, 0);
    const peakHour = hours.find(h => h.isPeakHour) || [...hours].sort((a, b) => b.transactionCount - a.transactionCount)[0];

    // Agrupación por franjas de la jornada comercial
    const morning = hours.filter(h => h.hour >= 6 && h.hour < 12);
    const afternoon = hours.filter(h => h.hour >= 12 && h.hour < 18);
    const evening = hours.filter(h => h.hour >= 18 && h.hour <= 23);
    const night = hours.filter(h => h.hour >= 0 && h.hour < 6);

    const calcSlot = (slot: HourlyActivityItem[]) => {
      const tx = slot.reduce((acc, h) => acc + h.transactionCount, 0);
      const rev = slot.reduce((acc, h) => acc + h.totalRevenue, 0);
      return {
        tx,
        rev,
        pct: totalTx > 0 ? Math.round((tx / totalTx) * 100) : 0
      };
    };

    const enrichedHours = hours.map(h => ({
      ...h,
      heightPct: Math.max(Math.round((h.transactionCount / maxTx) * 100), h.transactionCount > 0 ? 8 : 2),
      revenueHeightPct: Math.max(Math.round((h.totalRevenue / maxRev) * 100), h.totalRevenue > 0 ? 8 : 2)
    }));

    return {
      hours: enrichedHours,
      maxTx,
      maxRev,
      totalTx,
      totalRev,
      peakHour,
      slots: {
        morning: calcSlot(morning),
        afternoon: calcSlot(afternoon),
        evening: calcSlot(evening),
        night: calcSlot(night)
      }
    };
  });

  // 4. Leaderboard & Rendimiento por Empleado
  employeesChartData = computed(() => {
    const emps = this.salesEmployees();
    if (!emps || emps.length === 0) return null;
    const maxRev = Math.max(...emps.map(e => e.totalRevenue), 1);
    const totalRev = emps.reduce((acc, e) => acc + e.totalRevenue, 0);
    const totalTx = emps.reduce((acc, e) => acc + e.transactionCount, 0);
    const teamAverageTicket = totalTx > 0 ? Math.round(totalRev / totalTx) : 0;
    const averageSalesPerEmployee = Math.round(totalRev / emps.length);

    const enriched = emps.map((emp, idx) => ({
      ...emp,
      rank: idx + 1,
      barWidth: Math.max(Math.round((emp.totalRevenue / maxRev) * 100), 4),
      sharePct: totalRev > 0 ? Math.round((emp.totalRevenue / totalRev) * 1000) / 10 : 0
    }));

    return {
      employees: enriched,
      topPerformer: enriched[0],
      totalRev,
      totalTx,
      teamAverageTicket,
      averageSalesPerEmployee
    };
  });

  // 5. Cascada Financiera y Medidor de Margen (Finance)
  financeWaterfallData = computed(() => {
    const data = this.profitabilityData();
    if (!data) return null;
    const rev = data.totalRevenue;
    const cogs = data.totalCostOfGoodsSold;
    const grossProfit = data.grossProfit;
    const marginPct = data.grossMarginPercentage;

    const cogsSharePct = rev > 0 ? Math.round((cogs / rev) * 1000) / 10 : 0;
    const profitSharePct = rev > 0 ? Math.round((grossProfit / rev) * 1000) / 10 : 0;

    let healthStatus: 'healthy' | 'moderate' | 'critical' = 'healthy';
    let healthLabel = 'Margen Saludable';
    let healthColor = '#10b981';

    if (marginPct < 15) {
      healthStatus = 'critical';
      healthLabel = 'Margen Crítico (< 15%)';
      healthColor = '#ef4444';
    } else if (marginPct < 30) {
      healthStatus = 'moderate';
      healthLabel = 'Margen Moderado (15-30%)';
      healthColor = '#f59e0b';
    }

    const items = data.productDetails?.items || [];
    const topProfitItem = items.length > 0 ? [...items].sort((a, b) => b.grossProfit - a.grossProfit)[0] : null;
    const topMarginItem = items.length > 0 ? [...items].sort((a, b) => b.grossMarginPercentage - a.grossMarginPercentage)[0] : null;

    return {
      revenue: rev,
      cogs,
      grossProfit,
      marginPct,
      cogsSharePct,
      profitSharePct,
      healthStatus,
      healthLabel,
      healthColor,
      topProfitItem,
      topMarginItem
    };
  });

  // 6. Arqueos de Caja POS & Diagrama de Descuadres
  cashReconciliationChartData = computed(() => {
    const data = this.cashReconciliationData();
    if (!data) return null;
    const sessions = data.sessions?.items || [];
    const totalSessions = data.totalSessionsCount || sessions.length;

    const balanced = sessions.filter(s => s.differenceStatus === 'Balanced' || Math.abs(s.difference ?? 0) < 0.01).length;
    const surplus = sessions.filter(s => s.differenceStatus === 'Surplus' || (s.difference ?? 0) > 0.01).length;
    const shortage = sessions.filter(s => s.differenceStatus === 'Shortage' || (s.difference ?? 0) < -0.01).length;

    const balancedPct = totalSessions > 0 ? Math.round((balanced / totalSessions) * 100) : 100;
    const surplusPct = totalSessions > 0 ? Math.round((surplus / totalSessions) * 100) : 0;
    const shortagePct = totalSessions > 0 ? Math.round((shortage / totalSessions) * 100) : 0;

    const totalExpected = data.totalExpectedCash;
    const totalActual = data.totalActualCash;
    const maxCash = Math.max(totalExpected, totalActual, 1);
    const expectedBarPct = Math.max(Math.round((totalExpected / maxCash) * 100), 4);
    const actualBarPct = Math.max(Math.round((totalActual / maxCash) * 100), 4);

    const electronic = data.totalElectronicInflow;
    const totalInflow = totalExpected + electronic;
    const cashShare = totalInflow > 0 ? Math.round((totalExpected / totalInflow) * 100) : 50;
    const electronicShare = 100 - cashShare;

    return {
      totalSessions,
      balanced,
      surplus,
      shortage,
      balancedPct,
      surplusPct,
      shortagePct,
      totalExpected,
      totalActual,
      totalDifference: data.totalDifference,
      expectedBarPct,
      actualBarPct,
      cashShare,
      electronicShare,
      electronic
    };
  });

  // 7. Balance Transaccional de Kardex (Entradas vs Salidas)
  kardexChartData = computed(() => {
    const data = this.inventoryData();
    if (!data || !data.items || data.items.length === 0) return null;
    const items = data.items;

    let totalInflowUnits = 0;
    let totalOutflowUnits = 0;
    let inflowCount = 0;
    let outflowCount = 0;

    const typeCounts: Record<string, { count: number; units: number }> = {};

    items.forEach(m => {
      const delta = m.quantityDelta;
      const type = m.type;
      if (!typeCounts[type]) {
        typeCounts[type] = { count: 0, units: 0 };
      }
      typeCounts[type].count++;
      typeCounts[type].units += Math.abs(delta);

      if (delta > 0) {
        totalInflowUnits += delta;
        inflowCount++;
      } else {
        totalOutflowUnits += Math.abs(delta);
        outflowCount++;
      }
    });

    const totalUnitsMoved = totalInflowUnits + totalOutflowUnits;
    const inflowPct = totalUnitsMoved > 0 ? Math.round((totalInflowUnits / totalUnitsMoved) * 100) : 50;
    const outflowPct = 100 - inflowPct;
    const netDelta = totalInflowUnits - totalOutflowUnits;

    const maxTypeUnits = Math.max(...Object.values(typeCounts).map(v => v.units), 1);
    const typesList = Object.keys(typeCounts).map(type => ({
      type,
      label: this.formatMovementType(type),
      count: typeCounts[type].count,
      units: typeCounts[type].units,
      barPct: Math.max(Math.round((typeCounts[type].units / maxTypeUnits) * 100), 4)
    })).sort((a, b) => b.units - a.units);

    return {
      totalInflowUnits,
      totalOutflowUnits,
      inflowCount,
      outflowCount,
      totalUnitsMoved,
      inflowPct,
      outflowPct,
      netDelta,
      typesList
    };
  });

  // 8. Salud del Catálogo de Productos y Valuación
  productsCatalogChartData = computed(() => {
    const data = this.productsData();
    if (!data || !data.items || data.items.length === 0) return null;
    const items = data.items;

    const normalStock = items.filter(p => p.currentStock > p.minimumStock).length;
    const lowStock = items.filter(p => p.currentStock <= p.minimumStock && p.currentStock > 0).length;
    const outOfStock = items.filter(p => p.currentStock <= 0).length;
    const total = items.length;

    const normalPct = total > 0 ? Math.round((normalStock / total) * 100) : 0;
    const lowPct = total > 0 ? Math.round((lowStock / total) * 100) : 0;
    const outPct = total > 0 ? 100 - normalPct - lowPct : 0;

    const totalCost = items.reduce((acc, p) => acc + (p.purchasePrice * Math.max(p.currentStock, 0)), 0);
    const totalRetail = items.reduce((acc, p) => acc + (p.salePrice * Math.max(p.currentStock, 0)), 0);
    const potentialProfit = totalRetail - totalCost;
    const averageMargin = totalRetail > 0 ? Math.round((potentialProfit / totalRetail) * 1000) / 10 : 0;

    return {
      total,
      normalStock,
      lowStock,
      outOfStock,
      normalPct,
      lowPct,
      outPct,
      totalCost,
      totalRetail,
      potentialProfit,
      averageMargin
    };
  });

  // 9. Matriz de Severidad y Reposición de Bajo Stock
  lowStockChartData = computed(() => {
    const data = this.lowStockData();
    if (!data || !data.items || data.items.length === 0) return null;
    const items = data.items;

    const critical = items.filter(p => p.currentStock <= 0).length;
    const highRisk = items.filter(p => p.currentStock > 0 && p.currentStock <= p.minimumStock * 0.25).length;
    const moderate = items.filter(p => p.currentStock > p.minimumStock * 0.25).length;
    const total = items.length;

    const totalDeficit = items.reduce((acc, p) => acc + p.deficit, 0);
    const totalRestockCost = items.reduce((acc, p) => acc + p.estimatedRestockCost, 0);

    const maxDeficit = Math.max(...items.map(p => p.deficit), 1);
    const topCritical = [...items]
      .sort((a, b) => b.deficit - a.deficit)
      .slice(0, 5)
      .map(p => ({
        ...p,
        deficitBarPct: Math.max(Math.round((p.deficit / maxDeficit) * 100), 5)
      }));

    return {
      total,
      critical,
      highRisk,
      moderate,
      criticalPct: total > 0 ? Math.round((critical / total) * 100) : 0,
      highRiskPct: total > 0 ? Math.round((highRisk / total) * 100) : 0,
      moderatePct: total > 0 ? Math.round((moderate / total) * 100) : 0,
      totalDeficit,
      totalRestockCost,
      topCritical
    };
  });

  // 10. Diagrama de Estado de Compras y Gasto por Proveedor
  purchasesChartData = computed(() => {
    const data = this.purchasesData();
    if (!data || !data.items || data.items.length === 0) return null;
    const items = data.items;

    const received = items.filter(p => p.status === 'Received' || p.status === 'Recibida');
    const pending = items.filter(p => p.status === 'Pending' || p.status === 'Pendiente');
    const cancelled = items.filter(p => p.status === 'Cancelled' || p.status === 'Anulada');

    const receivedAmount = received.reduce((acc, p) => acc + p.total, 0);
    const pendingAmount = pending.reduce((acc, p) => acc + p.total, 0);
    const cancelledAmount = cancelled.reduce((acc, p) => acc + p.total, 0);
    const totalInvoiced = items.reduce((acc, p) => acc + p.total, 0);
    const totalTax = items.reduce((acc, p) => acc + p.tax, 0);

    const supplierMap: Record<string, { count: number; total: number }> = {};
    items.forEach(p => {
      const sName = p.supplierName || 'Sin Proveedor';
      if (!supplierMap[sName]) supplierMap[sName] = { count: 0, total: 0 };
      supplierMap[sName].count++;
      supplierMap[sName].total += p.total;
    });

    const maxSupplierTotal = Math.max(...Object.values(supplierMap).map(s => s.total), 1);
    const topSuppliers = Object.keys(supplierMap).map(name => ({
      name,
      count: supplierMap[name].count,
      total: supplierMap[name].total,
      barPct: Math.max(Math.round((supplierMap[name].total / maxSupplierTotal) * 100), 5),
      sharePct: totalInvoiced > 0 ? Math.round((supplierMap[name].total / totalInvoiced) * 100) : 0
    })).sort((a, b) => b.total - a.total).slice(0, 5);

    return {
      totalOrders: items.length,
      totalInvoiced,
      totalTax,
      receivedCount: received.length,
      receivedAmount,
      pendingCount: pending.length,
      pendingAmount,
      cancelledCount: cancelled.length,
      cancelledAmount,
      topSuppliers,
      topSupplier: topSuppliers.length > 0 ? topSuppliers[0] : null
    };
  });

  // 11. Trazabilidad de Auditoría por Acción y Entidad
  auditChartData = computed(() => {
    const data = this.auditData();
    if (!data || !data.items || data.items.length === 0) return null;
    const items = data.items;

    const entityMap: Record<string, number> = {};
    const actionMap: Record<string, number> = {};
    const userMap: Record<string, number> = {};

    items.forEach(ev => {
      entityMap[ev.entityName] = (entityMap[ev.entityName] || 0) + 1;
      actionMap[ev.action] = (actionMap[ev.action] || 0) + 1;
      userMap[ev.userName] = (userMap[ev.userName] || 0) + 1;
    });

    const total = items.length;
    const maxEntity = Math.max(...Object.values(entityMap), 1);
    const entities = Object.keys(entityMap).map(e => ({
      name: e,
      count: entityMap[e],
      barPct: Math.max(Math.round((entityMap[e] / maxEntity) * 100), 5),
      sharePct: Math.round((entityMap[e] / total) * 100)
    })).sort((a, b) => b.count - a.count);

    const actions = Object.keys(actionMap).map(a => ({
      action: a,
      count: actionMap[a],
      sharePct: Math.round((actionMap[a] / total) * 100)
    })).sort((a, b) => b.count - a.count);

    const users = Object.keys(userMap).map(u => ({
      name: u,
      count: userMap[u]
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      total,
      entities,
      actions,
      users,
      topEntity: entities.length > 0 ? entities[0] : null,
      topUser: users.length > 0 ? users[0] : null
    };
  });

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
      case 'inventory-valuation': return '💎 Valoración Financiera y Patrimonial de Inventario';
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
      case 'inventory-valuation': return this.inventoryValuationData()?.totalCount || 0;
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
      case 'inventory-valuation':
        return this.inventoryValuationData();
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

  // Conjunto de datos crudos activos para la tabla seleccionada
  activeTableRawItems = computed<any[]>(() => {
    switch (this.selectedReport()) {
      case 'sales': return this.salesData()?.items || [];
      case 'sales-top': return this.topProductsData() || [];
      case 'sales-categories': return this.salesCategories() || [];
      case 'sales-hourly': return this.hourlyActivity() || [];
      case 'sales-employees': return this.salesEmployees() || [];
      case 'finance': return this.profitabilityData()?.productDetails?.items || [];
      case 'cash-reconciliation': return this.cashReconciliationData()?.sessions?.items || [];
      case 'inventory': return this.inventoryData()?.items || [];
      case 'inventory-valuation': return this.inventoryValuationData()?.items || [];
      case 'products': return this.productsData()?.items || [];
      case 'low-stock': return this.lowStockData()?.items || [];
      case 'purchases': return this.purchasesData()?.items || [];
      case 'audit': return this.auditData()?.items || [];
      default: return [];
    }
  });

  // Gestor reactivo de ordenamiento por todas las columnas y búsqueda omni-campo
  readonly tableState = new TableStateManager<any>({
    data: () => this.activeTableRawItems()
  });

  exportActiveTableCsv(): void {
    const rep = this.selectedReport();
    const data = this.tableState.processedItems();
    if (!data || data.length === 0) return;

    const columnMap: Record<string, { key: string; header: string }[]> = {
      sales: [
        { key: 'saleNumber', header: 'Factura' },
        { key: 'createdAt', header: 'Fecha' },
        { key: 'customerName', header: 'Cliente' },
        { key: 'paymentMethod', header: 'Método' },
        { key: 'status', header: 'Estado' },
        { key: 'subtotal', header: 'Subtotal' },
        { key: 'tax', header: 'IVA' },
        { key: 'total', header: 'Total' },
        { key: 'itemsCount', header: 'Líneas' }
      ],
      'sales-top': [
        { key: 'rank', header: 'Puesto' },
        { key: 'productName', header: 'Producto' },
        { key: 'sku', header: 'SKU' },
        { key: 'categoryName', header: 'Categoría' },
        { key: 'unitsSold', header: 'Unidades Vendidas' },
        { key: 'totalRevenue', header: 'Ingresos Totales' },
        { key: 'profitMargin', header: 'Margen (%)' }
      ],
      'sales-categories': [
        { key: 'categoryName', header: 'Categoría' },
        { key: 'itemsSold', header: 'Unidades Vendidas' },
        { key: 'totalRevenue', header: 'Ventas Totales' },
        { key: 'sharePercentage', header: 'Participación (%)' }
      ],
      'sales-hourly': [
        { key: 'timeSlot', header: 'Franja Horaria' },
        { key: 'transactionCount', header: 'Transacciones' },
        { key: 'totalSales', header: 'Ventas Totales' },
        { key: 'averageTicket', header: 'Ticket Promedio' },
        { key: 'sharePercentage', header: 'Participación (%)' }
      ],
      'sales-employees': [
        { key: 'employeeName', header: 'Empleado' },
        { key: 'role', header: 'Rol' },
        { key: 'transactionCount', header: 'Ventas Concluidas' },
        { key: 'totalSales', header: 'Ingresos Generados' },
        { key: 'averageTicket', header: 'Ticket Medio' }
      ],
      finance: [
        { key: 'productName', header: 'Producto' },
        { key: 'sku', header: 'SKU' },
        { key: 'categoryName', header: 'Categoría' },
        { key: 'unitsSold', header: 'Unidades' },
        { key: 'revenue', header: 'Ventas Brutas' },
        { key: 'cost', header: 'Costo de Ventas' },
        { key: 'grossProfit', header: 'Utilidad Bruta' },
        { key: 'marginPercentage', header: 'Margen Bruto (%)' }
      ],
      'cash-reconciliation': [
        { key: 'sessionNumber', header: 'Sesión' },
        { key: 'cashRegisterName', header: 'Caja' },
        { key: 'userName', header: 'Cajero' },
        { key: 'openedAt', header: 'Apertura' },
        { key: 'closedAt', header: 'Cierre' },
        { key: 'initialBalance', header: 'Saldo Inicial' },
        { key: 'expectedBalance', header: 'Saldo Teórico' },
        { key: 'actualBalance', header: 'Saldo Real' },
        { key: 'difference', header: 'Diferencia' },
        { key: 'status', header: 'Estado' }
      ],
      inventory: [
        { key: 'createdAt', header: 'Fecha' },
        { key: 'movementType', header: 'Tipo Movimiento' },
        { key: 'productName', header: 'Producto' },
        { key: 'sku', header: 'SKU' },
        { key: 'quantity', header: 'Cantidad' },
        { key: 'warehouseName', header: 'Almacén' },
        { key: 'userName', header: 'Responsable' },
        { key: 'notes', header: 'Notas/Referencia' }
      ],
      'inventory-valuation': [
        { key: 'productName', header: 'Producto' },
        { key: 'sku', header: 'SKU' },
        { key: 'categoryName', header: 'Categoría' },
        { key: 'currentStock', header: 'Stock Actual' },
        { key: 'averageCost', header: 'Costo Unitario' },
        { key: 'salePrice', header: 'Precio Venta' },
        { key: 'totalValuation', header: 'Valuación Costo' },
        { key: 'totalPotentialRevenue', header: 'Valuación Venta' },
        { key: 'abcClassification', header: 'Clasificación ABC' }
      ],
      products: [
        { key: 'name', header: 'Producto' },
        { key: 'sku', header: 'SKU' },
        { key: 'categoryName', header: 'Categoría' },
        { key: 'supplierName', header: 'Proveedor' },
        { key: 'currentStock', header: 'Stock Actual' },
        { key: 'minimumStock', header: 'Stock Mínimo' },
        { key: 'purchasePrice', header: 'Precio Compra' },
        { key: 'salePrice', header: 'Precio Venta' },
        { key: 'stockStatus', header: 'Estado Stock' }
      ],
      'low-stock': [
        { key: 'productName', header: 'Producto' },
        { key: 'sku', header: 'SKU' },
        { key: 'categoryName', header: 'Categoría' },
        { key: 'warehouseName', header: 'Almacén' },
        { key: 'currentStock', header: 'Stock Actual' },
        { key: 'minimumStock', header: 'Stock Mínimo' },
        { key: 'deficit', header: 'Déficit' },
        { key: 'estimatedRestockCost', header: 'Costo Reposición' },
        { key: 'status', header: 'Estado' }
      ],
      purchases: [
        { key: 'purchaseNumber', header: 'Orden Compra' },
        { key: 'purchaseDate', header: 'Fecha' },
        { key: 'supplierName', header: 'Proveedor' },
        { key: 'status', header: 'Estado' },
        { key: 'subtotal', header: 'Subtotal' },
        { key: 'tax', header: 'IVA' },
        { key: 'total', header: 'Total' },
        { key: 'itemsCount', header: 'Líneas' }
      ],
      audit: [
        { key: 'createdAt', header: 'Fecha y Hora' },
        { key: 'userName', header: 'Usuario' },
        { key: 'action', header: 'Acción' },
        { key: 'entityName', header: 'Entidad' },
        { key: 'details', header: 'Detalles' },
        { key: 'ipAddress', header: 'IP' }
      ]
    };

    const columns = columnMap[rep] || Object.keys(data[0] || {}).map(k => ({ key: k, header: k }));
    this.csvExportService.exportToCsv({
      filename: `reporte_${rep}_${new Date().toISOString().slice(0, 10)}`,
      columns,
      data
    });
  }

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
    } else if (type === 'inventory' || type === 'inventory-valuation' || type === 'low-stock') {
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

    this.tableState.resetSort();
    this.tableState.setSearch('');
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

    this.tableState.resetSort();
    this.tableState.setSearch('');
    this.pageNumber.set(1);
    this.loadTableData();
  }

  onCustomDateChange(): void {
    this.activePreset.set('custom');
    this.tableState.resetSort();
    this.tableState.setSearch('');
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
      this.reportService.getSalesHourlyActivity(start, end, wid).subscribe({
        next: (hourly) => this.hourlyActivity.set(hourly),
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

      case 'inventory-valuation':
        this.reportService.getInventoryValuationSummary(wid).subscribe({
          next: (summary) => this.inventoryValuationSummary.set(summary),
          error: () => {}
        });
        this.reportService.getInventoryValuationByCategory(wid).subscribe({
          next: (cats) => this.inventoryValuationByCategory.set(cats),
          error: () => {}
        });
        this.reportService.getInventoryValuationDetails(
          wid,
          this.selectedValuationCategoryId(),
          this.selectedAbcClass(),
          this.stagnantOnlyFilter(),
          term,
          page,
          size
        ).subscribe({
          next: (res) => {
            this.inventoryValuationData.set(res);
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

  setAbcFilter(abc: string | null): void {
    this.selectedAbcClass.set(abc);
    this.tableState.resetSort();
    this.tableState.setSearch('');
    this.pageNumber.set(1);
    this.loadTableData();
  }

  toggleStagnantFilter(): void {
    this.stagnantOnlyFilter.update(v => !v);
    this.tableState.resetSort();
    this.tableState.setSearch('');
    this.pageNumber.set(1);
    this.loadTableData();
  }

  setValuationCategoryFilter(catId: number | null): void {
    this.selectedValuationCategoryId.set(catId);
    this.tableState.resetSort();
    this.tableState.setSearch('');
    this.pageNumber.set(1);
    this.loadTableData();
  }

  onSearchChange(term: string): void {
    this.searchSubject.next(term);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.tableState.resetSort();
    this.tableState.setSearch('');
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
    this.tableState.resetSort();
    this.tableState.setSearch('');
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

  // Métodos de formato y traducción a español
  formatPaymentMethod(method?: string | null): string {
    if (!method) return '-';
    const map: Record<string, string> = {
      Cash: 'Efectivo',
      Mixed: 'Mixto',
      Card: 'Tarjeta',
      CreditCard: 'Tarjeta de Crédito',
      DebitCard: 'Tarjeta de Débito',
      Transfer: 'Transferencia',
      Credit: 'Crédito',
      Nequi: 'Nequi',
      Daviplata: 'Daviplata'
    };
    return map[method] || method;
  }

  formatSaleStatus(status?: string | null): string {
    if (!status) return '-';
    const map: Record<string, string> = {
      Completed: 'Completada',
      Cancelled: 'Anulada',
      Draft: 'Borrador'
    };
    return map[status] || status;
  }

  formatUserRole(role?: string | null): string {
    if (!role) return 'N/A';
    const map: Record<string, string> = {
      Admin: 'Administrador',
      SuperAdmin: 'Super Administrador',
      Seller: 'Vendedor',
      Warehouse: 'Almacén'
    };
    return map[role] || role;
  }

  formatCashRegisterStatus(status?: string | null): string {
    if (!status) return '-';
    const map: Record<string, string> = {
      Open: 'Abierta',
      Closed: 'Cerrada'
    };
    return map[status] || status;
  }

  formatDifferenceStatus(status?: string | null): string {
    if (!status) return 'Pendiente';
    const map: Record<string, string> = {
      Balanced: 'Cuadrada',
      Surplus: 'Sobrante',
      Shortage: 'Faltante'
    };
    return map[status] || status;
  }

  formatPurchaseStatus(status?: string | null): string {
    if (!status) return '-';
    const map: Record<string, string> = {
      Pending: 'Pendiente',
      Received: 'Recibida',
      Cancelled: 'Anulada'
    };
    return map[status] || status;
  }

  formatMovementType(type?: string | null): string {
    if (!type) return '-';
    const map: Record<string, string> = {
      Purchase: 'Compra',
      Sale: 'Venta',
      AdjustmentIn: 'Ajuste Entrada',
      AdjustmentOut: 'Ajuste Salida',
      Return: 'Devolución',
      Entry: 'Entrada',
      Exit: 'Salida',
      Adjustment: 'Ajuste'
    };
    return map[type] || type;
  }
}
