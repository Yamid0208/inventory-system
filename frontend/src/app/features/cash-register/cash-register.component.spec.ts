import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector, signal } from '@angular/core';
import { CashRegisterComponent } from './cash-register.component';
import { CashRegisterService } from '../../core/services/cash-register.service';
import { NotificationService } from '../../core/services/notification.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { CsvExportService } from '../../shared/services/csv-export.service';
import { of } from 'rxjs';
import { CashRegisterMovement, CashRegisterSession } from '../../core/models/cash-register.model';

describe('CashRegisterComponent - Table Standard (Sorting, Search, CSV)', () => {
  const dummyMovements: CashRegisterMovement[] = [
    { id: 1, sessionId: 10, movementType: 'SaleInflow', category: 'Inflow', amount: 50000, concept: 'Venta Mostrador', paymentMethod: 'Cash', saleNumber: 'V-001', isCashEffect: true, movementDate: '2026-01-10T10:00:00Z' },
    { id: 2, sessionId: 10, movementType: 'ManualOutflow', category: 'Outflow', amount: 15000, concept: 'Compra Café', paymentMethod: 'Cash', saleNumber: undefined, isCashEffect: true, movementDate: '2026-01-10T11:30:00Z' },
    { id: 3, sessionId: 10, movementType: 'SaleInflow', category: 'Inflow', amount: 120000, concept: 'Venta Tarjeta', paymentMethod: 'CreditCard', saleNumber: 'V-002', isCashEffect: false, movementDate: '2026-01-10T12:00:00Z' }
  ];

  const dummySessions: CashRegisterSession[] = [
    { id: 1, sessionNumber: 'CAJA-001', userId: 1, userName: 'Cajero Norte', warehouseId: 1, warehouseName: 'Sede Norte', openedAt: '2026-01-01', closedAt: '2026-01-01', initialCash: 100000, expectedCash: 250000, actualCash: 250000, cashDifference: 0, status: 'Closed' } as any,
    { id: 2, sessionNumber: 'CAJA-002', userId: 2, userName: 'Cajero Sur', warehouseId: 2, warehouseName: 'Sede Sur', openedAt: '2026-01-02', closedAt: null, initialCash: 80000, expectedCash: 150000, actualCash: null, cashDifference: null, status: 'Open' } as any
  ];

  const cashServiceMock = {
    getCurrentSession: vi.fn().mockReturnValue(of({
      session: { id: 10, sessionNumber: 'CAJA-ACTIVE', userName: 'Admin', openedAt: '2026-01-10' },
      movements: dummyMovements,
      hasActiveSession: true
    })),
    getSessionMovements: vi.fn().mockReturnValue(of(dummyMovements)),
    getHistory: vi.fn().mockReturnValue(of({
      items: dummySessions,
      totalCount: 2,
      pageNumber: 1,
      pageSize: 10
    })),
    getAuditSummary: vi.fn().mockReturnValue(of(null))
  };

  const notificationServiceMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  const warehouseServiceMock = {
    getWarehouses: vi.fn().mockReturnValue(of([]))
  };

  const authServiceMock = {
    currentUser: signal({ role: 'Admin', username: 'admin' })
  };

  const branchContextServiceMock = {
    selectedWarehouseId: signal(null),
    assignedWarehouseName: signal('Sede Principal Norte')
  };

  const csvExportServiceMock = {
    exportToCsv: vi.fn()
  };

  let component: CashRegisterComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    const injector = createEnvironmentInjector([
      { provide: CashRegisterService, useValue: cashServiceMock },
      { provide: NotificationService, useValue: notificationServiceMock },
      { provide: WarehouseService, useValue: warehouseServiceMock },
      { provide: AuthService, useValue: authServiceMock },
      { provide: BranchContextService, useValue: branchContextServiceMock },
      { provide: CsvExportService, useValue: csvExportServiceMock }
    ], null as any);

    component = injector.runInContext(() => new CashRegisterComponent());
    component.ngOnInit();
    component.liveMovements.set(dummyMovements);
    component.historySessions.set(dummySessions);
  });

  it('should initialize liveMovements and history tables with reactive TableStateManagers', () => {
    expect(component.liveMovementsTableState.processedItems().length).toBe(3);
    expect(component.historyTableState.processedItems().length).toBe(2);
  });

  it('should sort live movements ascending, descending, and reset', () => {
    // Sort by amount ASC
    component.liveMovementsTableState.toggleSort('amount');
    let items = component.liveMovementsTableState.processedItems();
    expect(items[0].amount).toBe(15000);
    expect(items[1].amount).toBe(50000);
    expect(items[2].amount).toBe(120000);

    // Sort by amount DESC
    component.liveMovementsTableState.toggleSort('amount');
    items = component.liveMovementsTableState.processedItems();
    expect(items[0].amount).toBe(120000);
    expect(items[2].amount).toBe(15000);

    // Reset sort
    component.liveMovementsTableState.toggleSort('amount');
    items = component.liveMovementsTableState.processedItems();
    expect(items[0].amount).toBe(50000);
  });

  it('should omni-search across any movement or session field', () => {
    component.liveMovementsTableState.setSearch('Café');
    expect(component.liveMovementsTableState.processedItems().length).toBe(1);
    expect(component.liveMovementsTableState.processedItems()[0].concept).toBe('Compra Café');

    component.historyTableState.setSearch('Cajero Sur');
    expect(component.historyTableState.processedItems().length).toBe(1);
    expect(component.historyTableState.processedItems()[0].sessionNumber).toBe('CAJA-002');
  });

  it('should export live movements and history sessions via CsvExportService', () => {
    component.exportLiveMovementsCsv();
    expect(csvExportServiceMock.exportToCsv).toHaveBeenCalledTimes(1);
    let callArgs = csvExportServiceMock.exportToCsv.mock.calls[0][0];
    expect(callArgs.filename).toContain('movimientos_caja_');

    component.exportHistoryCsv();
    expect(csvExportServiceMock.exportToCsv).toHaveBeenCalledTimes(2);
    callArgs = csvExportServiceMock.exportToCsv.mock.calls[1][0];
    expect(callArgs.filename).toContain('historial_cajas_');
  });
});
