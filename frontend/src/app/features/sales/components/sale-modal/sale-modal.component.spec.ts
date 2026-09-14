import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { SaleModalComponent } from './sale-modal.component';
import { Customer } from '../../../../core/models/customer.model';

describe('SaleModalComponent (Customer Lookup & Registration Tests)', () => {
  let component: SaleModalComponent;
  let customerServiceMock: any;

  let settingsServiceMock: any;

  const mockCustomers: Customer[] = [
    {
      id: 1,
      name: 'Empresa Test SAS',
      taxId: '900.123.456-7',
      email: 'contacto@empresatest.com',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    customerServiceMock = {
      getCustomers: vi.fn().mockReturnValue(of({ items: mockCustomers, totalCount: 1, pageNumber: 1, pageSize: 100 })),
      createCustomer: vi.fn().mockImplementation((req) => of({ id: 2, ...req, isActive: true, createdAt: '2026-09-09T00:00:00Z' }))
    };

    settingsServiceMock = {
      getSettings: vi.fn().mockReturnValue(of({ defaultTaxRate: 19 }))
    };

    component = new SaleModalComponent(new FormBuilder(), customerServiceMock, settingsServiceMock);
    component.ngOnInit();
  });

  it('should instantiate and load registered customers list on init', () => {
    expect(component).toBeTruthy();
    expect(customerServiceMock.getCustomers).toHaveBeenCalledWith({ pageSize: 100, isActive: true });
    expect(component.registeredCustomers().length).toBe(1);
  });

  it('should find local customer by taxId and auto-fill customer name and email', () => {
    component.form.patchValue({ customerTaxId: '900.123.456-7' });
    component.searchCustomerByTaxId();

    expect(component.customerSearchStatus()).toBe('found');
    expect(component.foundCustomerName()).toBe('Empresa Test SAS');
    expect(component.form.get('customerName')?.value).toBe('Empresa Test SAS');
    expect(component.form.get('customerEmail')?.value).toBe('contacto@empresatest.com');
  });

  it('should set customerSearchStatus to not_found if document is not registered', () => {
    component.form.patchValue({ customerTaxId: '111.222.333-4' });
    customerServiceMock.getCustomers.mockReturnValueOnce(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 10 }));

    component.searchCustomerByTaxId();

    expect(component.customerSearchStatus()).toBe('not_found');
  });

  it('should allow registering new customer manually via registerCustomerNow', () => {
    component.form.patchValue({
      customerTaxId: '777.888.999-0',
      customerName: 'Nuevo Cliente SL',
      customerEmail: 'nuevo@cliente.com'
    });

    component.registerCustomerNow();

    expect(customerServiceMock.createCustomer).toHaveBeenCalledWith({
      name: 'Nuevo Cliente SL',
      taxId: '777.888.999-0',
      email: 'nuevo@cliente.com'
    });
    expect(component.customerSearchStatus()).toBe('found');
  });
});
