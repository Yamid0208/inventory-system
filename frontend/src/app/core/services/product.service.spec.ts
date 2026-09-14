import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProductService } from './product.service';
import { of } from 'rxjs';

describe('ProductService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of({ items: [], totalCount: 0 })),
    post: vi.fn().mockReturnValue(of({})),
    put: vi.fn().mockReturnValue(of({})),
    patch: vi.fn().mockReturnValue(of({})),
    delete: vi.fn().mockReturnValue(of(null))
  };

  const injector = createEnvironmentInjector([
    ProductService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(ProductService);

  it('should call get on /api/v1/products with query params', () => {
    service.getProducts({ search: 'Monitor', stockStatus: 'in_stock', pageNumber: 1, pageSize: 10 }).subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/products', expect.any(Object));
  });

  it('should call post when creating a product', () => {
    const payload = {
      sku: 'ELE-MO-024',
      name: 'Monitor 4K',
      categoryId: 1,
      supplierId: 1,
      purchasePrice: 200,
      salePrice: 350,
      minimumStock: 5
    };
    service.createProduct(payload).subscribe();
    expect(httpClientMock.post).toHaveBeenCalledWith('/api/v1/products', payload);
  });

  it('should call put when updating a product', () => {
    const payload = {
      name: 'Monitor 4K Actualizado',
      categoryId: 1,
      supplierId: 1,
      purchasePrice: 200,
      salePrice: 360,
      minimumStock: 5,
      rowVersion: 'AQIDBA=='
    };
    service.updateProduct(3, payload).subscribe();
    expect(httpClientMock.put).toHaveBeenCalledWith('/api/v1/products/3', payload);
  });

  it('should call patch when toggling product status', () => {
    service.toggleStatus(3, false).subscribe();
    expect(httpClientMock.patch).toHaveBeenCalledWith('/api/v1/products/3/status', { isActive: false });
  });

  it('should call delete when removing a product', () => {
    service.deleteProduct(3).subscribe();
    expect(httpClientMock.delete).toHaveBeenCalledWith('/api/v1/products/3');
  });
});
