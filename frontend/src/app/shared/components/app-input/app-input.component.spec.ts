import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { AppInputComponent } from './app-input.component';

describe('AppInputComponent (Unit Tests)', () => {
  const injector = createEnvironmentInjector([AppInputComponent], null as any);
  const component = injector.get(AppInputComponent);

  it('should instantiate component with defaults', () => {
    expect(component).toBeTruthy();
    expect(component.type).toBe('text');
    expect(component.disabled).toBe(false);
  });

  it('should write and emit value via ControlValueAccessor', () => {
    component.writeValue('Teclado Mecánico');
    expect(component.value).toBe('Teclado Mecánico');

    const fn = vi.fn();
    component.registerOnChange(fn);

    const mockEvent = { target: { value: 'Nuevo Valor' } } as unknown as Event;
    component.onInputChange(mockEvent);

    expect(component.value).toBe('Nuevo Valor');
    expect(fn).toHaveBeenCalledWith('Nuevo Valor');
  });

  it('should convert input to number when type is number', () => {
    component.type = 'number';
    const fn = vi.fn();
    component.registerOnChange(fn);

    const mockEvent = { target: { value: '45.50' } } as unknown as Event;
    component.onInputChange(mockEvent);

    expect(component.value).toBe(45.50);
    expect(fn).toHaveBeenCalledWith(45.50);
  });
});
