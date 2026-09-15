import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PurchaseService } from './purchase.service';
import { of } from 'rxjs';

describe('PurchaseService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of({ items: [], totalCount: 0 })),
    post: vi.fn().mockReturnValue(of({})),
    patch: vi.fn().mockReturnValue(of({}))
  };

  const injector = createEnvironmentInjector([
    PurchaseService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(PurchaseService);

  it('should call get on /api/v1/purchases with query parameters', () => {
    service.getPurchases({ status: 'Received', pageNumber: 1, pageSize: 10 }).subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/purchases', expect.any(Object));
  });

  it('should call post when creating a purchase order', () => {
    const payload = {
      supplierId: 1,
      purchaseDate: '2026-09-02T00:00:00Z',
      items: [{ productId: 1, quantity: 10, unitPrice: 15.5, taxRate: 0.19 }],
      autoReceive: true
    };
    service.createPurchase(payload).subscribe();
    expect(httpClientMock.post).toHaveBeenCalledWith('/api/v1/purchases', payload);
  });

  it('should call patch when receiving a purchase', () => {
    service.receivePurchase(42).subscribe();
    expect(httpClientMock.patch).toHaveBeenCalledWith('/api/v1/purchases/42/receive', {});
  });

  it('should call patch when cancelling a purchase', () => {
    service.cancelPurchase(42).subscribe();
    expect(httpClientMock.patch).toHaveBeenCalledWith('/api/v1/purchases/42/cancel', {});
  });

  it('should call post when returning a purchase to supplier', () => {
    const returnPayload = {
      reason: 'Mercancía defectuosa',
      items: [{ productId: 1, quantity: 2 }]
    };
    service.returnPurchase(42, returnPayload).subscribe();
    expect(httpClientMock.post).toHaveBeenCalledWith('/api/v1/purchases/42/return', returnPayload);
  });
});
