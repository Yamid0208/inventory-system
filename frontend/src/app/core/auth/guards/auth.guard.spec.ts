import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { signal, createEnvironmentInjector } from '@angular/core';
import { of, throwError, firstValueFrom, isObservable } from 'rxjs';

describe('authGuard (Unit Tests)', () => {
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof signal>;
    accessToken: ReturnType<typeof signal>;
    refresh: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };
  let injector: any;

  beforeEach(() => {
    vi.clearAllMocks();
    authServiceMock = {
      isAuthenticated: signal(true),
      accessToken: signal<string | null>('valid.access.token'),
      refresh: vi.fn().mockReturnValue(of({ accessToken: 'new.token' })),
      logout: vi.fn()
    };

    routerMock = {
      createUrlTree: vi.fn((commands, extras) => ({ commands, extras } as unknown as UrlTree))
    };

    injector = createEnvironmentInjector([
      { provide: AuthService, useValue: authServiceMock },
      { provide: Router, useValue: routerMock }
    ]);
  });

  it('permite la navegación inmediata si el usuario está autenticado y tiene token en memoria', () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/dashboard' } as RouterStateSnapshot;

    const result = injector.runInContext(() => authGuard(route, state));
    expect(result).toBe(true);
    expect(authServiceMock.refresh).not.toHaveBeenCalled();
    expect(routerMock.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirige a /login si no hay usuario autenticado', () => {
    authServiceMock.isAuthenticated.set(false);
    authServiceMock.accessToken.set(null);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/dashboard' } as RouterStateSnapshot;

    const result = injector.runInContext(() => authGuard(route, state));
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/dashboard' }
    });
    expect(authServiceMock.refresh).not.toHaveBeenCalled();
  });

  it('espera el refresco silencioso en recarga F5 cuando hay sesión pero no hay token en memoria', async () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.accessToken.set(null);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/dashboard' } as RouterStateSnapshot;

    const guardResult = injector.runInContext(() => authGuard(route, state));
    expect(isObservable(guardResult)).toBe(true);
    expect(authServiceMock.refresh).toHaveBeenCalled();

    const allowed = await firstValueFrom(guardResult as any);
    expect(allowed).toBe(true);
  });

  it('cierra sesión y redirige a /login si el refresco de token falla en recarga F5', async () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.accessToken.set(null);
    authServiceMock.refresh.mockReturnValue(throwError(() => new Error('Refresh token expirado')));

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/dashboard' } as RouterStateSnapshot;

    const guardResult = injector.runInContext(() => authGuard(route, state));
    const redirectTarget = await firstValueFrom(guardResult as any);

    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/dashboard' }
    });
    expect(redirectTarget).toBeDefined();
  });
});

