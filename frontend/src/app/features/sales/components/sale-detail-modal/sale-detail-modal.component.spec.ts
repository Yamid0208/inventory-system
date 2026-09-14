import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { SaleDetailModalComponent } from './sale-detail-modal.component';
import { Sale } from '../../../../core/models/sale.model';

describe('SaleDetailModalComponent (Unit Tests)', () => {
  let component: SaleDetailModalComponent;

  const mockSale: Sale = {
    id: 1,
    saleNumber: 'VEN-20260902-001',
    customerName: 'Tech Solutions SAS',
    customerTaxId: '900.111.222-3',
    userId: 1,
    userName: 'Admin Principal',
    status: 'Completed',
    paymentMethod: 'CreditCard',
    subtotal: 100000,
    tax: 19000,
    total: 119000,
    saleDate: '2026-09-02T10:00:00Z',
    items: [
      {
        id: 1,
        saleId: 1,
        productId: 1,
        productSku: 'TEC-001',
        productName: 'Teclado Mecánico RGB',
        quantity: 1,
        unitPrice: 100000,
        subtotal: 100000
      }
    ]
  };

  beforeEach(() => {
    const injector = createEnvironmentInjector([SaleDetailModalComponent], null as any);
    component = injector.get(SaleDetailModalComponent);
    component.sale = mockSale;
  });

  it('should instantiate and translate payment method labels', () => {
    expect(component).toBeTruthy();
    expect(component.getPaymentMethodLabel('Cash')).toBe('Efectivo');
    expect(component.getPaymentMethodLabel('CreditCard')).toBe('Tarjeta de Crédito/Débito');
    expect(component.getPaymentMethodLabel('Transfer')).toBe('Transferencia Bancaria');
    expect(component.getPaymentMethodLabel('Credit')).toBe('Crédito Comercial (30 días)');
  });

  it('should invoke window.print on printInvoice()', () => {
    const printSpy = vi.fn();
    vi.stubGlobal('window', { print: printSpy });

    component.printInvoice();
    expect(printSpy).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('should emit close and cancelSale events', () => {
    const closeSpy = vi.fn();
    const cancelSpy = vi.fn();

    component.close.subscribe(closeSpy);
    component.cancelSale.subscribe(cancelSpy);

    component.onClose();
    expect(closeSpy).toHaveBeenCalled();

    component.onCancelSale();
    expect(cancelSpy).toHaveBeenCalledWith(1);
  });
});
