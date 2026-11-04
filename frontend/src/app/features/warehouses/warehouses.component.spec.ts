import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { WarehousesComponent } from './warehouses.component';
import { WarehouseService } from '../../core/services/warehouse.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { CsvExportService } from '../../shared/services/csv-export.service';
import { of } from 'rxjs';
import { Warehouse } from '../../core/models/warehouse.model';

describe('WarehousesComponent - Table Standard (Sorting, Search, CSV)', () => {
  const dummyWarehouses: Warehouse[] = [
    { id: 1, name: 'Sede Norte', code: 'SED-01', city: 'Bogotá', address: 'Calle 100 # 15-20', phone: '3001234567', adminUserName: 'Admin Norte', isActive: true, employeeCount: 12, createdAt: '2026-01-01' },
    { id: 2, name: 'Almacén Central', code: 'SED-02', city: 'Medellín', address: 'Carrera 43A # 1-50', phone: '3109876543', adminUserName: 'Admin Central', isActive: false, employeeCount: 5, createdAt: '2026-01-05' },
    { id: 3, name: 'Bodega Occidente', code: 'SED-03', city: 'Cali', address: 'Avenida 6N # 20-30', phone: '3205556677', adminUserName: 'Admin Cali', isActive: true, employeeCount: 20, createdAt: '2026-01-10' }
  ];

  const warehouseServiceMock = {
    getWarehouses: vi.fn().mockReturnValue(of(dummyWarehouses)),
    createWarehouse: vi.fn().mockReturnValue(of({})),
    createClientAdmin: vi.fn().mockReturnValue(of({})),
    toggleStatus: vi.fn().mockReturnValue(of({}))
  };

  const notificationServiceMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  const authServiceMock = {
    currentUser: signal({ role: 'SuperAdmin', username: 'superadmin' })
  };

  const branchContextServiceMock = {
    selectedWarehouseId: signal(null),
    refreshWarehouses: vi.fn()
  };

  const csvExportServiceMock = {
    exportToCsv: vi.fn()
  };

  let component: WarehousesComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    const injector = createEnvironmentInjector([
      { provide: WarehouseService, useValue: warehouseServiceMock },
      { provide: NotificationService, useValue: notificationServiceMock },
      { provide: AuthService, useValue: authServiceMock },
      { provide: BranchContextService, useValue: branchContextServiceMock },
      { provide: FormBuilder, useValue: new FormBuilder() },
      { provide: CsvExportService, useValue: csvExportServiceMock }
    ], null as any);

    component = injector.runInContext(() => new WarehousesComponent());
    component.ngOnInit();
  });

  it('should initialize warehouses and tableState', () => {
    expect(component.warehouses().length).toBe(3);
    expect(component.tableState.processedItems().length).toBe(3);
  });

  it('should sort warehouses ascending, descending, and reset', () => {
    // Sort by employeeCount ASC
    component.tableState.toggleSort('employeeCount');
    let items = component.tableState.processedItems();
    expect(items[0].employeeCount).toBe(5);
    expect(items[1].employeeCount).toBe(12);
    expect(items[2].employeeCount).toBe(20);

    // Sort by employeeCount DESC
    component.tableState.toggleSort('employeeCount');
    items = component.tableState.processedItems();
    expect(items[0].employeeCount).toBe(20);
    expect(items[2].employeeCount).toBe(5);

    // Reset sort
    component.tableState.toggleSort('employeeCount');
    items = component.tableState.processedItems();
    expect(items[0].employeeCount).toBe(12);
  });

  it('should omni-search across any warehouse field (city, code, name)', () => {
    component.tableState.setSearch('Cali');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].code).toBe('SED-03');

    component.tableState.setSearch('SED-02');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].name).toBe('Almacén Central');
  });

  it('should export warehouses via CsvExportService', () => {
    component.exportWarehousesCsv();
    expect(csvExportServiceMock.exportToCsv).toHaveBeenCalledTimes(1);
    const callArgs = csvExportServiceMock.exportToCsv.mock.calls[0][0];
    expect(callArgs.filename).toContain('almacenes_sedes_');
    expect(callArgs.columns.length).toBeGreaterThan(0);
    expect(callArgs.data.length).toBe(3);
  });
});

