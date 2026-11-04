import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector, signal } from '@angular/core';
import { UsersComponent } from './users.component';
import { UserAdminService } from '../../core/services/user-admin.service';
import { RoleService } from '../../core/services/role.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { CsvExportService } from '../../shared/services/csv-export.service';
import { of } from 'rxjs';

describe('UsersComponent (Unit Tests)', () => {
  let component: UsersComponent;

  const mockUsers = [
    {
      id: 1,
      fullName: 'Carlos Bodeguero',
      email: 'carlos@empresa.com',
      role: 'Warehouse',
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      warehouseId: 2,
      warehouseName: 'Sede Norte'
    }
  ];

  const userAdminServiceMock = {
    getUsers: vi.fn().mockReturnValue(of({ items: mockUsers, totalCount: 1, pageNumber: 1, pageSize: 10 })),
    createUser: vi.fn().mockReturnValue(of({})),
    updateUser: vi.fn().mockReturnValue(of({})),
    toggleStatus: vi.fn().mockReturnValue(of({})),
    resetPassword: vi.fn().mockReturnValue(of({}))
  };

  const roleServiceMock = {
    getMatrix: vi.fn().mockReturnValue(of([]))
  };

  const warehouseServiceMock = {
    getWarehouses: vi.fn().mockReturnValue(of([
      { id: 1, name: 'Sede Principal', code: 'BOD-01', isActive: true },
      { id: 2, name: 'Sede Norte', code: 'BOD-02', isActive: true }
    ]))
  };

  const confirmationServiceMock = {
    confirm: vi.fn().mockResolvedValue(true)
  };

  const authServiceMock = {
    currentUser: signal({ id: 1, role: 'Admin', warehouseId: 1, fullName: 'Admin' })
  };

  const selectedWarehouseIdSignal = signal<number | null>(null);
  const warehousesSignal = signal([
    { id: 1, name: 'Sede Principal', code: 'BOD-01', isActive: true, createdAt: '2026-09-01' },
    { id: 2, name: 'Sede Norte', code: 'BOD-02', isActive: true, createdAt: '2026-09-01' }
  ]);

  const branchContextServiceMock = {
    selectedWarehouseId: selectedWarehouseIdSignal,
    warehouses: warehousesSignal,
    canChangeBranch: vi.fn().mockReturnValue(true),
    setSelectedWarehouseId: vi.fn((id: number | null) => {
      selectedWarehouseIdSignal.set(id);
    })
  };

  beforeEach(() => {
    vi.clearAllMocks();
    selectedWarehouseIdSignal.set(null);

    const injector = createEnvironmentInjector([
      UsersComponent,
      CsvExportService,
      { provide: UserAdminService, useValue: userAdminServiceMock },
      { provide: RoleService, useValue: roleServiceMock },
      { provide: WarehouseService, useValue: warehouseServiceMock },
      { provide: ConfirmationService, useValue: confirmationServiceMock },
      { provide: AuthService, useValue: authServiceMock },
      { provide: BranchContextService, useValue: branchContextServiceMock }
    ], null as any);

    component = injector.get(UsersComponent);
  });

  it('debe ordenar usuarios, buscar en todos los campos y exportar a CSV', () => {
    const multiUsers = [
      { id: 1, fullName: 'Carlos Bodeguero', email: 'carlos@empresa.com', role: 'Warehouse', isActive: true, createdAt: '2026-09-01', warehouseName: 'Sede Norte' },
      { id: 2, fullName: 'Ana Administradora', email: 'ana@empresa.com', role: 'Admin', isActive: true, createdAt: '2026-08-01', warehouseName: 'Sede Principal' },
      { id: 3, fullName: 'Beatriz Ventas', email: 'beatriz@empresa.com', role: 'Seller', isActive: false, createdAt: '2026-09-15', warehouseName: 'Sede Norte' }
    ] as any;
    component.users.set(multiUsers);

    // 1. Sort by fullName ASC
    component.tableState.toggleSort('fullName');
    let items = component.tableState.processedItems();
    expect(items[0].fullName).toBe('Ana Administradora');
    expect(items[1].fullName).toBe('Beatriz Ventas');
    expect(items[2].fullName).toBe('Carlos Bodeguero');

    // 2. Sort by fullName DESC
    component.tableState.toggleSort('fullName');
    items = component.tableState.processedItems();
    expect(items[0].fullName).toBe('Carlos Bodeguero');
    expect(items[2].fullName).toBe('Ana Administradora');

    // 3. Reset sort
    component.tableState.toggleSort('fullName');
    items = component.tableState.processedItems();
    expect(items[0].fullName).toBe('Carlos Bodeguero');

    // 4. Omni-search by email
    component.tableState.setSearch('beatriz');
    expect(component.tableState.processedItems().length).toBe(1);
    expect(component.tableState.processedItems()[0].fullName).toBe('Beatriz Ventas');

    // 5. CSV export
    const csvService = (component as any).csvExportService;
    const spy = vi.spyOn(csvService, 'exportToCsv');
    component.exportUsersCsv();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].filename).toContain('usuarios_');
  });

  it('debe instanciarse y cargar los usuarios', () => {
    expect(component).toBeTruthy();
    component.ngOnInit();
    expect(userAdminServiceMock.getUsers).toHaveBeenCalled();
    expect(component.users().length).toBe(1);
    expect(component.users()[0].fullName).toBe('Carlos Bodeguero');
  });

  it('debe filtrar por almacén al invocar setWarehouseFilter y sincronizar con BranchContextService', () => {
    component.setWarehouseFilter('2');

    expect(component.warehouseFilter()).toBe('2');
    expect(branchContextServiceMock.setSelectedWarehouseId).toHaveBeenCalledWith(2);
    expect(userAdminServiceMock.getUsers).toHaveBeenCalledWith(expect.objectContaining({
      warehouseId: 2
    }));
  });

  it('debe filtrar sin almacén (all) al seleccionar Todas las Sedes', () => {
    selectedWarehouseIdSignal.set(2);
    component.warehouseFilter.set('2');

    component.setWarehouseFilter('all');

    expect(component.warehouseFilter()).toBe('all');
    expect(branchContextServiceMock.setSelectedWarehouseId).toHaveBeenCalledWith(null);
    expect(userAdminServiceMock.getUsers).toHaveBeenCalledWith(expect.objectContaining({
      warehouseId: undefined
    }));
  });

  it('debe proporcionar opciones de almacén provenientes de branchContextService', () => {
    const opts = component.warehouseFilterOptions;
    expect(opts.length).toBe(3); // 'all' + 2 almacenes
    expect(opts[0].label).toBe('Todas las Sedes');
    expect(opts[1].label).toBe('Sede Principal');
    expect(opts[2].label).toBe('Sede Norte');
  });
});
