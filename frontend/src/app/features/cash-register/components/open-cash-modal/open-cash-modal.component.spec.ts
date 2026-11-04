import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FormBuilder } from '@angular/forms';
import { OpenCashModalComponent } from './open-cash-modal.component';
import { Warehouse } from '../../../../core/models/warehouse.model';

describe('OpenCashModalComponent (Obligatoriedad de Sede/Almacén al Abrir Caja)', () => {
  let component: OpenCashModalComponent;

  const mockWarehouses: Warehouse[] = [
    { id: 1, name: 'Sede Principal Norte', code: 'BOG-NORTE', isActive: true, city: 'Bogotá' } as any,
    { id: 2, name: 'Sede Sur Bodega', code: 'BOG-SUR', isActive: true, city: 'Bogotá' } as any
  ];

  beforeEach(() => {
    component = new OpenCashModalComponent(new FormBuilder());
  });

  it('debe instanciarse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('el formulario debe ser inválido si no se selecciona una sede/almacén (warehouseId es obligatorio)', () => {
    component.warehouses = mockWarehouses;
    component.defaultWarehouseId = null;
    component.ngOnInit();

    // Resetear explícitamente warehouseId a null
    component.form.patchValue({
      initialCash: 100000,
      warehouseId: null
    });

    expect(component.form.valid).toBe(false);
    expect(component.form.get('warehouseId')?.hasError('required')).toBe(true);
  });

  it('no debe emitir submitOpen si la sede no está seleccionada', () => {
    component.warehouses = mockWarehouses;
    component.defaultWarehouseId = null;
    component.ngOnInit();

    component.form.patchValue({
      initialCash: 50000,
      warehouseId: null
    });

    const submitSpy = vi.spyOn(component.submitOpen, 'emit');
    component.onSubmit();

    expect(submitSpy).not.toHaveBeenCalled();
    expect(component.form.get('warehouseId')?.touched).toBe(true);
  });

  it('debe emitir submitOpen con el warehouseId obligatorio seleccionado cuando los datos son válidos', () => {
    component.warehouses = mockWarehouses;
    component.defaultWarehouseId = 2;
    component.ngOnInit();

    component.form.patchValue({
      initialCash: 150000,
      warehouseId: 2,
      notes: 'Turno tarde verificado'
    });

    expect(component.form.valid).toBe(true);

    let emittedRequest: any = null;
    component.submitOpen.subscribe((req) => {
      emittedRequest = req;
    });

    component.onSubmit();

    expect(emittedRequest).toBeTruthy();
    expect(emittedRequest.warehouseId).toBe(2);
    expect(emittedRequest.initialCash).toBe(150000);
    expect(emittedRequest.notes).toBe('Turno tarde verificado');
  });
});
