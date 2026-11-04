import { Injectable } from '@angular/core';

export interface CsvColumnMapping {
  key: string;
  header: string;
  formatter?: (val: any, row: any) => string;
}

export interface CsvExportOptions<T = any> {
  filename?: string;
  columns: (string | CsvColumnMapping)[];
  data: T[];
  delimiter?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CsvExportService {
  /**
   * Exporta un arreglo de datos a formato CSV con codificación UTF-8 y BOM (\uFEFF)
   * para compatibilidad completa con Microsoft Excel en español.
   */
  exportToCsv<T = any>(options: CsvExportOptions<T>): boolean {
    if (!options.data || options.data.length === 0) {
      return false;
    }

    const delimiter = options.delimiter || ',';
    const columns: CsvColumnMapping[] = options.columns.map((col) => {
      if (typeof col === 'string') {
        return { key: col, header: col };
      }
      return col;
    });

    // 1. Fila de Encabezados
    const headerRow = columns
      .map((c) => this.escapeField(c.header, delimiter))
      .join(delimiter);

    // 2. Filas de Datos
    const dataRows = options.data.map((row) => {
      return columns
        .map((col) => {
          const rawValue = this.resolveValue(row, col.key);
          const formattedValue = col.formatter
            ? col.formatter(rawValue, row)
            : this.formatValue(rawValue);
          return this.escapeField(formattedValue, delimiter);
        })
        .join(delimiter);
    });

    const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const rawFilename = options.filename || `export_${this.getIsoDate()}`;
    const filename = rawFilename.endsWith('.csv') ? rawFilename : `${rawFilename}.csv`;

    this.triggerDownload(blob, filename);
    return true;
  }

  /**
   * Resuelve valores simples o anidados (ej. 'category.name', 'customer.taxId')
   */
  resolveValue(row: any, key: string): any {
    if (!row || !key) return '';
    if (key.indexOf('.') === -1) {
      return row[key] ?? '';
    }
    const parts = key.split('.');
    let current = row;
    for (const part of parts) {
      if (current === null || current === undefined) return '';
      current = current[part];
    }
    return current ?? '';
  }

  /**
   * Formatea valores genéricos (fechas, booleanos, números, objetos)
   */
  formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Escapa un campo conforme a RFC 4180 y mitiga inyecciones de fórmulas CSV (CWE-1236)
   */
  escapeField(val: string, delimiter: string = ','): string {
    if (val === null || val === undefined) return '';
    let stringVal = String(val);

    // Mitigación CSV Formula Injection: si comienza con =, +, -, @, \t, \r, anteponer comilla simple '
    const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
    if (dangerousPrefixes.some((prefix) => stringVal.startsWith(prefix))) {
      stringVal = `'${stringVal}`;
    }

    // Escapar comillas dobles y envolver si contiene comas, comillas o saltos de línea
    const needsQuotes =
      stringVal.includes(delimiter) ||
      stringVal.includes('"') ||
      stringVal.includes('\n') ||
      stringVal.includes('\r');

    if (needsQuotes) {
      stringVal = `"${stringVal.replace(/"/g, '""')}"`;
    }

    return stringVal;
  }

  /**
   * Dispara la descarga del archivo en el navegador
   */
  triggerDownload(blob: Blob, filename: string): void {
    if (typeof window === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }, 150);
  }

  getIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
