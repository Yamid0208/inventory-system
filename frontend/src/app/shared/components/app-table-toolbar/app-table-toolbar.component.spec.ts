import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppTableToolbarComponent } from './app-table-toolbar.component';

describe('AppTableToolbarComponent', () => {
  const injector = createEnvironmentInjector([], null as any);

  it('debe inicializarse con configuración por defecto', () => {
    const component = runInInjectionContext(injector, () => new AppTableToolbarComponent());

    expect(component.searchPlaceholder()).toBe('Buscar en cualquier campo...');
    expect(component.totalCount()).toBe(0);
    expect(component.filteredCount()).toBe(0);
    expect(component.isFiltered()).toBe(false);
    expect(component.showExportCsv()).toBe(true);
  });

  it('emite exportCsv cuando se ejecuta onExport y no está deshabilitado', () => {
    const component = runInInjectionContext(injector, () => new AppTableToolbarComponent());
    let emitted = false;
    component.exportCsv.subscribe(() => (emitted = true));

    component.onExport();
    expect(emitted).toBe(true);
  });

  it('no emite exportCsv si exportDisabled es verdadero', () => {
    const component = runInInjectionContext(injector, () => new AppTableToolbarComponent());
    (component as any).exportDisabled = () => true;

    let emitted = false;
    component.exportCsv.subscribe(() => (emitted = true));

    component.onExport();
    expect(emitted).toBe(false);
  });

  it('limpia la consulta de búsqueda al invocar clearSearch', () => {
    const component = runInInjectionContext(injector, () => new AppTableToolbarComponent());
    component.query = 'texto a limpiar';

    let emittedValue: string | null = null;
    component.searchChange.subscribe((v) => (emittedValue = v));

    component.clearSearch();

    expect(component.query).toBe('');
    expect(emittedValue).toBe('');
  });
});
