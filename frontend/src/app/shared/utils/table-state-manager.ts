import { signal, computed, Signal } from '@angular/core';

export type SortDirection = 'asc' | 'desc' | null;

export interface TableStateManagerOptions<T> {
  data?: Signal<T[]> | (() => T[]);
  initialSortKey?: string;
  initialSortDirection?: SortDirection;
  searchableKeys?: string[];
  customComparators?: Record<string, (a: any, b: any, direction: 'asc' | 'desc') => number>;
}

export class TableStateManager<T = any> {
  private readonly internalData = signal<T[]>([]);
  readonly rawData: Signal<T[]>;
  readonly searchQuery = signal<string>('');
  readonly sortKey = signal<string | null>(null);
  readonly sortDirection = signal<SortDirection>(null);

  private readonly searchableKeys?: string[];
  private readonly customComparators?: Record<string, (a: any, b: any, direction: 'asc' | 'desc') => number>;

  constructor(options?: TableStateManagerOptions<T>) {
    if (options?.data) {
      const dataAccessor = options.data;
      this.rawData = computed(() => {
        const val = typeof dataAccessor === 'function' ? dataAccessor() : (dataAccessor as Signal<T[]>)();
        return val || [];
      });
    } else {
      this.rawData = this.internalData.asReadonly();
    }

    if (options?.initialSortKey) {
      this.sortKey.set(options.initialSortKey);
      this.sortDirection.set(options.initialSortDirection ?? 'asc');
    }
    this.searchableKeys = options?.searchableKeys;
    this.customComparators = options?.customComparators;
  }

  /**
   * Colección procesada reactivamente: filtrada por búsqueda omni-campo y ordenada
   */
  readonly processedItems: Signal<T[]> = computed(() => {
    let items = [...this.rawData()];
    const query = this.normalizeText(this.searchQuery().trim());

    // 1. Filtrado de Búsqueda Omni-Campo
    if (query) {
      items = items.filter((item) => this.matchItem(item, query));
    }

    // 2. Ordenamiento por Columna
    const key = this.sortKey();
    const direction = this.sortDirection();

    if (key && direction) {
      const customComp = this.customComparators?.[key];
      items.sort((a, b) => {
        if (customComp) {
          return customComp(a, b, direction);
        }
        return this.compareItems(a, b, key, direction);
      });
    }

    return items;
  });

  readonly totalCount = computed(() => this.rawData().length);
  readonly filteredCount = computed(() => this.processedItems().length);
  readonly isFiltered = computed(() => this.searchQuery().trim().length > 0);

  /**
   * Actualiza los datos fuente (cuando no se usa Signal de entrada)
   */
  setData(items: T[]): void {
    this.internalData.set(items || []);
  }

  /**
   * Actualiza el término de búsqueda global
   */
  setSearch(query: string): void {
    this.searchQuery.set(query || '');
  }

  /**
   * Alterna el ordenamiento de una columna: asc -> desc -> null (reseteo)
   */
  toggleSort(key: string): void {
    const currentKey = this.sortKey();
    const currentDir = this.sortDirection();

    if (currentKey !== key) {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
      return;
    }

    if (currentDir === 'asc') {
      this.sortDirection.set('desc');
    } else if (currentDir === 'desc') {
      this.sortKey.set(null);
      this.sortDirection.set(null);
    } else {
      this.sortDirection.set('asc');
    }
  }

  /**
   * Resetea el orden a su estado original
   */
  resetSort(): void {
    this.sortKey.set(null);
    this.sortDirection.set(null);
  }

  /**
   * Resuelve el valor de una clave simple o anidada
   */
  resolveValue(item: any, key: string): any {
    if (!item || !key) return null;
    if (key.indexOf('.') === -1) {
      return item[key] ?? null;
    }
    const parts = key.split('.');
    let current = item;
    for (const part of parts) {
      if (current === null || current === undefined) return null;
      current = current[part];
    }
    return current ?? null;
  }

  /**
   * Evalúa si un item coincide con el término de búsqueda en cualquier campo
   */
  private matchItem(item: any, normalizedQuery: string): boolean {
    if (!item) return false;

    if (this.searchableKeys && this.searchableKeys.length > 0) {
      return this.searchableKeys.some((k) => {
        const val = this.resolveValue(item, k);
        return this.valueMatches(val, normalizedQuery);
      });
    }

    return this.deepMatch(item, normalizedQuery);
  }

  private deepMatch(obj: any, query: string, depth = 0): boolean {
    if (depth > 4 || obj === null || obj === undefined) return false;

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return this.valueMatches(obj, query);
    }

    if (Array.isArray(obj)) {
      return obj.some((elem) => this.deepMatch(elem, query, depth + 1));
    }

    if (typeof obj === 'object') {
      for (const prop of Object.keys(obj)) {
        if (this.deepMatch(obj[prop], query, depth + 1)) {
          return true;
        }
      }
    }

    return false;
  }

  private valueMatches(val: any, query: string): boolean {
    if (val === null || val === undefined) return false;
    const str = this.normalizeText(String(val));
    return str.includes(query);
  }

  /**
   * Compara dos registros de forma inteligente
   */
  private compareItems(a: any, b: any, key: string, direction: 'asc' | 'desc'): number {
    const valA = this.resolveValue(a, key);
    const valB = this.resolveValue(b, key);

    const dirFactor = direction === 'asc' ? 1 : -1;

    // Nulos y undefined al final
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;
    if (valA === valB) return 0;

    // Comparación booleana
    if (typeof valA === 'boolean' && typeof valB === 'boolean') {
      return (valA === valB ? 0 : valA ? 1 : -1) * dirFactor;
    }

    // Comparación de fechas ISO o tipo Date
    if (valA instanceof Date && valB instanceof Date) {
      return (valA.getTime() - valB.getTime()) * dirFactor;
    }
    if (typeof valA === 'string' && typeof valB === 'string') {
      const isIsoDateA = /^\d{4}-\d{2}-\d{2}/.test(valA);
      const isIsoDateB = /^\d{4}-\d{2}-\d{2}/.test(valB);
      if (isIsoDateA && isIsoDateB) {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        if (!isNaN(timeA) && !isNaN(timeB)) {
          return (timeA - timeB) * dirFactor;
        }
      }
    }

    // Comparación numérica (soporta números o strings monetarios)
    const numA = typeof valA === 'number' ? valA : this.parsePotentialNumber(valA);
    const numB = typeof valB === 'number' ? valB : this.parsePotentialNumber(valB);
    if (numA !== null && numB !== null) {
      return (numA - numB) * dirFactor;
    }

    // Comparación de cadenas con soporte de acentos en español
    const strA = String(valA);
    const strB = String(valB);
    return strA.localeCompare(strB, 'es', { sensitivity: 'base', numeric: true }) * dirFactor;
  }

  private parsePotentialNumber(val: any): number | null {
    if (typeof val !== 'string') return null;
    const clean = val.replace(/[\$\s\.]/g, '').replace(',', '.');
    const parsed = Number(clean);
    return isNaN(parsed) || clean.trim() === '' ? null : parsed;
  }

  /**
   * Normaliza texto a minúsculas y remueve acentos
   */
  private normalizeText(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
