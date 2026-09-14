import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { AppDatePickerComponent } from './app-date-picker.component';

describe('AppDatePickerComponent (Unit Tests)', () => {
  const injector = createEnvironmentInjector([AppDatePickerComponent], null as any);
  const component = injector.get(AppDatePickerComponent);

  it('should instantiate date picker', () => {
    expect(component).toBeTruthy();
    expect(component.value).toBe('');
  });

  it('should format date string and Date object on writeValue', () => {
    component.writeValue('2026-09-02T10:00:00Z');
    expect(component.value).toBe('2026-09-02');

    const date = new Date('2026-12-31T00:00:00Z');
    component.writeValue(date);
    expect(component.value).toBe('2026-12-31');
  });

  it('should emit onDateChange', () => {
    const fn = vi.fn();
    component.registerOnChange(fn);

    const mockEvent = { target: { value: '2026-10-15' } } as unknown as Event;
    component.onDateChange(mockEvent);

    expect(component.value).toBe('2026-10-15');
    expect(fn).toHaveBeenCalledWith('2026-10-15');
  });
});
