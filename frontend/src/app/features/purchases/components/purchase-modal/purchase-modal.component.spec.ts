import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { PurchaseModalComponent } from './purchase-modal.component';
import { Supplier } from '../../../../core/models/supplier.model';
import { Product } from '../../../../core/models/product.model';

describe('PurchaseModalComponent (Supplier Filtering & Line Visibility Tests)', () => {
  let component: PurchaseModalComponent;
  let settingsServiceMock: any;

  const mockSuppliers: Supplier[] = [
    { id: 1, name: 'Proveedor Alpha', taxId: '900.111.111-1', isActive: true } as any,
    { id: 2, name: 'Proveedor Beta', taxId: '900.222.222-2', isActive: true } as any,
    { id: 3, name: 'Proveedor Gamma Sin Productos', taxId: '900.333.333-3', isActive: true } as any
  ];

  const mockProducts: Product[] = [
    { id: 101, sku: 'PROD-A1', name: 'Producto Alpha 1', supplierId: 1, purchasePrice: 5000, currentStock: 10, isActive: true } as any,
    { id: 102, sku: 'PROD-A2', name: 'Producto Alpha 2', supplierId: 1, purchasePrice: 8000, currentStock: 5, isActive: true } as any,
    { id: 201, sku: 'PROD-B1', name: 'Producto Beta 1', supplierId: 2, purchasePrice: 12000, currentStock: 20, isActive: true } as any
  ];

  beforeEach(() => {
    settingsServiceMock = {
      getSettings: vi.fn().mockReturnValue(of({ defaultTaxRate: 19 }))
    };

    component = new PurchaseModalComponent(new FormBuilder(), settingsServiceMock);
    component.suppliers = mockSuppliers;
    component.products = mockProducts;
  });

  it('should initially hide items section when no supplier is selected and keep items empty', () => {
    component.ngOnInit();

    expect(component.selectedSupplierId()).toBeNull();
    expect(component.itemsArray.length).toBe(0);
    expect(component.filteredProducts().length).toBe(0);
  });

  it('should display only products of Supplier Alpha when Supplier Alpha is selected', () => {
    component.ngOnInit();
    component.onSupplierChange(1);

    expect(component.selectedSupplierId()).toBe(1);
    expect(component.filteredProducts().length).toBe(2);
    expect(component.filteredProducts().every(p => p.supplierId === 1)).toBe(true);
    expect(component.itemsArray.length).toBe(1);
  });

  it('should clear lines from previous supplier and update to Supplier Beta when supplier changes', () => {
    component.ngOnInit();
    // Select Supplier Alpha
    component.onSupplierChange(1);
    expect(component.filteredProducts().length).toBe(2);
    component.onProductSelect(0, 101);
    expect(component.itemsArray.at(0).get('productId')?.value).toBe(101);

    // Switch to Supplier Beta
    component.onSupplierChange(2);

    expect(component.selectedSupplierId()).toBe(2);
    expect(component.filteredProducts().length).toBe(1);
    expect(component.filteredProducts()[0].id).toBe(201);
    // Previous line from Alpha should be cleared and replaced with fresh line for Beta
    expect(component.itemsArray.at(0).get('productId')?.value).toBeNull();
  });

  it('should handle supplier without products gracefully with 0 lines and empty list', () => {
    component.ngOnInit();
    component.onSupplierChange(3);

    expect(component.selectedSupplierId()).toBe(3);
    expect(component.filteredProducts().length).toBe(0);
    expect(component.itemsArray.length).toBe(0);
  });

  it('should reactively update supplierOptions when suppliers arrive asynchronously', () => {
    // Start with empty suppliers array (as happens during async page load)
    const freshModal = new PurchaseModalComponent(new FormBuilder(), settingsServiceMock);
    freshModal.suppliers = [];
    freshModal.ngOnInit();

    expect(freshModal.supplierOptions().length).toBe(0);

    // Asynchronous arrival of suppliers
    freshModal.suppliers = mockSuppliers;
    expect(freshModal.supplierOptions().length).toBe(3);
    expect(freshModal.supplierOptions()[0].label).toBe('Proveedor Alpha');
  });

  it('should preload item from alert and reactively update unit price when products arrive asynchronously', () => {
    const freshModal = new PurchaseModalComponent(new FormBuilder(), settingsServiceMock);
    freshModal.preloadedItem = { productId: 101, quantity: 8, supplierId: 1 };
    freshModal.suppliers = mockSuppliers;
    freshModal.products = []; // Products not loaded yet

    freshModal.ngOnInit();

    expect(freshModal.selectedSupplierId()).toBe(1);
    expect(freshModal.itemsArray.length).toBe(1);
    expect(freshModal.itemsArray.at(0).get('productId')?.value).toBe(101);
    expect(freshModal.itemsArray.at(0).get('quantity')?.value).toBe(8);
    // Price was 0 before products arrived
    expect(freshModal.itemsArray.at(0).get('unitPrice')?.value).toBe(0);

    // Asynchronous arrival of products
    freshModal.products = mockProducts;
    // Price should now be populated with product's purchasePrice (5000)
    expect(freshModal.itemsArray.at(0).get('unitPrice')?.value).toBe(5000);
  });

  it('should initialize completely empty and clean when preloadedItem is null', () => {
    const freshModal = new PurchaseModalComponent(new FormBuilder(), settingsServiceMock);
    freshModal.suppliers = mockSuppliers;
    freshModal.products = mockProducts;
    freshModal.preloadedItem = null;

    freshModal.ngOnInit();

    expect(freshModal.selectedSupplierId()).toBeNull();
    expect(freshModal.form.get('supplierId')?.value).toBeNull();
    expect(freshModal.itemsArray.length).toBe(0);
    expect(freshModal.filteredProducts().length).toBe(0);
  });
});
