import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { TableStateManager } from './table-state-manager';

interface TestItem {
  id: number;
  name: string;
  sku: string;
  price: number;
  active: boolean;
  category: { name: string };
  createdAt: string;
}

describe('TableStateManager', () => {
  let manager: TableStateManager<TestItem>;

  const sampleData: TestItem[] = [
    {
      id: 1,
      name: 'Café Colombiano Premium',
      sku: 'SKU-001',
      price: 25000,
      active: true,
      category: { name: 'Bebidas' },
      createdAt: '2026-01-10T10:00:00Z'
    },
    {
      id: 2,
      name: 'Azúcar Morena 1kg',
      sku: 'SKU-002',
      price: 4500,
      active: false,
      category: { name: 'Abarrotes' },
      createdAt: '2026-02-15T10:00:00Z'
    },
    {
      id: 3,
      name: 'Té Verde Orgánico',
      sku: 'SKU-003',
      price: 18000,
      active: true,
      category: { name: 'Bebidas' },
      createdAt: '2026-03-01T10:00:00Z'
    }
  ];

  beforeEach(() => {
    manager = new TableStateManager<TestItem>();
    manager.setData(sampleData);
  });

  it('inicializa con datos completos y conteos correctos', () => {
    expect(manager.totalCount()).toBe(3);
    expect(manager.filteredCount()).toBe(3);
    expect(manager.isFiltered()).toBe(false);
    expect(manager.processedItems().length).toBe(3);
  });

  describe('Búsqueda Omni-Campo', () => {
    it('filtra por coincidencia de texto ignorando acentos y mayúsculas', () => {
      // Buscar "cafe" sin tilde debe encontrar "Café Colombiano Premium"
      manager.setSearch('cafe');
      expect(manager.processedItems().length).toBe(1);
      expect(manager.processedItems()[0].id).toBe(1);
      expect(manager.isFiltered()).toBe(true);
    });

    it('filtra por propiedades anidadas como categoría', () => {
      manager.setSearch('abarrotes');
      expect(manager.processedItems().length).toBe(1);
      expect(manager.processedItems()[0].sku).toBe('SKU-002');
    });

    it('filtra por campos numéricos como precio', () => {
      manager.setSearch('18000');
      expect(manager.processedItems().length).toBe(1);
      expect(manager.processedItems()[0].id).toBe(3);
    });

    it('retorna vacío si ningún campo coincide', () => {
      manager.setSearch('inexistente');
      expect(manager.processedItems().length).toBe(0);
      expect(manager.filteredCount()).toBe(0);
    });

    it('restaura la lista al limpiar la búsqueda', () => {
      manager.setSearch('verde');
      expect(manager.processedItems().length).toBe(1);
      manager.setSearch('');
      expect(manager.processedItems().length).toBe(3);
    });
  });

  describe('Ordenamiento Universal por Columna', () => {
    it('ordena por texto alfabéticamente en ciclo asc -> desc -> reset', () => {
      // 1. asc
      manager.toggleSort('name');
      expect(manager.sortKey()).toBe('name');
      expect(manager.sortDirection()).toBe('asc');
      expect(manager.processedItems()[0].name).toBe('Azúcar Morena 1kg');

      // 2. desc
      manager.toggleSort('name');
      expect(manager.sortDirection()).toBe('desc');
      expect(manager.processedItems()[0].name).toBe('Té Verde Orgánico');

      // 3. reset
      manager.toggleSort('name');
      expect(manager.sortKey()).toBeNull();
      expect(manager.sortDirection()).toBeNull();
      expect(manager.processedItems()[0].id).toBe(1); // Orden original
    });

    it('ordena por números asc y desc correctamente', () => {
      manager.toggleSort('price'); // asc: 4500, 18000, 25000
      expect(manager.processedItems()[0].price).toBe(4500);
      expect(manager.processedItems()[2].price).toBe(25000);

      manager.toggleSort('price'); // desc: 25000, 18000, 4500
      expect(manager.processedItems()[0].price).toBe(25000);
      expect(manager.processedItems()[2].price).toBe(4500);
    });

    it('ordena por propiedades anidadas', () => {
      manager.toggleSort('category.name'); // Abarrotes, Bebidas, Bebidas
      expect(manager.processedItems()[0].category.name).toBe('Abarrotes');
    });

    it('ordena por fechas ISO', () => {
      manager.toggleSort('createdAt'); // asc: Enero, Febrero, Marzo
      expect(manager.processedItems()[0].id).toBe(1);
      manager.toggleSort('createdAt'); // desc: Marzo, Febrero, Enero
      expect(manager.processedItems()[0].id).toBe(3);
    });

    it('combina búsqueda omni-campo con ordenamiento', () => {
      manager.setSearch('bebidas'); // 2 items: Cafe (25000) y Te (18000)
      manager.toggleSort('price'); // asc
      expect(manager.processedItems().length).toBe(2);
      expect(manager.processedItems()[0].id).toBe(3); // Te Verde (18000)
      expect(manager.processedItems()[1].id).toBe(1); // Cafe (25000)
    });
  });
});
