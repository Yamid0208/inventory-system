import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { CustomersComponent } from './customers.component';
import { CustomerService } from '../../core/services/customer.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { CsvExportService } from '../../shared/services/csv-export.service';
import { of } from 'rxjs';
import { Customer } from '../../core/models/customer.model';

describe('CustomersComponent - Table Standard (Sorting, Search, CSV)', () => {
  const dummyCustomers: Customer[] = [
    { id: 1, name: 'Carlos Gomez', email: 'carlos@example.com', phone: '3001234567', city: 'Bogotá', isActive: true, taxId: '900123' } as any,
    { id: 2, name: 'Ana Lopez', email: 'ana@example.com', phone: '3109876543', city: 'Medellín', isActive: false, taxId: '800456' } as any,
    { id: 3, name: 'Beatriz Moreno', email: 'beatriz@example.com', phone: '3205556677', city: 'Cali', isActive: true, taxId: '700789' } as any
  ];

  const customerServiceMock = {
    getCustomers: vi.fn().mockReturnValue(of({
      items: dummyCustomers,
      totalCount: 3,
      pageNumber: 1,
      pageSize: 10
    })),
    getSummary: vi.fn().mockReturnValue(of({
      totalCustomers: 3,
      activeCustomers: 2,
      inactiveCustomers: 1
    })),
    toggleCustomerStatus: vi.fn().mockReturnValue(of({})),
    deleteCustomer: vi.fn().mockReturnValue(of({}))
  };

  const confirmationServiceMock = {
    confirm: vi.fn().mockResolvedValue(true)
  };

  const csvExportServiceMock = {
    exportToCsv: vi.fn()
  };

  let component: CustomersComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    const injector = createEnvironmentInjector([
      { provide: CustomerService, useValue: customerServiceMock },
      { provide: ConfirmationService, useValue: confirmationServiceMock },
      { provide: CsvExportService, useValue: csvExportServiceMock }
    ], null as any);

    component = injector.runInContext(() => new CustomersComponent());
    component.ngOnInit();
  });

  it('should initialize customers and tableState', () => {
    expect(component.customers().length).toBe(3);
    expect(component.tableState.processedItems().length).toBe(3);
  });

  it('should sort customers ascending, descending, and reset', () => {
    // 1st click: Sort by name ASC
    component.tableState.toggleSort('name');
    let items = component.tableState.processedItems();
    expect(items[0].name).toBe('Ana Lopez');
    expect(items[1].name).toBe('Beatriz Moreno');
    expect(items[2].name).toBe('Carlos Gomez');

    // 2nd click: Sort by name DESC
    component.tableState.toggleSort('name');
    items = component.tableState.processedItems();
    expect(items[0].name).toBe('Carlos Gomez');
    expect(items[2].name).toBe('Ana Lopez');

    // 3rd click: Reset sort
    component.tableState.toggleSort('name');
    items = component.tableState.processedItems();
    expect(items[0].name).toBe('Carlos Gomez');
  });

  it('should omni-search across any customer field (e.g. city or taxId)', () => {
    component.tableState.setSearch('cali');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].name).toBe('Beatriz Moreno');

    component.tableState.setSearch('800456');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].name).toBe('Ana Lopez');
  });

  it('should export customers via CsvExportService', () => {
    component.exportCustomersCsv();
    expect(csvExportServiceMock.exportToCsv).toHaveBeenCalledTimes(1);
    const callArgs = csvExportServiceMock.exportToCsv.mock.calls[0][0];
    expect(callArgs.filename).toContain('clientes_');
    expect(callArgs.columns.length).toBeGreaterThan(0);
    expect(callArgs.data.length).toBe(3);
  });
});
