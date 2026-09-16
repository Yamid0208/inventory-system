export type PurchaseStatus = 'Pending' | 'Received' | 'Cancelled';

export interface PurchaseItem {
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

export interface Purchase {
  id: number;
  purchaseNumber: string;
  supplierId: number;
  supplierName: string;
  userId: number;
  userName: string;
  purchaseDate: string;
  status: PurchaseStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  items: PurchaseItem[];
}

export interface CreatePurchaseItemRequest {
  productId: number;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface CreatePurchaseRequest {
  supplierId: number;
  purchaseDate: string;
  notes?: string;
  items: CreatePurchaseItemRequest[];
  autoReceive?: boolean;
}

export interface PurchaseFilterParams {
  supplierId?: number;
  warehouseId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface ReturnPurchaseItemRequest {
  productId: number;
  quantity: number;
}

export interface ReturnPurchaseRequest {
  reason: string;
  items: ReturnPurchaseItemRequest[];
  notes?: string;
}

