import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector, signal } from '@angular/core';
import { SalesComponent } from './sales.component';
import { SaleService } from '../../core/services/sale.service';
import { CashRegisterService } from '../../core/services/cash-register.service';
import { ProductService } from '../../core/services/product.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { AlertService } from '../../core/services/alert.service';
import { CsvExportService } from '../../shared/services/csv-export.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { Sale } from '../../core/models/sale.model';

describe('SalesComponent - Table Standard (Sorting, Search, CSV)', () => {
  const dummySales: Sale[] = [
    { id: 1, saleNumber: 'V-001', customerName: 'Empresa A', userName: 'Vendedor 1', total: 150000, saleDate: '2026-01-10', status: 'Completed', paymentMethod: 'Cash', invoiceType: 'Traditional', subtotal: 126050, tax: 23950, items: [] } as any,
    { id: 2, saleNumber: 'V-002', customerName: 'Cliente B', userName: 'Vendedor 2', total: 300000, saleDate: '2026-01-12', status: 'Completed', paymentMethod: 'CreditCard', invoiceType: 'Traditional', subtotal: 252100, tax: 47900, items: [] } as any,
    { id: 3, saleNumber: 'V-003', customerName: 'Distribuidor C', userName: 'Vendedor 1', total: 80000, saleDate: '2026-01-08', status: 'Cancelled', paymentMethod: 'Transfer', invoiceType: 'Traditional', subtotal: 67226, tax: 12774, items: [] } as any
  ];

  const saleServiceMock = {
    getSales: vi.fn().mockReturnValue(of({
      items: dummySales,
      totalCount: 3,
      pageNumber: 1,
      pageSize: 10
    })),
    createSale: vi.fn().mockReturnValue(of({})),
    cancelSale: vi.fn().mockReturnValue(of({}))
  };

  const cashRegisterServiceMock = {
    getCurrentSession: vi.fn().mockReturnValue(of(null)),
    activeSession: signal(null)
  };

  const productServiceMock = {
    getProducts: vi.fn().mockReturnValue(of({ items: [] }))
  };

  const warehouseServiceMock = {
    getWarehouses: vi.fn().mockReturnValue(of([]))
  };

  const branchContextServiceMock = {
    selectedWarehouseId: signal(null),
    setSelectedWarehouseId: vi.fn()
  };

  const authServiceMock = {
    currentUser: signal({ role: 'Admin', username: 'admin' })
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

  let component: SalesComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    const injector = createEnvironmentInjector([
      { provide: SaleService, useValue: saleServiceMock },
      { provide: CashRegisterService, useValue: cashRegisterServiceMock },
      { provide: ProductService, useValue: productServiceMock },
      { provide: WarehouseService, useValue: warehouseServiceMock },
      { provide: BranchContextService, useValue: branchContextServiceMock },
      { provide: AuthService, useValue: authServiceMock },
      { provide: ConfirmationService, useValue: confirmationServiceMock },
      { provide: AlertService, useValue: alertServiceMock },
      { provide: CsvExportService, useValue: csvExportServiceMock },
      { provide: ActivatedRoute, useValue: activatedRouteMock },
      { provide: Router, useValue: routerMock }
    ], null as any);

    component = injector.runInContext(() => new SalesComponent());
    component.ngOnInit();
    component.loadSales();
  });

  it('should initialize sales and tableState', () => {
    expect(component.sales().length).toBe(3);
    expect(component.tableState.processedItems().length).toBe(3);
  });

  it('should sort sales ascending, descending, and reset', () => {
    // Sort by total ASC
    component.tableState.toggleSort('total');
    let items = component.tableState.processedItems();
    expect(items[0].total).toBe(80000);
    expect(items[1].total).toBe(150000);
    expect(items[2].total).toBe(300000);

    // Sort by total DESC
    component.tableState.toggleSort('total');
    items = component.tableState.processedItems();
    expect(items[0].total).toBe(300000);
    expect(items[2].total).toBe(80000);

    // Reset sort
    component.tableState.toggleSort('total');
    items = component.tableState.processedItems();
    expect(items[0].total).toBe(150000);
  });

  it('should omni-search across any sale field (customerName, saleNumber, paymentMethod)', () => {
    component.tableState.setSearch('Distribuidor');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].saleNumber).toBe('V-003');

    component.tableState.setSearch('CreditCard');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].saleNumber).toBe('V-002');
  });

  it('should export sales via CsvExportService', () => {
    component.exportSalesCsv();
    expect(csvExportServiceMock.exportToCsv).toHaveBeenCalledTimes(1);
    const callArgs = csvExportServiceMock.exportToCsv.mock.calls[0][0];
    expect(callArgs.filename).toContain('ventas_');
    expect(callArgs.columns.length).toBeGreaterThan(0);
    expect(callArgs.data.length).toBe(3);
  });
});
