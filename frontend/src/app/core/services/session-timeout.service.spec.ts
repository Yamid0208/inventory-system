import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { SessionTimeoutService } from './session-timeout.service';
import { AuthService } from '../auth/services/auth.service';
import { NotificationService } from './notification.service';
import { of } from 'rxjs';

describe('SessionTimeoutService (Unit Tests)', () => {
  const authServiceMock = {
    isAuthenticated: vi.fn().mockReturnValue(true),
    refresh: vi.fn().mockReturnValue(of({})),
    logout: vi.fn()
  };

  const routerMock = {
    navigate: vi.fn()
  };

  const notificationServiceMock = {
    warning: vi.fn(),
    info: vi.fn()
  };

  const ngZoneMock = {
    run: (fn: Function) => fn(),
    runOutsideAngular: (fn: Function) => fn()
  } as unknown as NgZone;

  let service: SessionTimeoutService;

  beforeEach(() => {
    vi.clearAllMocks();
    const injector = createEnvironmentInjector([
      SessionTimeoutService,
      { provide: AuthService, useValue: authServiceMock },
      { provide: Router, useValue: routerMock },
      { provide: NotificationService, useValue: notificationServiceMock },
      { provide: NgZone, useValue: ngZoneMock }
    ], null as any);

    service = injector.get(SessionTimeoutService);
  });

  it('should initialize with warning hidden and 60s remaining', () => {
    expect(service.showWarning()).toBe(false);
    expect(service.remainingSeconds()).toBe(60);
  });

  it('should perform autoLogout correctly', () => {
    service.autoLogout();

    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    expect(notificationServiceMock.warning).toHaveBeenCalled();
    expect(service.showWarning()).toBe(false);
  });

  it('should extend session on extendSession call', () => {
    service.showWarning.set(true);
    service.extendSession();

    expect(authServiceMock.refresh).toHaveBeenCalled();
    expect(notificationServiceMock.info).toHaveBeenCalled();
    expect(service.showWarning()).toBe(false);
  });
});
