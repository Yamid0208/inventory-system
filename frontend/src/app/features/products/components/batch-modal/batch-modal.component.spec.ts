import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { BatchModalComponent } from './batch-modal.component';
import { BatchService } from '../../../../core/services/batch.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Product } from '../../../../core/models/product.model';
import { of } from 'rxjs';

describe('BatchModalComponent (Unit Tests)', () => {
  const dummyProduct: Product = {
    id: 5,
    sku: 'PROD-005',
    name: 'Monitor Gamer',
    categoryId: 1,
    categoryName: 'Monitores',
    supplierId: 1,
    supplierName: 'Dell Inc.',
    purchasePrice: 200,
    salePrice: 350,
    currentStock: 25,
    minimumStock: 5,
    stockStatus: 'InStock',
    isActive: true,
    rowVersion: 'AAAA=='
  };

  const batchServiceMock = {
    getBatches: vi.fn().mockReturnValue(of([
      { id: 1, batchNumber: 'LOT-A', expirationDate: '2026-10-01', initialQuantity: 20, currentQuantity: 20, status: 'Good', daysToExpiration: 28 }
    ])),
    createBatch: vi.fn().mockReturnValue(of({ id: 2, batchNumber: 'LOT-B' }))
  };

  const notificationServiceMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  const injector = createEnvironmentInjector([
    BatchModalComponent,
    { provide: BatchService, useValue: batchServiceMock },
    { provide: NotificationService, useValue: notificationServiceMock }
  ], null as any);

  const component = injector.get(BatchModalComponent);
  component.product = dummyProduct;

  it('should instantiate batch modal and load batches', () => {
    expect(component).toBeTruthy();
    component.loadBatches();
    expect(batchServiceMock.getBatches).toHaveBeenCalledWith(5);
    expect(component.batches().length).toBe(1);
    expect(component.batches()[0].batchNumber).toBe('LOT-A');
  });

  it('should submit new batch and notify success', () => {
    component.newBatchNumber = 'LOT-B';
    component.newExpirationDate = '2026-12-01';
    component.newQuantity = 15;

    component.submitBatch();

    expect(batchServiceMock.createBatch).toHaveBeenCalledWith(5, expect.objectContaining({
      batchNumber: 'LOT-B',
      initialQuantity: 15
    }));
    expect(notificationServiceMock.success).toHaveBeenCalled();
  });
});
