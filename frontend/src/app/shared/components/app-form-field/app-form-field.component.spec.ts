import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { AppFormFieldComponent } from './app-form-field.component';

describe('AppFormFieldComponent (Unit Tests)', () => {
  const injector = createEnvironmentInjector([AppFormFieldComponent], null as any);
  const component = injector.get(AppFormFieldComponent);

  it('should instantiate component', () => {
    expect(component).toBeTruthy();
    expect(component.required).toBe(false);
  });

  it('should accept label, required and error inputs', () => {
    component.label = 'Razón Social';
    component.required = true;
    component.error = 'Campo obligatorio';

    expect(component.label).toBe('Razón Social');
    expect(component.required).toBe(true);
    expect(component.error).toBe('Campo obligatorio');
  });
});
