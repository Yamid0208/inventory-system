export interface TermsStatus {
  hasAccepted: boolean;
  currentTermsVersion: string;
  currentPrivacyVersion: string;
  acceptedAt?: string | null;
  ipAddress?: string | null;
  userEmail?: string | null;
}

export interface AcceptTermsRequest {
  termsVersion: string;
  privacyPolicyVersion: string;
}

export interface LegalConsentResult {
  success: boolean;
  message: string;
  acceptedAt: string;
  ipAddress: string;
  userEmail: string;
  termsVersion: string;
}

export interface LegalDocuments {
  termsVersion: string;
  privacyVersion: string;
  lastUpdated: string;
  termsTitle: string;
  termsContent: string;
  privacyTitle: string;
  privacyContent: string;
}

export interface TermsAcceptanceRecord {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  userRole: string;
  termsVersion: string;
  privacyPolicyVersion: string;
  acceptedAt: string;
  ipAddress: string;
  userAgent?: string | null;
}

