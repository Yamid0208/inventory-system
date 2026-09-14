import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserAdminService } from './user-admin.service';
import { of } from 'rxjs';

describe('UserAdminService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 10 })),
    post: vi.fn().mockReturnValue(of({})),
    put: vi.fn().mockReturnValue(of({})),
    patch: vi.fn().mockReturnValue(of({}))
  };

  const injector = createEnvironmentInjector([
    UserAdminService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(UserAdminService);

  it('should call get on /api/v1/users with params', () => {
    service.getUsers({ role: 'Admin', search: 'Carlos' }).subscribe();
    expect(httpClientMock.get).toHaveBeenCalled();
  });

  it('should call post to create user', () => {
    service.createUser({ fullName: 'Test', email: 'test@sgi.local', role: 'Seller', password: 'Password123*' }).subscribe();
    expect(httpClientMock.post).toHaveBeenCalledWith('/api/v1/users', expect.any(Object));
  });

  it('should call patch to toggle user status', () => {
    service.toggleStatus(5).subscribe();
    expect(httpClientMock.patch).toHaveBeenCalledWith('/api/v1/users/5/status', {});
  });

  it('should call post to reset password', () => {
    service.resetPassword(5, { newPassword: 'NewPassword123*' }).subscribe();
    expect(httpClientMock.post).toHaveBeenCalledWith('/api/v1/users/5/reset-password', { newPassword: 'NewPassword123*' });
  });
});
