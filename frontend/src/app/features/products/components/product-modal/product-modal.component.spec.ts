import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FormBuilder } from '@angular/forms';
import { ProductModalComponent } from './product-modal.component';
import { Warehouse } from '../../../../core/models/warehouse.model';
import { Category } from '../../../../core/models/category.model';
import { Supplier } from '../../../../core/models/supplier.model';
import { Product } from '../../../../core/models/product.model';

describe('ProductModalComponent (Unit Tests)', () => {
  let component: ProductModalComponent;
  let fb: FormBuilder;

  const mockWarehouses: Warehouse[] = [
    { id: 1, name: 'Sede Principal', code: 'BOG-01', city: 'Bogotá', isActive: true, employeeCount: 2, createdAt: '2026-09-01' },
    { id: 3, name: 'Sede Algarrobo', code: 'ALG-01', city: 'Algarrobo', isActive: true, employeeCount: 1, createdAt: '2026-09-16' }
  ];

  const mockCategories: Category[] = [
    { id: 1, name: 'Electrónica', description: 'Gadgets', isActive: true, productCount: 5, totalStock: 20, hasInventory: true, createdAt: '2026-09-01' }
  ];

  const mockSuppliers: Supplier[] = [
    { id: 1, name: 'Tech Dist SAS', taxId: '900123456', contactName: 'Carlos', isActive: true, productCount: 3, createdAt: '2026-09-01' }
  ];

  beforeEach(() => {
    fb = new FormBuilder();
    component = new ProductModalComponent(fb);
    component.categories = mockCategories;
    component.suppliers = mockSuppliers;
    component.warehouses = mockWarehouses;
  });

  it('debe inicializar el formulario con defaultWarehouseId si se proporciona', () => {
    component.defaultWarehouseId = 3;
    component.ngOnInit();

    expect(component.form).toBeDefined();
    expect(component.form.get('warehouseId')?.value).toBe(3);
    expect(component.warehouseOptions.length).toBe(2);
    expect(component.warehouseOptions[1].label).toBe('Sede Algarrobo (ALG-01)');
  });

  it('debe emitir createReq con warehouseId al enviar un nuevo producto', () => {
    component.defaultWarehouseId = 3;
    component.ngOnInit();

    component.form.patchValue({
      sku: 'SKU-ALG-100',
      name: 'Audífonos Bluetooth',
      description: 'Inalámbricos',
      categoryId: 1,
      supplierId: 1,
      purchasePrice: 50000,
      salePrice: 90000,
      minimumStock: 5,
      warehouseId: 3
    });

    let emittedPayload: any = null;
    component.save.subscribe(payload => {
      emittedPayload = payload;
    });

    component.onSubmit();

    expect(emittedPayload).not.toBeNull();
    expect(emittedPayload.sku).toBe('SKU-ALG-100');
    expect(emittedPayload.name).toBe('Audífonos Bluetooth');
    expect(emittedPayload.warehouseId).toBe(3);
  });

  it('debe emitir updateReq al editar un producto existente', () => {
    const existingProduct: Product = {
      id: 10,
      sku: 'SKU-EXISTING',
      name: 'Producto Existente',
      description: 'Desc',
      categoryId: 1,
      categoryName: 'Electrónica',
      supplierId: 1,
      supplierName: 'Tech Dist SAS',
      purchasePrice: 20000,
      salePrice: 40000,
      currentStock: 10,
      minimumStock: 2,
      imageUrl: null,
      isActive: true,
      stockStatus: 'InStock',
      rowVersion: 'QkNERUY=',
      createdAt: '2026-09-01',
      updatedAt: null,
      warehouseId: 1
    };

    component.product = existingProduct;
    component.ngOnInit();

    component.form.patchValue({
      name: 'Producto Actualizado'
    });

    let emittedPayload: any = null;
    component.save.subscribe(payload => {
      emittedPayload = payload;
    });

    component.onSubmit();

    expect(emittedPayload).not.toBeNull();
    expect(emittedPayload.name).toBe('Producto Actualizado');
    expect(emittedPayload.rowVersion).toBe('QkNERUY=');
  });
});
