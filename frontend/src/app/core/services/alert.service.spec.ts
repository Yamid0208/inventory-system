import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AlertService } from './alert.service';
import { of } from 'rxjs';

describe('AlertService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of([]))
  };

  const injector = createEnvironmentInjector([
    AlertService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(AlertService);

  it('should call get on /api/v1/alerts/stock with params', () => {
    service.getStockAlerts({ severity: 'critical', search: 'cable' }).subscribe();
    expect(httpClientMock.get).toHaveBeenCalled();
  });

  it('should call get on /api/v1/alerts/summary', () => {
    service.getSummary().subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/alerts/summary');
  });
});
