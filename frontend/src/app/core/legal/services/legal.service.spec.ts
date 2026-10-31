import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LegalService } from './legal.service';
import { TermsStatus, LegalConsentResult } from '../models/legal.models';
import { of } from 'rxjs';

describe('LegalService (Unit Tests)', () => {
  const mockStatus: TermsStatus = {
    hasAccepted: false,
    currentTermsVersion: '1.0',
    currentPrivacyVersion: '1.0',
    acceptedAt: null,
    ipAddress: null,
    userEmail: 'admin@insincro.com'
  };

  const mockResult: LegalConsentResult = {
    success: true,
    message: 'Consentimiento legal registrado exitosamente.',
    acceptedAt: new Date().toISOString(),
    ipAddress: '190.24.12.3',
    userEmail: 'admin@insincro.com',
    termsVersion: '1.0'
  };

  const httpClientMock = {
    get: vi.fn().mockReturnValue(of(mockStatus)),
    post: vi.fn().mockReturnValue(of(mockResult))
  };

  const injector = createEnvironmentInjector([
    LegalService,
    { provide: HttpClient, useValue: httpClientMock }
  ], null as any);

  const service = injector.get(LegalService);

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get consent status via GET /api/v1/legal/status', () => {
    service.getConsentStatus().subscribe(status => {
      expect(status.hasAccepted).toBe(false);
      expect(status.currentTermsVersion).toBe('1.0');
    });

    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/legal/status');
  });

  it('should accept terms via POST /api/v1/legal/accept', () => {
    service.acceptTerms({ termsVersion: '1.0', privacyPolicyVersion: '1.0' }).subscribe(res => {
      expect(res.success).toBe(true);
      expect(res.termsVersion).toBe('1.0');
    });

    expect(httpClientMock.post).toHaveBeenCalledWith('/api/v1/legal/accept', {
      termsVersion: '1.0',
      privacyPolicyVersion: '1.0'
    });
  });

  it('should toggle legal viewer modal state', () => {
    expect(service.isLegalModalOpen()).toBe(false);
    service.openLegalViewer();
    expect(service.isLegalModalOpen()).toBe(true);
    service.closeLegalViewer();
    expect(service.isLegalModalOpen()).toBe(false);
  });
});
