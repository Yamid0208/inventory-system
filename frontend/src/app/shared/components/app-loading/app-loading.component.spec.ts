import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, ComponentRef } from '@angular/core';
import { AppLoadingComponent } from './app-loading.component';

describe('AppLoadingComponent (Unit Tests)', () => {
  const injector = createEnvironmentInjector([
    AppLoadingComponent
  ], null as any);

  const component = injector.get(AppLoadingComponent);

  it('debe instanciarse correctamente con valores por defecto', () => {
    expect(component).toBeTruthy();
    expect(component.overlay()).toBe(false);
    expect(component.message()).toBe('Cargando servicios...');
  });

  it('debe limpiar los puntos suspensivos en displayMessage para animación uniforme', () => {
    expect(component.displayMessage()).toBe('Cargando servicios');
  });
});
