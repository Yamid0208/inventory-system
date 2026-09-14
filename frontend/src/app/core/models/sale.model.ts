export type SaleStatus = 'Draft' | 'Completed' | 'Cancelled';
export type PaymentMethod = 'Cash' | 'CreditCard' | 'Transfer' | 'Credit';
export type InvoiceType = 'Traditional' | 'Electronic';

export interface SaleItem {
  id: number;
  productId: number;
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface Sale {
  id: number;
  saleNumber: string;
  customerName: string;
  customerTaxId?: string;
  customerEmail?: string;
  userId: number;
  userName: string;
  saleDate: string;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  invoiceType: InvoiceType;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  items: SaleItem[];
}

export interface CreateSaleItemRequest {
  productId: number;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface CreateSaleRequest {
  customerName: string;
  customerTaxId?: string;
  customerEmail?: string;
  paymentMethod: PaymentMethod;
  invoiceType: InvoiceType;
  saleDate: string;
  notes?: string;
  items: CreateSaleItemRequest[];
}

export interface SaleFilterParams {
  status?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}
