import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { ReportsComponent } from './reports.component';
import { ReportService } from '../../core/services/report.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { of } from 'rxjs';

describe('ReportsComponent (Unit Tests)', () => {
  const reportServiceMock = {
    getSummary: vi.fn().mockReturnValue(of({ reports: [], totalExportableRecords: 100 })),
    downloadReport: vi.fn().mockReturnValue(of(new Blob())),
    triggerBrowserDownload: vi.fn()
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

  const injector = createEnvironmentInjector([
    ReportsComponent,
    { provide: ReportService, useValue: reportServiceMock },
    { provide: DashboardService, useValue: dashboardServiceMock }
  ], null as any);

  const component = injector.get(ReportsComponent);

  it('should instantiate and load analytics summary', () => {
    expect(component).toBeTruthy();
    component.loadSummary();
    component.loadAnalytics();

    expect(reportServiceMock.getSummary).toHaveBeenCalled();
    expect(dashboardServiceMock.getSummary).toHaveBeenCalled();
    expect(component.summary()?.totalExportableRecords).toBe(100);
    expect(component.dashboardData()?.kpis.totalProductsCount).toBe(50);
  });

  it('should compute profit margin correctly from dashboard KPIs', () => {
    component.loadAnalytics();
    // (20000 - 15000) / 20000 * 100 = 25%
    expect(component.profitMargin()).toBe(25);
  });

  it('should update date ranges on setDatePreset', () => {
    component.setDatePreset('7days');
    expect(component.activePreset()).toBe('7days');
    expect(component.startDate()).toBeTruthy();
    expect(component.endDate()).toBeTruthy();

    component.setDatePreset('all');
    expect(component.startDate()).toBe('');
    expect(component.endDate()).toBe('');
  });
});
