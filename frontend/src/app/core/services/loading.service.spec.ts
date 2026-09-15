import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new LoadingService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe inicializarse con isLoading en false y mensaje por defecto', () => {
    expect(service.isLoading()).toBe(false);
    expect(service.message()).toBe('Cargando servicios...');
  });

  it('debe activar isLoading inmediatamente cuando immediate = true', () => {
    service.show('Cargando inventario...', true);
    expect(service.isLoading()).toBe(true);
    expect(service.message()).toBe('Cargando inventario...');
  });

  it('debe aplicar debounce antes de mostrar el loader', () => {
    service.show('Cargando productos...');
    expect(service.isLoading()).toBe(false);

    vi.advanceTimersByTime(130);
    expect(service.isLoading()).toBe(true);
    expect(service.message()).toBe('Cargando productos...');
  });

  it('no debe mostrar loader si la petición concluye antes del debounce', () => {
    service.show('Petición rápida');
    expect(service.isLoading()).toBe(false);

    vi.advanceTimersByTime(50);
    service.hide();

    vi.advanceTimersByTime(100);
    expect(service.isLoading()).toBe(false);
  });

  it('debe gestionar múltiples peticiones concurrentes y solo ocultar al llegar a cero', () => {
    service.show('Petición 1', true);
    service.show('Petición 2', true);
    expect(service.isLoading()).toBe(true);

    service.hide();
    expect(service.isLoading()).toBe(true); // Todavía queda 1 activa

    service.hide();
    expect(service.isLoading()).toBe(false); // Ambas terminaron
    expect(service.message()).toBe('Cargando servicios...');
  });

  it('debe resetear todo el estado inmediatamente con forceReset()', () => {
    service.show('Cargando...', true);
    service.show('Otra...', true);
    expect(service.isLoading()).toBe(true);

    service.forceReset();
    expect(service.isLoading()).toBe(false);
    expect(service.message()).toBe('Cargando servicios...');
  });

  it('debe asignar mensajes contextuales precisos según los endpoints del sistema', () => {
    expect(service.getMessageForUrl('/api/v1/inventory/kardex')).toBe('Cargando inventario...');
    expect(service.getMessageForUrl('/api/v1/products')).toBe('Cargando productos...');
    expect(service.getMessageForUrl('/api/v1/sales')).toBe('Cargando ventas...');
    expect(service.getMessageForUrl('/api/v1/purchases')).toBe('Cargando compras...');
    expect(service.getMessageForUrl('/api/v1/dashboard/summary')).toBe('Cargando métricas...');
    expect(service.getMessageForUrl('/api/v1/reports/inventory')).toBe('Generando reporte...');
    expect(service.getMessageForUrl('/api/v1/customers')).toBe('Cargando clientes...');
    expect(service.getMessageForUrl('/api/v1/suppliers')).toBe('Cargando proveedores...');
    expect(service.getMessageForUrl('/api/v1/categories')).toBe('Cargando categorías...');
    expect(service.getMessageForUrl('/api/v1/warehouses')).toBe('Cargando almacenes...');
    expect(service.getMessageForUrl('/api/v1/users')).toBe('Cargando usuarios...');
    expect(service.getMessageForUrl('/api/v1/alerts')).toBe('Verificando alertas...');
    expect(service.getMessageForUrl('/api/v1/audit')).toBe('Cargando auditoría...');
    expect(service.getMessageForUrl('/api/v1/auth/login')).toBe('Iniciando sesión...');
    expect(service.getMessageForUrl('/api/v1/desconocido')).toBe('Cargando servicios...');
  });
});
