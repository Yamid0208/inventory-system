export type SaleStatus = 'Draft' | 'Completed' | 'Cancelled';
export type PaymentMethod = 'Cash' | 'CreditCard' | 'Transfer' | 'Credit' | 'Nequi' | 'Daviplata' | 'DebitCard' | 'Mixed';
export type InvoiceType = 'Traditional' | 'Electronic';

export interface SalePayment {
  id?: number;
  method: PaymentMethod | string;
  amount: number;
  reference?: string;
}

export interface SalePaymentRequest {
  method: PaymentMethod | string;
  amount: number;
  reference?: string;
}

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
  payments?: SalePayment[];
  warehouseId?: number;
  warehouseName?: string;
  warehouseCode?: string;
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
  payments?: SalePaymentRequest[];
  warehouseId?: number;
}

export interface SaleFilterParams {
  status?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
  warehouseId?: number;
}
