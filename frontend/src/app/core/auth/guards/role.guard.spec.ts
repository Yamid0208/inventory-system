import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { signal, createEnvironmentInjector } from '@angular/core';

describe('roleGuard (Unit Tests)', () => {
  let authServiceMock: { currentUser: ReturnType<typeof signal> };
  let routerMock: { navigate: ReturnType<typeof vi.fn> };
  let injector: any;

  beforeEach(() => {
    vi.clearAllMocks();
    authServiceMock = {
      currentUser: signal({
        id: 1,
        fullName: 'Usuario Prueba',
        email: 'test@sgi.local',
        role: 'Admin',
        isActive: true
      })
    };

    routerMock = {
      navigate: vi.fn()
    };

    injector = createEnvironmentInjector([
      { provide: AuthService, useValue: authServiceMock },
      { provide: Router, useValue: routerMock }
    ]);
  });

  it('permite el acceso si el rol del usuario está incluido en data.roles', () => {
    const route = {
      data: { roles: ['SuperAdmin', 'Admin'] }
    } as unknown as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;

    const result = injector.runInContext(() => roleGuard(route, state));
    expect(result).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('bloquea el acceso y redirige a /dashboard si el rol no está autorizado', () => {
    const route = {
      data: { roles: ['SuperAdmin'] }
    } as unknown as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;

    const result = injector.runInContext(() => roleGuard(route, state));
    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('permite el acceso libre si no se definen roles en route.data', () => {
    const route = {
      data: {}
    } as unknown as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;

    const result = injector.runInContext(() => roleGuard(route, state));
    expect(result).toBe(true);
  });
});
