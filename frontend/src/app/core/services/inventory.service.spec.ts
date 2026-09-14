import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { InventoryService } from './inventory.service';
import { of } from 'rxjs';

describe('InventoryService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of({ items: [], totalCount: 0 })),
    post: vi.fn().mockReturnValue(of({}))
  };

  const injector = createEnvironmentInjector([
    InventoryService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(InventoryService);

  it('should call get on /api/v1/inventory/kardex with filters', () => {
    service.getKardex({ movementType: 'AdjustmentIn', search: 'MOV-001', pageNumber: 1, pageSize: 15 }).subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/inventory/kardex', expect.any(Object));
  });

  it('should call post when registering a stock adjustment', () => {
    const payload = {
      productId: 1,
      adjustmentType: 'AdjustmentIn' as const,
      quantity: 5,
      reason: 'Conteo Físico'
    };
    service.createAdjustment(payload).subscribe();
    expect(httpClientMock.post).toHaveBeenCalledWith('/api/v1/inventory/adjustments', payload);
  });

  it('should call exportCsv with blob responseType', () => {
    service.exportCsv({ movementType: 'all' }).subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith(
      '/api/v1/inventory/export-kardex',
      expect.objectContaining({ responseType: 'blob' })
    );
  });

  it('should call post when processing inventory return', () => {
    const payload = {
      productId: 1,
      returnType: 'CustomerReturn' as const,
      quantity: 2,
      reason: 'Garantía defectuosa',
      referenceDocument: 'FAC-1001'
    };
    service.processReturn(payload).subscribe();
    expect(httpClientMock.post).toHaveBeenCalledWith('/api/v1/inventory/returns', payload);
  });
});
