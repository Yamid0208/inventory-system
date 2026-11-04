import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CsvExportService } from './csv-export.service';

describe('CsvExportService', () => {
  let service: CsvExportService;

  beforeEach(() => {
    service = new CsvExportService();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('retorna false si no hay datos para exportar', () => {
    const result = service.exportToCsv({
      columns: ['id', 'name'],
      data: []
    });
    expect(result).toBe(false);
  });

  it('resuelve propiedades anidadas correctamente', () => {
    const row = { id: 1, user: { profile: { name: 'Juan' } } };
    expect(service.resolveValue(row, 'user.profile.name')).toBe('Juan');
    expect(service.resolveValue(row, 'user.profile.age')).toBe('');
    expect(service.resolveValue(row, 'not.existing.key')).toBe('');
  });

  it('escapa campos con comas y comillas según RFC 4180', () => {
    const escaped = service.escapeField('Texto, con "comas"');
    expect(escaped).toBe('"Texto, con ""comas"""');
  });

  it('mitiga CSV Formula Injection agregando comilla simple de prefijo', () => {
    expect(service.escapeField('=SUM(A1:A10)')).toBe('\'=SUM(A1:A10)');
    expect(service.escapeField('+12345')).toBe('\'+12345');
    expect(service.escapeField('-500')).toBe('\'-500');
    expect(service.escapeField('@cmd')).toBe('\'@cmd');
  });

  it('formatea booleanos y fechas adecuadamente', () => {
    expect(service.formatValue(true)).toBe('Sí');
    expect(service.formatValue(false)).toBe('No');
    const date = new Date('2026-11-03T12:00:00Z');
    expect(service.formatValue(date)).toBe('2026-11-03');
    expect(service.formatValue(null)).toBe('');
    expect(service.formatValue(undefined)).toBe('');
  });

  it('genera y descarga CSV con UTF-8 BOM', () => {
    const triggerSpy = vi.spyOn(service, 'triggerDownload').mockImplementation(() => {});

    const success = service.exportToCsv({
      filename: 'productos_test',
      columns: [
        { key: 'sku', header: 'Código SKU' },
        { key: 'name', header: 'Nombre del Producto' },
        { key: 'price', header: 'Precio', formatter: (val) => `$${val}` }
      ],
      data: [
        { sku: 'PROD-01', name: 'Arroz Diana 1kg', price: 4500 },
        { sku: 'PROD-02', name: 'Aceite "Girasol"', price: 8900 }
      ]
    });

    expect(success).toBe(true);
    expect(triggerSpy).toHaveBeenCalledOnce();
    const args = triggerSpy.mock.calls[0];
    expect(args[1]).toBe('productos_test.csv');
    expect(args[0]).toBeInstanceOf(Blob);
  });
});
