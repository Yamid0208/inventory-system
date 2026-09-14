export interface CompanySettings {
  id: number;
  companyName: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  website?: string;
  logoUrl?: string;
  defaultTaxRate: number;
  currencyCode: string;
  currencySymbol: string;
  lowStockThresholdDefault: number;
  allowNegativeStock: boolean;
  enableAuditNotifications: boolean;
  updatedAt?: string;
}

export interface UpdateCompanySettingsRequest {
  companyName: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  defaultTaxRate: number;
  currencyCode?: string;
  currencySymbol?: string;
  lowStockThresholdDefault?: number;
  allowNegativeStock?: boolean;
  enableAuditNotifications?: boolean;
  website?: string;
  logoUrl?: string;
}
