import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WarehouseService } from './warehouse.service';
import { CreateClientAdminRequest, Warehouse } from '../models/warehouse.model';

describe('WarehouseService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  };

  let service: WarehouseService;

  beforeEach(() => {
    vi.clearAllMocks();
    const injector = createEnvironmentInjector([
      WarehouseService,
      { provide: HttpClient, useValue: httpClientMock }
    ]);
    service = injector.get(WarehouseService);
  });

  it('debe instanciarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe obtener la lista de almacenes mediante GET /api/v1/warehouses', () => {
    const mockWarehouses: Warehouse[] = [
      {
        id: 1,
        name: 'Sede Norte',
        code: 'BOD-01',
        isActive: true,
        employeeCount: 3,
        createdAt: '2026-09-02T00:00:00Z'
      }
    ];

    httpClientMock.get.mockReturnValue(of(mockWarehouses));

    service.getWarehouses().subscribe((result) => {
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Sede Norte');
    });

    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/warehouses');
  });

  it('debe crear un cliente titular y almacén mediante POST /api/v1/warehouses/client-admin', () => {
    const newRequest: CreateClientAdminRequest = {
      warehouseName: 'Sede Sur',
      warehouseCode: 'BOD-02',
      adminFullName: 'Titular Sur SAS',
      adminEmail: 'sur@empresa.com',
      adminPassword: 'Password123*'
    };

    const mockResponse: Warehouse = {
      id: 2,
      name: 'Sede Sur',
      code: 'BOD-02',
      adminUserId: 10,
      adminUserName: 'Titular Sur SAS',
      adminUserEmail: 'sur@empresa.com',
      isActive: true,
      employeeCount: 0,
      createdAt: '2026-09-02T00:00:00Z'
    };

    httpClientMock.post.mockReturnValue(of(mockResponse));

    service.createClientAdmin(newRequest).subscribe((created) => {
      expect(created.id).toBe(2);
      expect(created.code).toBe('BOD-02');
    });

    expect(httpClientMock.post).toHaveBeenCalledWith('/api/v1/warehouses/client-admin', newRequest);
  });
});
