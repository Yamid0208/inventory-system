import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { AuditComponent } from './audit.component';
import { AuditService } from '../../core/services/audit.service';
import { CsvExportService } from '../../shared/services/csv-export.service';
import { of } from 'rxjs';
import { AuditLog } from '../../core/models/audit.model';

describe('AuditComponent - Table Standard (Sorting, Search, CSV)', () => {
  const dummyLogs: AuditLog[] = [
    { id: 1, userId: 1, userName: 'Admin Principal', entityName: 'Product', action: 'Create', entityId: 'PROD-10', details: 'Producto creado: Teclado', ipAddress: '192.168.1.10', createdAt: '2026-01-10T08:00:00Z' },
    { id: 2, userId: 2, userName: 'Cajero Norte', entityName: 'Sale', action: 'Create', entityId: 'V-001', details: 'Venta registrada: $50,000', ipAddress: '192.168.1.20', createdAt: '2026-01-10T10:00:00Z' },
    { id: 3, userId: 1, userName: 'Admin Principal', entityName: 'Warehouse', action: 'Update', entityId: 'SED-01', details: 'Sede modificada', ipAddress: '192.168.1.10', createdAt: '2026-01-09T14:30:00Z' }
  ];

  const auditServiceMock = {
    getLogs: vi.fn().mockReturnValue(of({
      items: dummyLogs,
      totalCount: 3,
      pageNumber: 1,
      pageSize: 10
    })),
    getSummary: vi.fn().mockReturnValue(of({
      totalLogs: 3,
      todayCount: 2,
      loginsCount: 0,
      changesCount: 3
    }))
  };

  const csvExportServiceMock = {
    exportToCsv: vi.fn()
  };

  let component: AuditComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    const injector = createEnvironmentInjector([
      { provide: AuditService, useValue: auditServiceMock },
      { provide: CsvExportService, useValue: csvExportServiceMock }
    ], null as any);

    component = injector.runInContext(() => new AuditComponent());
    component.ngOnInit();
  });

  it('should initialize logs and tableState', () => {
    expect(component.logs().length).toBe(3);
    expect(component.tableState.processedItems().length).toBe(3);
  });

  it('should sort audit logs ascending, descending, and reset', () => {
    // Sort by entityName ASC
    component.tableState.toggleSort('entityName');
    let items = component.tableState.processedItems();
    expect(items[0].entityName).toBe('Product');
    expect(items[1].entityName).toBe('Sale');
    expect(items[2].entityName).toBe('Warehouse');

    // Sort by entityName DESC
    component.tableState.toggleSort('entityName');
    items = component.tableState.processedItems();
    expect(items[0].entityName).toBe('Warehouse');
    expect(items[2].entityName).toBe('Product');

    // Reset sort
    component.tableState.toggleSort('entityName');
    items = component.tableState.processedItems();
    expect(items[0].entityName).toBe('Product');
  });

  it('should omni-search across any audit field (userName, details, ipAddress)', () => {
    component.tableState.setSearch('192.168.1.20');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].userName).toBe('Cajero Norte');

    component.tableState.setSearch('Teclado');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].entityId).toBe('PROD-10');
  });

  it('should export audit logs via CsvExportService', () => {
    component.exportAuditCsv();
    expect(csvExportServiceMock.exportToCsv).toHaveBeenCalledTimes(1);
    const callArgs = csvExportServiceMock.exportToCsv.mock.calls[0][0];
    expect(callArgs.filename).toContain('auditoria_');
    expect(callArgs.columns.length).toBeGreaterThan(0);
    expect(callArgs.data.length).toBe(3);
  });
});
