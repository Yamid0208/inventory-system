import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CustomerService } from './customer.service';
import { of } from 'rxjs';

describe('CustomerService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 10 })),
    post: vi.fn().mockReturnValue(of({ id: 1, name: 'Cliente Test', isActive: true })),
    put: vi.fn().mockReturnValue(of({ id: 1, name: 'Cliente Actualizado', isActive: true })),
    patch: vi.fn().mockReturnValue(of({ id: 1, name: 'Cliente Test', isActive: false })),
    delete: vi.fn().mockReturnValue(of(undefined))
  };

  const injector = createEnvironmentInjector([
    CustomerService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(CustomerService);

  it('should call get on /api/v1/customers with params', () => {
    service.getCustomers({ search: 'Andina' }).subscribe();
    expect(httpClientMock.get).toHaveBeenCalled();
  });

  it('should call post on /api/v1/customers to create customer', () => {
    service.createCustomer({ name: 'Nuevo Cliente' }).subscribe();
    expect(httpClientMock.post).toHaveBeenCalled();
  });

  it('should call patch on /api/v1/customers/1/toggle-status', () => {
    service.toggleStatus(1).subscribe();
    expect(httpClientMock.patch).toHaveBeenCalledWith('/api/v1/customers/1/toggle-status', {});
  });

  it('should call delete on /api/v1/customers/1', () => {
    service.deleteCustomer(1).subscribe();
    expect(httpClientMock.delete).toHaveBeenCalledWith('/api/v1/customers/1');
  });
});
