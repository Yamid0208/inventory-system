import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SettingsService } from './settings.service';
import { of } from 'rxjs';

describe('SettingsService (Unit Tests)', () => {
  const httpClientMock = {
    get: vi.fn().mockReturnValue(of({ companyName: 'LogiStock Enterprise S.A.S.', taxId: '901.458.789-2', defaultTaxRate: 19 })),
    put: vi.fn().mockReturnValue(of({ companyName: 'LogiStock Enterprise S.A.S.', taxId: '901.458.789-2', defaultTaxRate: 19 }))
  };

  const injector = createEnvironmentInjector([
    SettingsService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(SettingsService);

  it('should call get on /api/v1/settings', () => {
    service.getSettings().subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/settings');
  });

  it('should call put on /api/v1/settings', () => {
    service.updateSettings({
      companyName: 'LogiStock S.A.S.',
      taxId: '901.458.789-2',
      email: 'info@logistock.com',
      phone: '+57 601 555 0000',
      address: 'Calle 100',
      city: 'Bogotá',
      defaultTaxRate: 19
    }).subscribe();
    expect(httpClientMock.put).toHaveBeenCalledWith('/api/v1/settings', expect.any(Object));
  });
});
