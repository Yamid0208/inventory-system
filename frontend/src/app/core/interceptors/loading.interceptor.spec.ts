import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { HttpRequest, HttpResponse, HttpContext } from '@angular/common/http';
import { of } from 'rxjs';
import { loadingInterceptor, BYPASS_LOADING } from './loading.interceptor';
import { LoadingService } from '../services/loading.service';

describe('loadingInterceptor', () => {
  let loadingServiceMock: {
    show: ReturnType<typeof vi.fn>;
    hide: ReturnType<typeof vi.fn>;
    getMessageForUrl: ReturnType<typeof vi.fn>;
  };
  let injector: any;

  beforeEach(() => {
    loadingServiceMock = {
      show: vi.fn(),
      hide: vi.fn(),
      getMessageForUrl: vi.fn().mockReturnValue('Cargando inventario...')
    };

    injector = createEnvironmentInjector([
      { provide: LoadingService, useValue: loadingServiceMock }
    ], null as any);
  });

  it('debe activar show() y hide() al completar una petición estándar', () => {
    const req = new HttpRequest('GET', '/api/v1/inventory/kardex');
    const next = vi.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    runInInjectionContext(injector, () => {
      loadingInterceptor(req, next).subscribe();
    });

    expect(loadingServiceMock.getMessageForUrl).toHaveBeenCalledWith('/api/v1/inventory/kardex');
    expect(loadingServiceMock.show).toHaveBeenCalledWith('Cargando inventario...');
    expect(loadingServiceMock.hide).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(req);
  });

  it('debe omitir la carga si la petición tiene BYPASS_LOADING habilitado', () => {
    const context = new HttpContext().set(BYPASS_LOADING, true);
    const req = new HttpRequest('GET', '/api/v1/silent-ping', { context });
    const next = vi.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    runInInjectionContext(injector, () => {
      loadingInterceptor(req, next).subscribe();
    });

    expect(loadingServiceMock.show).not.toHaveBeenCalled();
    expect(loadingServiceMock.hide).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(req);
  });

  it('debe omitir la carga automáticamente en peticiones de refresh de token', () => {
    const req = new HttpRequest('POST', '/api/v1/auth/refresh');
    const next = vi.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    runInInjectionContext(injector, () => {
      loadingInterceptor(req, next).subscribe();
    });

    expect(loadingServiceMock.show).not.toHaveBeenCalled();
    expect(loadingServiceMock.hide).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(req);
  });
});
