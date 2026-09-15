/**
 * Utilidades para formateo y parseo numérico con separador de miles (punto)
 * y decimales (coma o punto según entrada).
 * Ejemplo: 1000 -> "1.000", 15000 -> "15.000", 2500000 -> "2.500.000"
 */

export function formatThousands(
  value: number | string | null | undefined,
  options?: { preserveDecimals?: boolean; maxDecimals?: number }
): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const strVal = String(value).trim();
  if (strVal === '') return '0';

  // Si viene con coma como decimal, convertir a punto temporalmente para parsing
  let normalized = strVal;
  if (typeof value === 'string') {
    // Si contiene puntos y comas (ej. 1.250,50), quitar puntos y reemplazar coma
    if (strVal.includes('.') && strVal.includes(',')) {
      normalized = strVal.replace(/\./g, '').replace(',', '.');
    } else if (strVal.includes(',')) {
      normalized = strVal.replace(',', '.');
    }
  }

  const num = typeof value === 'number' ? value : Number(normalized);
  if (isNaN(num)) {
    return '0';
  }

  // Separar signo si es negativo
  const isNegative = num < 0;
  const absStr = Math.abs(num).toString();
  const parts = absStr.split('.');

  // Formatear parte entera con puntos cada 3 dígitos
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  let result = (isNegative ? '-' : '') + intPart;

  if (parts.length > 1 && (options?.preserveDecimals ?? true)) {
    let decPart = parts[1];
    if (options?.maxDecimals !== undefined) {
      decPart = decPart.slice(0, options.maxDecimals);
    }
    if (decPart.length > 0) {
      result += ',' + decPart;
    }
  }

  return result;
}

export function parseThousands(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  const str = String(value).trim();
  if (str === '') return 0;

  // Quitar separadores de miles (puntos) y reemplazar coma decimal por punto
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
