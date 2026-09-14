import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CategoryService } from './category.service';
import { of } from 'rxjs';

describe('CategoryService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of([])),
    post: vi.fn().mockReturnValue(of({})),
    put: vi.fn().mockReturnValue(of({})),
    patch: vi.fn().mockReturnValue(of({})),
    delete: vi.fn().mockReturnValue(of(null))
  };

  const injector = createEnvironmentInjector([
    CategoryService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(CategoryService);

  it('should call get on /api/v1/categories when requesting list', () => {
    service.getCategories().subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/categories', expect.any(Object));
  });

  it('should call post when creating category', () => {
    const payload = { name: 'Hardware', description: 'Components' };
    service.createCategory(payload).subscribe();
    expect(httpClientMock.post).toHaveBeenCalledWith('/api/v1/categories', payload);
  });

  it('should call patch when toggling category status', () => {
    service.toggleStatus(5, false).subscribe();
    expect(httpClientMock.patch).toHaveBeenCalledWith('/api/v1/categories/5/status', { isActive: false });
  });

  it('should call delete when removing category', () => {
    service.deleteCategory(10).subscribe();
    expect(httpClientMock.delete).toHaveBeenCalledWith('/api/v1/categories/10');
  });
});
