import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReportService } from './report.service';
import { of } from 'rxjs';

describe('ReportService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 0 }))
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

  it('should query /api/v1/reports/sales/data with date filters and pagination', () => {
    service.getSalesData('2026-11-01', '2026-11-03', 1, 1, 10).subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/reports/sales/data', expect.any(Object));
  });

  it('should query /api/v1/reports/products/data with search term and pagination', () => {
    service.getProductsData(1, 'Taladro', 1, 25).subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/reports/products/data', expect.any(Object));
  });
});
