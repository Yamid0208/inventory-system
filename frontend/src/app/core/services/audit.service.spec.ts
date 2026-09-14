import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuditService } from './audit.service';
import { of } from 'rxjs';

describe('AuditService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 15 }))
  };

  const injector = createEnvironmentInjector([
    AuditService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(AuditService);

  it('should call get on /api/v1/audit/logs with params', () => {
    service.getLogs({ entityName: 'User', action: 'Login' }).subscribe();
    expect(httpClientMock.get).toHaveBeenCalled();
  });

  it('should call get on /api/v1/audit/summary', () => {
    service.getSummary().subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/audit/summary');
  });
});
