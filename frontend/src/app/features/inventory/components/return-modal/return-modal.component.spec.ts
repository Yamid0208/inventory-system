import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { ReturnModalComponent } from './return-modal.component';
import { ProductService } from '../../../../core/services/product.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { of } from 'rxjs';

describe('ReturnModalComponent (Unit Tests)', () => {
  const productServiceMock = {
    getProducts: vi.fn().mockReturnValue(of({ items: [{ id: 1, sku: 'PROD-01', name: 'Teclado', currentStock: 10 }] }))
  };
  const inventoryServiceMock = {
    processReturn: vi.fn().mockReturnValue(of({ id: 1, movementNumber: 'DEV-001', newStock: 12, quantityDelta: 2 }))
  };
  const notificationServiceMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  const injector = createEnvironmentInjector([
    ReturnModalComponent,
    { provide: ProductService, useValue: productServiceMock },
    { provide: InventoryService, useValue: inventoryServiceMock },
    { provide: NotificationService, useValue: notificationServiceMock }
  ], null as any);

  const component = injector.get(ReturnModalComponent);

  it('should create return modal component with initial values', () => {
    expect(component).toBeTruthy();
    expect(component.returnType).toBe('CustomerReturn');
    expect(component.quantity).toBe(1);
  });

  it('should load products and handle product selection', () => {
    component.loadProducts();
    expect(productServiceMock.getProducts).toHaveBeenCalled();
    expect(component.products().length).toBe(1);

    component.selectedProductId = 1;
    component.onProductSelected();
    expect(component.selectedProduct()?.name).toBe('Teclado');
  });

  it('should call processReturn when submitting valid return', () => {
    component.selectedProductId = 1;
    component.quantity = 3;
    component.reason = 'Defecto';
    component.submit();

    expect(inventoryServiceMock.processReturn).toHaveBeenCalledWith(expect.objectContaining({
      productId: 1,
      quantity: 3,
      reason: 'Defecto'
    }));
    expect(notificationServiceMock.success).toHaveBeenCalled();
  });
});
