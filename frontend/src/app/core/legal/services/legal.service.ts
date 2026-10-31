import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TermsStatus,
  AcceptTermsRequest,
  LegalConsentResult,
  LegalDocuments,
  TermsAcceptanceRecord
} from '../models/legal.models';

@Injectable({
  providedIn: 'root'
})
export class LegalService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/legal';

  readonly isLegalModalOpen = signal<boolean>(false);

  openLegalViewer(): void {
    this.isLegalModalOpen.set(true);
  }

  closeLegalViewer(): void {
    this.isLegalModalOpen.set(false);
  }

  getConsentStatus(): Observable<TermsStatus> {
    return this.http.get<TermsStatus>(`${this.baseUrl}/status`);
  }

  getDocuments(): Observable<LegalDocuments> {
    return this.http.get<LegalDocuments>(`${this.baseUrl}/documents`);
  }

  acceptTerms(request: AcceptTermsRequest = { termsVersion: '1.0', privacyPolicyVersion: '1.0' }): Observable<LegalConsentResult> {
    return this.http.post<LegalConsentResult>(`${this.baseUrl}/accept`, request);
  }

  getAuditRecords(): Observable<TermsAcceptanceRecord[]> {
    return this.http.get<TermsAcceptanceRecord[]>(`${this.baseUrl}/audit-records`);
  }
}
