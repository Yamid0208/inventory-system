import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DashboardService } from './dashboard.service';
import { of } from 'rxjs';

describe('DashboardService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of({ kpis: {}, categories: [], recentMovements: [], criticalProducts: [] }))
  };

  const injector = createEnvironmentInjector([
    DashboardService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(DashboardService);

  it('should call get on /api/v1/dashboard/summary', () => {
    service.getSummary().subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/dashboard/summary', expect.any(Object));
  });
});
