import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector, signal } from '@angular/core';
import { PurchasesComponent } from './purchases.component';
import { PurchaseService } from '../../core/services/purchase.service';
import { SupplierService } from '../../core/services/supplier.service';
import { ProductService } from '../../core/services/product.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { AlertService } from '../../core/services/alert.service';
import { CsvExportService } from '../../shared/services/csv-export.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { Purchase } from '../../core/models/purchase.model';

describe('PurchasesComponent - Table Standard (Sorting, Search, CSV)', () => {
  const dummyPurchases: Purchase[] = [
    { id: 1, purchaseNumber: 'OC-100', supplierId: 10, supplierName: 'Distribuidora Alfa', userId: 1, userName: 'Admin', purchaseDate: '2026-01-10', status: 'Received', subtotal: 100000, tax: 19000, total: 119000, items: [] },
    { id: 2, purchaseNumber: 'OC-101', supplierId: 20, supplierName: 'Comercial Beta', userId: 2, userName: 'Comprador 1', purchaseDate: '2026-01-15', status: 'Pending', subtotal: 500000, tax: 95000, total: 595000, items: [] },
    { id: 3, purchaseNumber: 'OC-102', supplierId: 30, supplierName: 'Suministros Gamma', userId: 1, userName: 'Admin', purchaseDate: '2026-01-05', status: 'Cancelled', subtotal: 200000, tax: 38000, total: 238000, items: [] }
  ];

  const purchaseServiceMock = {
    getPurchases: vi.fn().mockReturnValue(of({
      items: dummyPurchases,
      totalCount: 3,
      pageNumber: 1,
      pageSize: 10
    })),
    createPurchase: vi.fn().mockReturnValue(of({})),
    cancelPurchase: vi.fn().mockReturnValue(of({}))
  };

  const supplierServiceMock = {
    getSuppliers: vi.fn().mockReturnValue(of([]))
  };

  const productServiceMock = {
    getProducts: vi.fn().mockReturnValue(of({ items: [] })),
    getProductById: vi.fn().mockReturnValue(of({ id: 1, name: 'Prod A' }))
  };

  const branchContextServiceMock = {
    selectedWarehouseId: signal(null)
  };

  const confirmationServiceMock = {
    confirm: vi.fn().mockResolvedValue(true)
  };

  const alertServiceMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  const csvExportServiceMock = {
    exportToCsv: vi.fn()
  };

  const activatedRouteMock = {
    queryParams: of({})
  };

  const routerMock = {
    navigate: vi.fn()
  };

  let component: PurchasesComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    const injector = createEnvironmentInjector([
      { provide: PurchaseService, useValue: purchaseServiceMock },
      { provide: SupplierService, useValue: supplierServiceMock },
      { provide: ProductService, useValue: productServiceMock },
      { provide: BranchContextService, useValue: branchContextServiceMock },
      { provide: ConfirmationService, useValue: confirmationServiceMock },
      { provide: AlertService, useValue: alertServiceMock },
      { provide: CsvExportService, useValue: csvExportServiceMock },
      { provide: ActivatedRoute, useValue: activatedRouteMock },
      { provide: Router, useValue: routerMock }
    ], null as any);

    component = injector.runInContext(() => new PurchasesComponent());
    component.ngOnInit();
    component.loadPurchases();
  });

  it('should initialize purchases and tableState', () => {
    expect(component.purchases().length).toBe(3);
    expect(component.tableState.processedItems().length).toBe(3);
  });

  it('should sort purchases ascending, descending, and reset', () => {
    // Sort by total ASC
    component.tableState.toggleSort('total');
    let items = component.tableState.processedItems();
    expect(items[0].total).toBe(119000);
    expect(items[1].total).toBe(238000);
    expect(items[2].total).toBe(595000);

    // Sort by total DESC
    component.tableState.toggleSort('total');
    items = component.tableState.processedItems();
    expect(items[0].total).toBe(595000);
    expect(items[2].total).toBe(119000);

    // Reset sort
    component.tableState.toggleSort('total');
    items = component.tableState.processedItems();
    expect(items[0].total).toBe(119000);
  });

  it('should omni-search across any purchase field (supplierName, purchaseNumber, status)', () => {
    component.tableState.setSearch('Beta');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].purchaseNumber).toBe('OC-101');

    component.tableState.setSearch('Cancelled');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].purchaseNumber).toBe('OC-102');
  });

  it('should export purchases via CsvExportService', () => {
    component.exportPurchasesCsv();
    expect(csvExportServiceMock.exportToCsv).toHaveBeenCalledTimes(1);
    const callArgs = csvExportServiceMock.exportToCsv.mock.calls[0][0];
    expect(callArgs.filename).toContain('compras_');
    expect(callArgs.columns.length).toBeGreaterThan(0);
    expect(callArgs.data.length).toBe(3);
  });
});

