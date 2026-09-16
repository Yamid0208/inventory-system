export interface Category {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
  totalStock?: number;
  hasInventory?: boolean;
  createdAt: string;
  updatedAt: string | null;
  warehouseId?: number | null;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string | null;
}

export interface UpdateCategoryRequest {
  name: string;
  description?: string | null;
}

export interface UpdateCategoryStatusRequest {
  isActive: boolean;
}
