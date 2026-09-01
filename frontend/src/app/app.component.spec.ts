import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth/services/auth.service';
import { of } from 'rxjs';

describe('AppComponent', () => {
  const authServiceMock = {
    refresh: vi.fn().mockReturnValue(of({}))
  };

  const injector = createEnvironmentInjector([
    { provide: AuthService, useValue: authServiceMock }
  ], null as any);

  it('should create the app shell component within injection context', () => {
    const app = runInInjectionContext(injector, () => new AppComponent());
    expect(app).toBeTruthy();
  });
});
