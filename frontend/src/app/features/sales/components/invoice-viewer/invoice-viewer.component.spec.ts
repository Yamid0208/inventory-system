import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { InvoiceViewerComponent } from './invoice-viewer.component';
import { Sale } from '../../../../core/models/sale.model';

describe('InvoiceViewerComponent (Unit Tests)', () => {
  let component: InvoiceViewerComponent;

  const mockSale: Sale = {
    id: 10,
    saleNumber: 'VEN-20260909-1234',
    customerName: 'Cliente Prueba SAS',
    customerTaxId: '900.555.444-1',
    customerEmail: 'factura@clienteprueba.com',
    userId: 1,
    userName: 'Administrador del Sistema',
    status: 'Completed',
    paymentMethod: 'Cash',
    invoiceType: 'Traditional',
    subtotal: 50000,
    tax: 9500,
    total: 59500,
    saleDate: '2026-09-09T18:00:00Z',
    items: [
      {
        id: 1,
        productId: 5,
        productSku: 'PRD-005',
        productName: 'Mouse Inalámbrico',
        quantity: 2,
        unitPrice: 25000,
        subtotal: 50000,
        tax: 9500,
        total: 59500
      }
    ]
  };

  beforeEach(() => {
    const injector = createEnvironmentInjector([InvoiceViewerComponent], null as any);
    component = injector.get(InvoiceViewerComponent);
    component.sale = mockSale;
  });

  it('should instantiate correctly and translate payment methods', () => {
    expect(component).toBeTruthy();
    expect(component.getPaymentMethodLabel('Cash')).toBe('Efectivo');
    expect(component.getPaymentMethodLabel('CreditCard')).toBe('Tarjeta');
    expect(component.getPaymentMethodLabel('Transfer')).toBe('Transferencia');
    expect(component.getPaymentMethodLabel('Credit')).toBe('Crédito');
  });

  it('should emit close event when onClose is called', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.onClose();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should call window.print when onPrint is called', () => {
    const printSpy = vi.fn();
    vi.stubGlobal('window', { print: printSpy });

    component.onPrint();
    expect(printSpy).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('should automatically invoke onPrint when autoPrint is true after view init', () => {
    vi.useFakeTimers();
    const printSpy = vi.fn();
    vi.stubGlobal('window', { print: printSpy });

    component.autoPrint = true;
    component.ngAfterViewInit();

    expect(printSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(printSpy).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
