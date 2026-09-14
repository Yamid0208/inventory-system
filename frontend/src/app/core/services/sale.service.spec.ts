import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SaleService } from './sale.service';
import { of } from 'rxjs';

describe('SaleService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of({ items: [], totalCount: 0 })),
    post: vi.fn().mockReturnValue(of({})),
    patch: vi.fn().mockReturnValue(of({}))
  };

  const injector = createEnvironmentInjector([
    SaleService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(SaleService);

  it('should call get on /api/v1/sales with query parameters', () => {
    service.getSales({ status: 'Completed', pageNumber: 1, pageSize: 10 }).subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/sales', expect.any(Object));
  });

  it('should call post when creating a sale', () => {
    const payload = {
      customerName: 'Cliente Prueba',
      paymentMethod: 'Cash' as const,
      saleDate: '2026-09-02T00:00:00Z',
      items: [{ productId: 1, quantity: 2, unitPrice: 200.0, taxRate: 0.19 }]
    };
    service.createSale(payload).subscribe();
    expect(httpClientMock.post).toHaveBeenCalledWith('/api/v1/sales', payload);
  });

  it('should call patch when cancelling a sale', () => {
    service.cancelSale(99).subscribe();
    expect(httpClientMock.patch).toHaveBeenCalledWith('/api/v1/sales/99/cancel', {});
  });
});
