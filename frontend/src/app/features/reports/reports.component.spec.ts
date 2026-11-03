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
    getLowStockData: vi.fn().mockReturnValue(of(dummyPagedResult))
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

    // Preset Todo el histórico
    component.setDatePreset('all');
    expect(component.startDate()).toBe('');
    expect(component.endDate()).toBe('');
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
});
