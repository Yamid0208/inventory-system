import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ElementRef } from '@angular/core';
import { AppAutocompleteComponent, AutocompleteOption } from './app-autocomplete.component';

describe('AppAutocompleteComponent (Unit Tests)', () => {
  let component: AppAutocompleteComponent;
  const mockOptions: AutocompleteOption[] = [
    { value: 1, label: 'Proveedor Alfa', sublabel: 'NIT: 900.111.222' },
    { value: 2, label: 'Distribuidora Beta', sublabel: 'NIT: 800.333.444' },
    { value: 3, label: 'Comercial Gamma', sublabel: 'NIT: 700.555.666' }
  ];

  beforeEach(() => {
    const mockElRef: any = { nativeElement: { contains: () => false } };
    component = new AppAutocompleteComponent(mockElRef);
    component.options = mockOptions;
  });

  it('should initialize with default closed state and empty query', () => {
    expect(component.isOpen()).toBe(false);
    expect(component.selectedValue()).toBeNull();
    expect(component.filteredOptions().length).toBe(3);
  });

  it('should filter options incrementally by label or sublabel ignoring case and accents', () => {
    component.searchQuery.set('beta');
    expect(component.filteredOptions().length).toBe(1);
    expect(component.filteredOptions()[0].label).toBe('Distribuidora Beta');

    component.searchQuery.set('800.333');
    expect(component.filteredOptions().length).toBe(1);
  });

  it('should select an option, update value, emit change, and update search query', () => {
    const changeSpy = vi.fn();
    component.registerOnChange(changeSpy);
    const emitSpy = vi.spyOn(component.selectionChange, 'emit');

    component.selectOption(mockOptions[0]);

    expect(component.selectedValue()).toBe(1);
    expect(component.searchQuery()).toBe('Proveedor Alfa');
    expect(changeSpy).toHaveBeenCalledWith(1);
    expect(emitSpy).toHaveBeenCalledWith(1);
    expect(component.isOpen()).toBe(false);
  });

  it('should clear selection when clearSelection is called', () => {
    component.selectOption(mockOptions[1]);
    expect(component.selectedValue()).toBe(2);

    const changeSpy = vi.fn();
    component.registerOnChange(changeSpy);
    const clearedSpy = vi.spyOn(component.cleared, 'emit');

    component.clearSelection();

    expect(component.selectedValue()).toBeNull();
    expect(component.searchQuery()).toBe('');
    expect(changeSpy).toHaveBeenCalledWith(null);
    expect(clearedSpy).toHaveBeenCalled();
  });

  it('should support writeValue from ControlValueAccessor', () => {
    component.writeValue(3);

    expect(component.selectedValue()).toBe(3);
    expect(component.selectedOption()?.label).toBe('Comercial Gamma');
    expect(component.searchQuery()).toBe('Comercial Gamma');
  });
});
