import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { PurchaseReturnModalComponent } from './purchase-return-modal.component';
import { Purchase } from '../../../../core/models/purchase.model';
import { ConfirmationService } from '../../../../core/services/confirmation.service';

describe('PurchaseReturnModalComponent', () => {
  let component: PurchaseReturnModalComponent;
  let mockConfirmationService: any;

  const mockPurchase: Purchase = {
    id: 1,
    purchaseNumber: 'PUR-20260914-1001',
    supplierId: 10,
    supplierName: 'Distribuidora Global',
    userId: 1,
    userName: 'Admin',
    purchaseDate: '2026-09-14T00:00:00Z',
    status: 'Received',
    subtotal: 100000,
    tax: 19000,
    total: 119000,
    items: [
      {
        id: 101,
        productId: 5,
        productSku: 'PROD-005',
        productName: 'Teclado Mecánico',
        quantity: 10,
        unitPrice: 10000,
        subtotal: 100000,
        tax: 19000,
        total: 119000
      }
    ]
  };

  beforeEach(() => {
    mockConfirmationService = {
      confirm: vi.fn().mockResolvedValue(true)
    };

    const fb = new FormBuilder();
    component = new PurchaseReturnModalComponent(fb, mockConfirmationService);
    component.purchase = mockPurchase;
    component.ngOnInit();
  });

  it('should initialize form with purchase items unchecked', () => {
    expect(component.itemsArray.length).toBe(1);
    expect(component.itemsArray.at(0).get('selected')?.value).toBe(false);
    expect(component.itemsArray.at(0).get('purchasedQuantity')?.value).toBe(10);
    expect(component.selectedCount).toBe(0);
  });

  it('should prevent submission if no items are selected or reason is empty', async () => {
    const emitSpy = vi.spyOn(component.confirmReturn, 'emit');
    await component.onSubmit();
    expect(emitSpy).not.toHaveBeenCalled();

    // Select item but leave reason empty
    component.itemsArray.at(0).patchValue({ selected: true, returnQuantity: 2 });
    await component.onSubmit();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should detect invalid return quantity exceeding purchased quantity', () => {
    component.itemsArray.at(0).patchValue({ selected: true, returnQuantity: 15 });
    expect(component.hasInvalidReturnQuantities()).toBe(true);
  });

  it('should confirm and emit return request when valid', async () => {
    const emitSpy = vi.spyOn(component.confirmReturn, 'emit');
    component.form.patchValue({ reason: 'Mercancía con defecto de fábrica' });
    component.itemsArray.at(0).patchValue({ selected: true, returnQuantity: 3 });

    expect(component.hasInvalidReturnQuantities()).toBe(false);
    expect(component.totalUnitsToReturn).toBe(3);

    await component.onSubmit();

    expect(mockConfirmationService.confirm).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith({
      reason: 'Mercancía con defecto de fábrica',
      items: [{ productId: 5, quantity: 3 }],
      notes: undefined
    });
  });
});
