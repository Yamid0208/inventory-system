import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BatchService } from './batch.service';
import { of } from 'rxjs';

describe('BatchService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of([{ id: 1, batchNumber: 'LOT-01', status: 'Good' }])),
    post: vi.fn().mockReturnValue(of({ id: 2, batchNumber: 'LOT-02' }))
  };

  const injector = createEnvironmentInjector([
    BatchService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(BatchService);

  it('should call GET on /api/v1/products/{id}/batches', () => {
    service.getBatches(10).subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/products/10/batches');
  });

  it('should call POST on /api/v1/products/{id}/batches', () => {
    const payload = {
      batchNumber: 'LOT-NEW',
      expirationDate: '2026-12-31T00:00:00Z',
      initialQuantity: 50
    };
    service.createBatch(10, payload).subscribe();
    expect(httpClientMock.post).toHaveBeenCalledWith('/api/v1/products/10/batches', payload);
  });
});
