import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector, signal } from '@angular/core';
import { ReportsComponent } from './reports.component';
import { ReportService } from '../../core/services/report.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { of } from 'rxjs';

describe('ReportsComponent (Unit Tests)', () => {
  const dummyPagedResult = {
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 10,
    totalPages: 0,
    totalAmount: 0,
    totalQuantity: 0
  };

  const reportServiceMock = {
    getSummary: vi.fn().mockReturnValue(of({ reports: [], totalExportableRecords: 100 })),
    downloadReport: vi.fn().mockReturnValue(of(new Blob())),
    triggerBrowserDownload: vi.fn(),
    getSalesData: vi.fn().mockReturnValue(of(dummyPagedResult)),
    getInventoryKardexData: vi.fn().mockReturnValue(of(dummyPagedResult)),
    getPurchasesData: vi.fn().mockReturnValue(of(dummyPagedResult)),
    getProductsData: vi.fn().mockReturnValue(of(dummyPagedResult)),
    getLowStockData: vi.fn().mockReturnValue(of(dummyPagedResult)),
    getSalesSummaryMetrics: vi.fn().mockReturnValue(of({
      totalSalesAmount: 5000,
      totalOrdersCount: 20,
      averageTicket: 250,
      cashAmount: 3000,
      electronicAmount: 2000,
      paymentMethods: []
    })),
    getTopProducts: vi.fn().mockReturnValue(of([])),
    getProfitability: vi.fn().mockReturnValue(of({
      summary: { totalRevenue: 10000, totalCost: 6000, grossProfit: 4000, grossMarginPercentage: 40, totalUnitsSold: 100 },
      items: dummyPagedResult
    })),
    getCashRegisterReconciliation: vi.fn().mockReturnValue(of({
      summary: {
        totalOpeningCash: 1000,
        totalExpectedCash: 5000,
        totalActualCash: 4950,
        totalDifference: -50,
        totalElectronicPayments: 2000,
        closedSessionsCount: 5,
        openSessionsCount: 1
      },
      sessions: dummyPagedResult
    })),
    getAuditActivity: vi.fn().mockReturnValue(of(dummyPagedResult)),
    getSalesAnalyticsSummary: vi.fn().mockReturnValue(of({
      totalRevenue: 5000,
      netRevenue: 4200,
      tax: 800,
      transactionCount: 20,
      averageTicket: 250,
      unitsSold: 45,
      prevTotalRevenue: 4000,
      prevTransactionCount: 16,
      prevAverageTicket: 250,
      revenueGrowthPct: 25.0,
      transactionsGrowthPct: 25.0,
      ticketGrowthPct: 0.0,
      paymentMethods: []
    })),
    getSalesByCategory: vi.fn().mockReturnValue(of([
      { categoryId: 1, categoryName: 'Tecnología', unitsSold: 10, totalRevenue: 2500, sharePercentage: 50, transactionCount: 8 }
    ])),
    getSalesHourlyActivity: vi.fn().mockReturnValue(of([
      { hour: 14, hourLabel: '14:00 - 14:59', transactionCount: 12, totalRevenue: 3000, isPeakHour: true }
    ])),
    getSalesByEmployee: vi.fn().mockReturnValue(of([
      { userId: 1, employeeName: 'Juan Pérez', role: 'Vendedor', transactionCount: 15, totalRevenue: 3750, averageTicket: 250, sharePercentage: 75 }
    ])),
    getSalesTrends: vi.fn().mockReturnValue(of([]))
  };

  const dashboardServiceMock = {
    getSummary: vi.fn().mockReturnValue(of({
      kpis: {
        totalInventoryValuation: 50000,
        totalStockUnits: 1000,
        totalProductsCount: 50,
        totalSalesAmount: 20000,
        totalPurchasesAmount: 15000
      },
      categories: [
        { categoryId: 1, categoryName: 'Hardware', productCount: 20, totalStock: 500, percentage: 40 }
      ]
    }))
  };

  const branchContextServiceMock = {
    selectedWarehouseId: signal<number | null>(1),
    assignedWarehouseName: signal<string>('Sede Principal Norte')
  };

  const injector = createEnvironmentInjector([
    ReportsComponent,
    { provide: ReportService, useValue: reportServiceMock },
    { provide: DashboardService, useValue: dashboardServiceMock },
    { provide: BranchContextService, useValue: branchContextServiceMock }
  ], null as any);

  const component = injector.get(ReportsComponent);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should instantiate and load analytics summary with default today filter', () => {
    expect(component).toBeTruthy();
    expect(component.activePreset()).toBe('today');
    expect(component.startDate()).toBeTruthy();
    expect(component.endDate()).toBeTruthy();

    component.loadSummary();
    component.loadAnalytics();

    expect(reportServiceMock.getSummary).toHaveBeenCalled();
    expect(dashboardServiceMock.getSummary).toHaveBeenCalled();
  });

  it('should compute profit margin correctly from dashboard KPIs', () => {
    component.loadAnalytics();
    // (20000 - 15000) / 20000 * 100 = 25%
    expect(component.profitMargin()).toBe(25);
  });

  it('should update date ranges on setDatePreset for today, thisMonth and all', () => {
    // Preset Hoy
    component.setDatePreset('today');
    expect(component.activePreset()).toBe('today');
    expect(component.startDate()).toEqual(component.endDate());

    // Preset Mes Actual
    component.setDatePreset('thisMonth');
    expect(component.activePreset()).toBe('thisMonth');
    expect(component.startDate()).toMatch(/^\d{4}-\d{2}-01$/);
    expect(component.endDate()).toBeTruthy();

    // Preset 7 días
    component.setDatePreset('7days');
    expect(component.activePreset()).toBe('7days');
    expect(component.startDate()).toBeTruthy();
    expect(component.endDate()).toBeTruthy();

    // Preset Ayer
    component.setDatePreset('yesterday');
    expect(component.activePreset()).toBe('yesterday');
    expect(component.startDate()).toBeTruthy();
    expect(component.endDate()).toBeTruthy();

    // Preset Mes Anterior
    component.setDatePreset('lastMonth');
    expect(component.activePreset()).toBe('lastMonth');
    expect(component.startDate()).toMatch(/^\d{4}-\d{2}-01$/);

    // Preset Todo el histórico
    component.setDatePreset('all');
    expect(component.startDate()).toBe('');
    expect(component.endDate()).toBe('');
  });

  it('should switch categories and load corresponding INSINCRO datasets', () => {
    // Categoría Finanzas
    component.selectCategory('finance');
    expect(component.selectedCategory()).toBe('finance');
    expect(reportServiceMock.getProfitability).toHaveBeenCalled();

    // Categoría Caja POS
    component.selectCategory('cash');
    expect(component.selectedCategory()).toBe('cash');
    expect(reportServiceMock.getCashRegisterReconciliation).toHaveBeenCalled();

    // Categoría Auditoría
    component.selectCategory('audit');
    expect(component.selectedCategory()).toBe('audit');
    expect(reportServiceMock.getAuditActivity).toHaveBeenCalled();
  });

  it('should switch report tab and load tabular data', () => {
    component.selectReport('inventory');
    expect(component.selectedReport()).toBe('inventory');
    expect(reportServiceMock.getInventoryKardexData).toHaveBeenCalled();

    component.selectReport('purchases');
    expect(component.selectedReport()).toBe('purchases');
    expect(reportServiceMock.getPurchasesData).toHaveBeenCalled();

    component.selectReport('products');
    expect(component.selectedReport()).toBe('products');
    expect(reportServiceMock.getProductsData).toHaveBeenCalled();

    component.selectReport('low-stock');
    expect(component.selectedReport()).toBe('low-stock');
    expect(reportServiceMock.getLowStockData).toHaveBeenCalled();
  });

  it('should switch to sales analytics sub-tabs and load specialized datasets', () => {
    // Sub-pestaña Por Categoría
    component.selectReport('sales-categories');
    expect(component.selectedReport()).toBe('sales-categories');
    expect(reportServiceMock.getSalesByCategory).toHaveBeenCalled();
    expect(component.salesCategories().length).toBe(1);
    expect(component.tableTitle()).toContain('Categoría');

    // Sub-pestaña Horarios Pico
    component.selectReport('sales-hourly');
    expect(component.selectedReport()).toBe('sales-hourly');
    expect(reportServiceMock.getSalesHourlyActivity).toHaveBeenCalled();
    expect(component.hourlyActivity().length).toBe(1);
    expect(component.tableTitle()).toContain('Horarios');

    // Sub-pestaña Por Empleado
    component.selectReport('sales-employees');
    expect(component.selectedReport()).toBe('sales-employees');
    expect(reportServiceMock.getSalesByEmployee).toHaveBeenCalled();
    expect(component.salesEmployees().length).toBe(1);
    expect(component.tableTitle()).toContain('Empleado');
  });
});
