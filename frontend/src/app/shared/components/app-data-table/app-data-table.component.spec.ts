import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppDataTableComponent } from './app-data-table.component';
import { CsvExportService } from '../../services/csv-export.service';

describe('AppDataTableComponent', () => {
  const csvExportServiceMock = {
    exportToCsv: vi.fn().mockReturnValue(true)
  };

  const injector = createEnvironmentInjector([
    { provide: CsvExportService, useValue: csvExportServiceMock }
  ], null as any);

  it('debe crearse correctamente con valores iniciales', () => {
    const component = runInInjectionContext(injector, () => new AppDataTableComponent());

    expect(component.showToolbar()).toBe(true);
    expect(component.showExportCsv()).toBe(true);
    expect(component.exportFilename()).toBe('datos_tabla');
    expect(component.tableState.totalCount()).toBe(0);
  });

  it('actualiza el término de búsqueda en tableState al disparar onSearchChange', () => {
    const component = runInInjectionContext(injector, () => new AppDataTableComponent());
    component.onSearchChange('texto prueba');

    expect(component.tableState.searchQuery()).toBe('texto prueba');
    expect(component.tableState.isFiltered()).toBe(true);
  });

  it('alterna el orden en tableState al disparar onSortChange', () => {
    const component = runInInjectionContext(injector, () => new AppDataTableComponent());
    component.onSortChange('sku');

    expect(component.tableState.sortKey()).toBe('sku');
    expect(component.tableState.sortDirection()).toBe('asc');
  });

  it('invoca el servicio CsvExportService al disparar onExportCsv', () => {
    const component = runInInjectionContext(injector, () => new AppDataTableComponent());
    (component as any).columns = () => [
      { key: 'sku', header: 'Código' },
      { key: 'name', header: 'Nombre' }
    ];

    component.onExportCsv();

    expect(csvExportServiceMock.exportToCsv).toHaveBeenCalled();
  });
});
