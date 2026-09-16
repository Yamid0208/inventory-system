import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { createEnvironmentInjector } from '@angular/core';
import { BranchContextService } from './branch-context.service';
import { WarehouseService } from './warehouse.service';
import { AuthService } from '../auth/services/auth.service';
import { Warehouse } from '../models/warehouse.model';

describe('BranchContextService (Unit Tests)', () => {
  let service: BranchContextService;
  let warehousesChangedSubject: Subject<Warehouse | null>;

  const initialWarehouses: Warehouse[] = [
    { id: 1, name: 'Sede Principal', code: 'BOD-01', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 2, name: 'Sede Norte', code: 'BOD-02', isActive: true, createdAt: '2026-09-01T00:00:00Z' }
  ];

  const currentUserSignal = signal<{ id: number; fullName: string; role: string; warehouseId?: number; warehouseName?: string } | null>({
    id: 1,
    fullName: 'Admin User',
    role: 'Admin'
  });

  const warehouseServiceMock = {
    getWarehouses: vi.fn(),
    warehousesChanged$: null as any,
    notifyWarehousesChanged: vi.fn()
  };

  const authServiceMock = {
    currentUser: currentUserSignal
  };

  let localStorageMock: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn((key: string, val: string) => { localStorageMock[key] = val; }),
      removeItem: vi.fn((key: string) => { delete localStorageMock[key]; }),
      clear: vi.fn(() => { localStorageMock = {}; })
    });

    warehousesChangedSubject = new Subject<Warehouse | null>();
    warehouseServiceMock.warehousesChanged$ = warehousesChangedSubject.asObservable();
    warehouseServiceMock.getWarehouses.mockReturnValue(of(initialWarehouses));

    const injector = createEnvironmentInjector([
      BranchContextService,
      { provide: WarehouseService, useValue: warehouseServiceMock },
      { provide: AuthService, useValue: authServiceMock }
    ], null as any);

    service = injector.get(BranchContextService);
  });

  it('debe inicializarse y cargar los almacenes disponibles', () => {
    expect(service).toBeTruthy();
    service.initializeBranchContext();
    expect(warehouseServiceMock.getWarehouses).toHaveBeenCalled();
    expect(service.warehouses().length).toBe(2);
    expect(service.selectedWarehouseId()).toBe(1);
  });

  it('debe actualizar los almacenes al llamar refreshWarehouses con una nueva sede creada', () => {
    const updatedWarehouses: Warehouse[] = [
      ...initialWarehouses,
      { id: 3, name: 'Sede Sur Nueva', code: 'BOD-03', isActive: true, createdAt: '2026-09-16T00:00:00Z' }
    ];

    warehouseServiceMock.getWarehouses.mockReturnValue(of(updatedWarehouses));

    service.refreshWarehouses(3);

    expect(service.warehouses().length).toBe(3);
    expect(service.selectedWarehouseId()).toBe(3);
    expect(service.selectedWarehouse()?.name).toBe('Sede Sur Nueva');
  });

  it('debe actualizar la lista reactivamente al emitirse warehousesChanged$', () => {
    const updatedWarehouses: Warehouse[] = [
      ...initialWarehouses,
      { id: 4, name: 'Sede Occidente', code: 'BOD-04', isActive: true, createdAt: '2026-09-16T00:00:00Z' }
    ];

    warehouseServiceMock.getWarehouses.mockReturnValue(of(updatedWarehouses));

    const newWarehouse = updatedWarehouses[2];
    warehousesChangedSubject.next(newWarehouse);

    expect(service.warehouses().length).toBe(3);
    expect(service.selectedWarehouseId()).toBe(4);
    expect(service.selectedWarehouse()?.name).toBe('Sede Occidente');
  });
});
