import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { of } from 'rxjs';
import { BulkImportModalComponent } from './bulk-import-modal.component';
import { ProductService } from '../../../../core/services/product.service';
import { BranchContextService } from '../../../../core/services/branch-context.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductImportRow, BulkImportResult } from '../../../../core/models/product.model';

describe('BulkImportModalComponent (Unit Tests)', () => {
  let component: BulkImportModalComponent;
  let productServiceMock: any;
  let branchContextServiceMock: any;
  let authServiceMock: any;
  let notificationServiceMock: any;

  beforeEach(() => {
    productServiceMock = {
      downloadImportTemplate: vi.fn().mockReturnValue(of(new Blob(['test'], { type: 'application/octet-stream' }))),
      previewExcelImport: vi.fn(),
      previewImageImport: vi.fn(),
      commitBulkImport: vi.fn()
    };

    branchContextServiceMock = {
      selectedWarehouseId: vi.fn().mockReturnValue(1)
    };

    authServiceMock = {
      currentUser: vi.fn().mockReturnValue({ id: 'u1', username: 'admin', warehouseId: 1 })
    };

    notificationServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn()
    };

    const injector = createEnvironmentInjector([
      BulkImportModalComponent,
      { provide: ProductService, useValue: productServiceMock },
      { provide: BranchContextService, useValue: branchContextServiceMock },
      { provide: AuthService, useValue: authServiceMock },
      { provide: NotificationService, useValue: notificationServiceMock }
    ], null as any);

    component = injector.get(BulkImportModalComponent);
  });

  it('debe inicializarse con el paso upload y la pestaña excel activa', () => {
    expect(component.step()).toBe('upload');
    expect(component.activeTab()).toBe('excel');
    expect(component.updateExisting()).toBe(true);
    expect(component.totalRowsCount()).toBe(0);
    expect(component.canCommit()).toBe(false);
  });

  it('debe permitir cambiar de pestaña a image y viceversa', () => {
    component.setTab('image');
    expect(component.activeTab()).toBe('image');
    expect(component.selectedFile()).toBeNull();

    component.setTab('excel');
    expect(component.activeTab()).toBe('excel');
  });

  it('debe calcular métricas correctamente con filas válidas, existentes y con errores', () => {
    const mockRows: ProductImportRow[] = [
      {
        rowNumber: 2,
        sku: 'LAP-001',
        name: 'Laptop Gamer',
        categoryName: 'Tecnología',
        purchasePrice: 2000,
        salePrice: 3000,
        initialStock: 10,
        minimumStock: 2,
        isValid: true,
        isExisting: false,
        validationErrors: []
      },
      {
        rowNumber: 3,
        sku: 'MOU-001',
        name: 'Mouse Óptico',
        categoryName: 'Tecnología',
        purchasePrice: 20,
        salePrice: 35,
        initialStock: 50,
        minimumStock: 5,
        isValid: true,
        isExisting: true,
        validationErrors: ['SKU ya existe en el catálogo.']
      },
      {
        rowNumber: 4,
        sku: '',
        name: 'Sin SKU',
        categoryName: 'Tecnología',
        purchasePrice: 10,
        salePrice: -5,
        initialStock: -1,
        minimumStock: 0,
        isValid: false,
        isExisting: false,
        validationErrors: ['El SKU es obligatorio.', 'El precio de venta debe ser mayor a 0.']
      }
    ];

    component.rows.set(mockRows);

    expect(component.totalRowsCount()).toBe(3);
    expect(component.validCount()).toBe(1);
    expect(component.existingCount()).toBe(1);
    expect(component.errorCount()).toBe(1);
    expect(component.canCommit()).toBe(true);
  });

  it('debe permitir remover una fila y recalcular las métricas', () => {
    const mockRows: ProductImportRow[] = [
      {
        rowNumber: 2,
        sku: 'LAP-001',
        name: 'Laptop Gamer',
        categoryName: 'Tecnología',
        purchasePrice: 2000,
        salePrice: 3000,
        initialStock: 10,
        minimumStock: 2,
        isValid: true,
        isExisting: false,
        validationErrors: []
      }
    ];

    component.rows.set(mockRows);
    expect(component.totalRowsCount()).toBe(1);

    component.removeRow(0);
    expect(component.totalRowsCount()).toBe(0);
    expect(component.canCommit()).toBe(false);
  });

  it('debe ejecutar commitImport y emitir resultado con éxito', () => {
    const mockRows: ProductImportRow[] = [
      {
        rowNumber: 2,
        sku: 'LAP-001',
        name: 'Laptop Gamer',
        categoryName: 'Tecnología',
        purchasePrice: 2000,
        salePrice: 3000,
        initialStock: 10,
        minimumStock: 2,
        isValid: true,
        isExisting: false,
        validationErrors: []
      }
    ];

    const mockResult: BulkImportResult = {
      totalProcessed: 1,
      createdCount: 1,
      updatedCount: 0,
      errorCount: 0,
      details: ['Producto creado exitosamente']
    };

    productServiceMock.commitBulkImport.mockReturnValue(of(mockResult));

    component.rows.set(mockRows);

    let emittedResult: BulkImportResult | undefined;
    component.imported.subscribe((res) => (emittedResult = res));

    component.commitImport();

    expect(productServiceMock.commitBulkImport).toHaveBeenCalled();
    expect(component.step()).toBe('success');
    expect(component.resultSummary()).toEqual(mockResult);
    expect(emittedResult).toEqual(mockResult);
  });
});
