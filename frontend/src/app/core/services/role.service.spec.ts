import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RoleService } from './role.service';
import { of } from 'rxjs';

describe('RoleService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of([]))
  };

  const injector = createEnvironmentInjector([
    RoleService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(RoleService);

  it('should call get on /api/v1/roles/matrix', () => {
    service.getMatrix().subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/roles/matrix');
  });

  it('should call get on /api/v1/roles/my-permissions', () => {
    service.getMyPermissions().subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/roles/my-permissions');
  });
});
