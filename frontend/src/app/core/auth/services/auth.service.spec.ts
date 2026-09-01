import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService (Unit Tests)', () => {
  const httpClientMock = {
    post: vi.fn(),
    get: vi.fn()
  };
  const routerMock = {
    navigate: vi.fn()
  };

  const injector = createEnvironmentInjector([
    AuthService,
    { provide: HttpClient, useValue: httpClientMock },
    { provide: Router, useValue: routerMock }
  ], null as any);

  const service = injector.get(AuthService);

  it('should initialize with no user and unauthenticated by default', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.isAdmin()).toBe(false);
  });

  it('should set access token properly in signal', () => {
    service.setAccessToken('sample.jwt.token');
    expect(service.accessToken()).toBe('sample.jwt.token');
  });

  it('should return false for hasRole when no user is logged in', () => {
    expect(service.hasRole(['Admin', 'Warehouse'])).toBe(false);
  });
});
