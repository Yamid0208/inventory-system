import { PagedResult } from './product.model';

export type MovementType = 'Purchase' | 'Sale' | 'AdjustmentIn' | 'AdjustmentOut' | 'Return';

export interface InventoryMovement {
  id: number;
  movementNumber: string;
  productId: number;
  productSku: string;
  productName: string;
  movementType: MovementType;
  quantityDelta: number;
  previousStock: number;
  newStock: number;
  unitPrice: number;
  reference?: string;
  notes?: string;
  userId: number;
  userName: string;
  createdAt: string;
}

export interface KardexFilterParams {
  productId?: number;
  movementType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateStockAdjustmentRequest {
  productId: number;
  adjustmentType: 'AdjustmentIn' | 'AdjustmentOut';
  quantity: number;
  reason: string;
  notes?: string;
}

export interface ProcessReturnRequest {
  productId: number;
  returnType: 'CustomerReturn' | 'SupplierReturn';
  quantity: number;
  reason: string;
  referenceDocument?: string;
  notes?: string;
}

