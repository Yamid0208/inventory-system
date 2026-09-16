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

  it('no debe permitir edición manual de unitPrice y debe ser disabled', () => {
    const firstItem = component.itemsArray.at(0);
    expect(firstItem.get('unitPrice')?.disabled).toBe(true);

    component.products = [
      {
        id: 10,
        sku: 'SKU-10',
        name: 'Teclado Mecánico',
        salePrice: 120000,
        currentStock: 15
      } as any
    ];

    firstItem.patchValue({ productId: 10 });
    component.onProductSelect(0);

    expect(firstItem.get('unitPrice')?.value).toBe(120000);
    expect(firstItem.get('unitPrice')?.disabled).toBe(true);
  });

  it('en pago mixto no debe permitir agregar más medios de pago si el valor total ya está cubierto', () => {
    // Configurar producto con total conocido
    component.products = [
      { id: 1, sku: 'P1', name: 'Producto 1', salePrice: 100000, currentStock: 10 } as any
    ];
    component.taxRatePercent.set(0);
    component.taxRateDecimal.set(0);
    const item = component.itemsArray.at(0);
    item.patchValue({ productId: 1, quantity: 1 });
    component.onProductSelect(0);

    expect(component.calculatedTotal()).toBe(100000);

    // Activar pago mixto: los 2 campos inician en 0 para que el usuario digite ambos valores
    component.toggleSplitPayment();
    expect(component.isSplitPayment()).toBe(true);
    expect(component.paymentsArray.length).toBe(2);
    expect(component.totalPaid()).toBe(0);
    expect(component.remainingPayment()).toBe(100000);
    expect(component.canAddPaymentRow()).toBe(true);

    // El usuario digita el primer medio: 60000 (aún faltan 40000)
    component.paymentsArray.at(0).patchValue({ amount: 60000 });
    expect(component.totalPaid()).toBe(60000);
    expect(component.remainingPayment()).toBe(40000);
    expect(component.canAddPaymentRow()).toBe(true);

    // El usuario digita el segundo medio: 40000 (valor completo: 100000)
    component.paymentsArray.at(1).patchValue({ amount: 40000 });
    expect(component.totalPaid()).toBe(100000);
    expect(component.remainingPayment()).toBe(0);

    // Cuando ya está completo el valor, se bloquea la adición de más medios
    expect(component.canAddPaymentRow()).toBe(false);
    component.addPaymentRow('Transfer', 0);
    expect(component.paymentsArray.length).toBe(2);

    // Si el usuario modifica el monto y queda saldo pendiente, vuelve a permitir agregar
    component.paymentsArray.at(1).patchValue({ amount: 20000 });
    expect(component.remainingPayment()).toBe(20000);
    expect(component.canAddPaymentRow()).toBe(true);

    component.addPaymentRow('Transfer', component.remainingPayment());
    expect(component.paymentsArray.length).toBe(3);
    expect(component.totalPaid()).toBe(100000);
    expect(component.canAddPaymentRow()).toBe(false);
  });
});

