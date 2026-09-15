import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private activeRequests = signal<number>(0);
  private _isLoading = signal<boolean>(false);
  private _message = signal<string>('Cargando servicios...');
  private showTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /** Estado reactivo que indica si el loader está visible */
  readonly isLoading = this._isLoading.asReadonly();

  /** Mensaje contextual actual */
  readonly message = this._message.asReadonly();

  /**
   * Muestra el spinner de carga.
   * Por defecto aplica un debounce de 120ms para evitar parpadeos en respuestas ultra-rápidas.
   */
  show(customMessage?: string, immediate: boolean = false): void {
    if (customMessage) {
      this._message.set(customMessage);
    }

    this.activeRequests.update((count) => count + 1);

    if (immediate) {
      this.clearDebounce();
      this._isLoading.set(true);
      return;
    }

    if (!this._isLoading() && !this.showTimeoutId) {
      this.showTimeoutId = setTimeout(() => {
        if (this.activeRequests() > 0) {
          this._isLoading.set(true);
        }
        this.showTimeoutId = null;
      }, 120);
    }
  }

  /**
   * Decrementa el contador de peticiones activas.
   * Si ya no hay peticiones en curso, oculta el spinner y limpia timers.
   */
  hide(): void {
    this.activeRequests.update((count) => Math.max(0, count - 1));

    if (this.activeRequests() === 0) {
      this.clearDebounce();
      this._isLoading.set(false);
      this._message.set('Cargando servicios...');
    }
  }

  /**
   * Fuerza el reseteo inmediato del estado de carga (útil en navegación o errores fatales).
   */
  forceReset(): void {
    this.clearDebounce();
    this.activeRequests.set(0);
    this._isLoading.set(false);
    this._message.set('Cargando servicios...');
  }

  /**
   * Actualiza el mensaje mientras el loader está activo.
   */
  setMessage(msg: string): void {
    this._message.set(msg);
  }

  /**
   * Determina un mensaje inteligente basado en la URL del endpoint solicitado.
   */
  getMessageForUrl(url: string): string {
    const cleanUrl = url.toLowerCase();

    if (cleanUrl.includes('/reports')) {
      return 'Generando reporte...';
    }
    if (cleanUrl.includes('/inventory') || cleanUrl.includes('/kardex')) {
      return 'Cargando inventario...';
    }
    if (cleanUrl.includes('/products') || cleanUrl.includes('/batch')) {
      return 'Cargando productos...';
    }
    if (cleanUrl.includes('/sales') || cleanUrl.includes('/invoices')) {
      return 'Cargando ventas...';
    }
    if (cleanUrl.includes('/purchases')) {
      return 'Cargando compras...';
    }
    if (cleanUrl.includes('/dashboard')) {
      return 'Cargando métricas...';
    }
    if (cleanUrl.includes('/customers')) {
      return 'Cargando clientes...';
    }
    if (cleanUrl.includes('/suppliers')) {
      return 'Cargando proveedores...';
    }
    if (cleanUrl.includes('/categories')) {
      return 'Cargando categorías...';
    }
    if (cleanUrl.includes('/warehouses')) {
      return 'Cargando almacenes...';
    }
    if (cleanUrl.includes('/users') || cleanUrl.includes('/roles')) {
      return 'Cargando usuarios...';
    }
    if (cleanUrl.includes('/alerts')) {
      return 'Verificando alertas...';
    }
    if (cleanUrl.includes('/audit')) {
      return 'Cargando auditoría...';
    }
    if (cleanUrl.includes('/auth/login')) {
      return 'Iniciando sesión...';
    }

    return 'Cargando servicios...';
  }

  private clearDebounce(): void {
    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }
  }
}
