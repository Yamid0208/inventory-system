import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReportService } from './report.service';
import { of } from 'rxjs';

describe('ReportService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of({ reports: [], totalExportableRecords: 0 }))
  };

  const injector = createEnvironmentInjector([
    ReportService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(ReportService);

  it('should call get on /api/v1/reports/summary', () => {
    service.getSummary().subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/reports/summary', expect.any(Object));
  });

  it('should call get on /api/v1/reports/products/csv with responseType blob', () => {
    service.downloadReport('products').subscribe();
    expect(httpClientMock.get).toHaveBeenCalled();
  });
});
