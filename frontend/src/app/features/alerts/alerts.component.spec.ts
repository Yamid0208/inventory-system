import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector, signal } from '@angular/core';
import { AlertsComponent } from './alerts.component';
import { AlertService } from '../../core/services/alert.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { CsvExportService } from '../../shared/services/csv-export.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { StockAlert } from '../../core/models/alert.model';

describe('AlertsComponent - Table Standard (Sorting, Search, CSV)', () => {
  const dummyAlerts: StockAlert[] = [
    { productId: 1, name: 'Mouse Inalámbrico', sku: 'MOU-01', categoryName: 'Accesorios', currentStock: 2, minimumStock: 10, deficit: 8, suggestedQuantity: 15, unitPurchasePrice: 15, estimatedTotalCost: 225, severity: 'Warning', supplierId: 1, supplierName: 'Tech Supplies' },
    { productId: 2, name: 'Teclado Gamer', sku: 'TEC-02', categoryName: 'Periféricos', currentStock: 0, minimumStock: 5, deficit: 5, suggestedQuantity: 10, unitPurchasePrice: 40, estimatedTotalCost: 400, severity: 'Critical', supplierId: 2, supplierName: 'Gaming World' },
    { productId: 3, name: 'Monitor 24 Pulgadas', sku: 'MON-03', categoryName: 'Pantallas', currentStock: 1, minimumStock: 8, deficit: 7, suggestedQuantity: 10, unitPurchasePrice: 120, estimatedTotalCost: 1200, severity: 'Warning', supplierId: 1, supplierName: 'Tech Supplies' }
  ];

  const alertServiceMock = {
    getStockAlerts: vi.fn().mockReturnValue(of(dummyAlerts)),
    getSummary: vi.fn().mockReturnValue(of({
      totalAlerts: 3,
      criticalCount: 1,
      warningCount: 2,
      estimatedTotalReplenishmentCost: 1825
    })),
    markAsSeen: vi.fn(),
    checkUnreadStatus: vi.fn()
  };

  const branchContextServiceMock = {
    selectedWarehouseId: signal(null)
  };

  const routerMock = {
    navigate: vi.fn()
  };

  const csvExportServiceMock = {
    exportToCsv: vi.fn()
  };

  let component: AlertsComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    const injector = createEnvironmentInjector([
      { provide: AlertService, useValue: alertServiceMock },
      { provide: BranchContextService, useValue: branchContextServiceMock },
      { provide: Router, useValue: routerMock },
      { provide: CsvExportService, useValue: csvExportServiceMock }
    ], null as any);

    component = injector.runInContext(() => new AlertsComponent());
    component.ngOnInit();
  });

  it('should initialize alerts and tableState', () => {
    expect(component.alerts().length).toBe(3);
    expect(component.tableState.processedItems().length).toBe(3);
  });

  it('should sort alerts ascending, descending, and reset', () => {
    // Sort by estimatedTotalCost ASC
    component.tableState.toggleSort('estimatedTotalCost');
    let items = component.tableState.processedItems();
    expect(items[0].estimatedTotalCost).toBe(225);
    expect(items[1].estimatedTotalCost).toBe(400);
    expect(items[2].estimatedTotalCost).toBe(1200);

    // Sort by estimatedTotalCost DESC
    component.tableState.toggleSort('estimatedTotalCost');
    items = component.tableState.processedItems();
    expect(items[0].estimatedTotalCost).toBe(1200);
    expect(items[2].estimatedTotalCost).toBe(225);

    // Reset sort
    component.tableState.toggleSort('estimatedTotalCost');
    items = component.tableState.processedItems();
    expect(items[0].estimatedTotalCost).toBe(225);
  });

  it('should omni-search across any alert field (sku, categoryName, supplierName)', () => {
    component.tableState.setSearch('Periféricos');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].sku).toBe('TEC-02');

    component.tableState.setSearch('Gaming World');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].name).toBe('Teclado Gamer');
  });

  it('should export alerts via CsvExportService', () => {
    component.exportAlertsCsv();
    expect(csvExportServiceMock.exportToCsv).toHaveBeenCalledTimes(1);
    const callArgs = csvExportServiceMock.exportToCsv.mock.calls[0][0];
    expect(callArgs.filename).toContain('alertas_stock_');
    expect(callArgs.columns.length).toBeGreaterThan(0);
    expect(callArgs.data.length).toBe(3);
  });
});
