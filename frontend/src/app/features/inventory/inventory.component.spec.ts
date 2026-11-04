import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector, signal } from '@angular/core';
import { InventoryComponent } from './inventory.component';
import { InventoryService } from '../../core/services/inventory.service';
import { ProductService } from '../../core/services/product.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { AlertService } from '../../core/services/alert.service';
import { CsvExportService } from '../../shared/services/csv-export.service';
import { of } from 'rxjs';
import { InventoryMovement } from '../../core/models/inventory.model';

describe('InventoryComponent - Table Standard (Sorting, Search, CSV)', () => {
  const dummyMovements: InventoryMovement[] = [
    { id: 1, movementNumber: 'MOV-001', productId: 10, productSku: 'SKU-A', productName: 'Laptop Gamer', movementType: 'Purchase', quantityDelta: 5, previousStock: 10, newStock: 15, unitPrice: 2000, userId: 1, userName: 'Admin', createdAt: '2026-01-10T10:00:00Z' },
    { id: 2, movementNumber: 'MOV-002', productId: 20, productSku: 'SKU-B', productName: 'Mouse Inalámbrico', movementType: 'Sale', quantityDelta: -2, previousStock: 20, newStock: 18, unitPrice: 50, userId: 2, userName: 'Vendedor 1', createdAt: '2026-01-12T14:30:00Z' },
    { id: 3, movementNumber: 'MOV-003', productId: 30, productSku: 'SKU-C', productName: 'Teclado Mecánico', movementType: 'AdjustmentIn', quantityDelta: 10, previousStock: 5, newStock: 15, unitPrice: 100, userId: 1, userName: 'Admin', createdAt: '2026-01-08T09:15:00Z' }
  ];

  const inventoryServiceMock = {
    getKardex: vi.fn().mockReturnValue(of({
      items: dummyMovements,
      totalCount: 3,
      pageNumber: 1,
      pageSize: 10
    })),
    createAdjustment: vi.fn().mockReturnValue(of({})),
    exportCsv: vi.fn().mockReturnValue(of(new Blob()))
  };

  const productServiceMock = {
    getProducts: vi.fn().mockReturnValue(of({ items: [] }))
  };

  const branchContextServiceMock = {
    selectedWarehouseId: signal(null)
  };

  const alertServiceMock = {
    checkUnreadStatus: vi.fn()
  };

  const csvExportServiceMock = {
    exportToCsv: vi.fn()
  };

  let component: InventoryComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    const injector = createEnvironmentInjector([
      { provide: InventoryService, useValue: inventoryServiceMock },
      { provide: ProductService, useValue: productServiceMock },
      { provide: BranchContextService, useValue: branchContextServiceMock },
      { provide: AlertService, useValue: alertServiceMock },
      { provide: CsvExportService, useValue: csvExportServiceMock }
    ], null as any);

    component = injector.runInContext(() => new InventoryComponent());
    component.ngOnInit();
    component.loadKardex();
  });

  it('should initialize movements and tableState', () => {
    expect(component.movements().length).toBe(3);
    expect(component.tableState.processedItems().length).toBe(3);
  });

  it('should sort inventory movements ascending, descending, and reset', () => {
    // Sort by quantityDelta ASC
    component.tableState.toggleSort('quantityDelta');
    let items = component.tableState.processedItems();
    expect(items[0].quantityDelta).toBe(-2);
    expect(items[1].quantityDelta).toBe(5);
    expect(items[2].quantityDelta).toBe(10);

    // Sort by quantityDelta DESC
    component.tableState.toggleSort('quantityDelta');
    items = component.tableState.processedItems();
    expect(items[0].quantityDelta).toBe(10);
    expect(items[2].quantityDelta).toBe(-2);

    // Reset sort
    component.tableState.toggleSort('quantityDelta');
    items = component.tableState.processedItems();
    expect(items[0].quantityDelta).toBe(5);
  });

  it('should omni-search across any inventory movement field (productName, SKU, userName)', () => {
    component.tableState.setSearch('Teclado');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].movementNumber).toBe('MOV-003');

    component.tableState.setSearch('SKU-B');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].movementNumber).toBe('MOV-002');
  });

  it('should export inventory movements via CsvExportService', () => {
    component.exportKardexCsv();
    expect(csvExportServiceMock.exportToCsv).toHaveBeenCalledTimes(1);
    const callArgs = csvExportServiceMock.exportToCsv.mock.calls[0][0];
    expect(callArgs.filename).toContain('kardex_');
    expect(callArgs.columns.length).toBeGreaterThan(0);
    expect(callArgs.data.length).toBe(3);
  });
});

