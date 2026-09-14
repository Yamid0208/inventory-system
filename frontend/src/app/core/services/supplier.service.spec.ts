import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SupplierService } from './supplier.service';
import { of } from 'rxjs';

describe('SupplierService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of([])),
    post: vi.fn().mockReturnValue(of({})),
    put: vi.fn().mockReturnValue(of({})),
    patch: vi.fn().mockReturnValue(of({})),
    delete: vi.fn().mockReturnValue(of(null))
  };

  const injector = createEnvironmentInjector([
    SupplierService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(SupplierService);

  it('should call get on /api/v1/suppliers when requesting list', () => {
    service.getSuppliers().subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/suppliers', expect.any(Object));
  });

  it('should call post when creating supplier', () => {
    const payload = { name: 'Logística SAS', taxId: 'NIT-123' };
    service.createSupplier(payload).subscribe();
    expect(httpClientMock.post).toHaveBeenCalledWith('/api/v1/suppliers', payload);
  });

  it('should call patch when toggling supplier status', () => {
    service.toggleStatus(2, true).subscribe();
    expect(httpClientMock.patch).toHaveBeenCalledWith('/api/v1/suppliers/2/status', { isActive: true });
  });

  it('should call delete when removing supplier', () => {
    service.deleteSupplier(7).subscribe();
    expect(httpClientMock.delete).toHaveBeenCalledWith('/api/v1/suppliers/7');
  });
});
