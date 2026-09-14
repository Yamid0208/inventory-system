import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { AppSelectComponent } from './app-select.component';

describe('AppSelectComponent (Unit Tests)', () => {
  const injector = createEnvironmentInjector([AppSelectComponent], null as any);
  const component = injector.get(AppSelectComponent);

  it('should instantiate component', () => {
    expect(component).toBeTruthy();
    expect(component.options).toEqual([]);
  });

  it('should write and select value', () => {
    component.options = [
      { value: 1, label: 'Electrónica' },
      { value: 2, label: 'Mobiliario' }
    ];

    component.writeValue(2);
    expect(component.value).toBe(2);

    const fn = vi.fn();
    component.registerOnChange(fn);

    const mockEvent = { target: { value: '1' } } as unknown as Event;
    component.onSelectChange(mockEvent);

    expect(component.value).toBe(1);
    expect(fn).toHaveBeenCalledWith(1);
  });
});
