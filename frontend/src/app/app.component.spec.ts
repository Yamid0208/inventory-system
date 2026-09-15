import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth/services/auth.service';
import { SessionTimeoutService } from './core/services/session-timeout.service';
import { LoadingService } from './core/services/loading.service';
import { of } from 'rxjs';
import { signal } from '@angular/core';

describe('AppComponent', () => {
  const authServiceMock = {
    refresh: vi.fn().mockReturnValue(of({}))
  };
  const sessionTimeoutServiceMock = {
    init: vi.fn(),
    startMonitoring: vi.fn()
  };
  const loadingServiceMock = {
    isLoading: signal(false),
    message: signal('Cargando servicios...')
  };

  const injector = createEnvironmentInjector([
    { provide: AuthService, useValue: authServiceMock },
    { provide: SessionTimeoutService, useValue: sessionTimeoutServiceMock },
    { provide: LoadingService, useValue: loadingServiceMock }
  ], null as any);

  it('should create the app shell component within injection context', () => {
    const app = runInInjectionContext(injector, () => new AppComponent());
    expect(app).toBeTruthy();
  });
});
