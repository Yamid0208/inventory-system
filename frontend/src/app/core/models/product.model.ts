export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  categoryId: number;
  categoryName: string;
  supplierId: number;
  supplierName: string;
  purchasePrice: number;
  salePrice: number;
  currentStock: number;
  minimumStock: number;
  imageUrl: string | null;
  isActive: boolean;
  stockStatus: 'InStock' | 'LowStock' | 'OutOfStock';
  rowVersion: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface ProductFilterParams {
  search?: string;
  categoryId?: number;
  supplierId?: number;
  warehouseId?: number;
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  isActive?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  description?: string | null;
  categoryId: number;
  supplierId: number;
  warehouseId?: number | null;
  purchasePrice: number;
  salePrice: number;
  minimumStock: number;
  imageUrl?: string | null;
}

export interface UpdateProductRequest {
  name: string;
  description?: string | null;
  categoryId: number;
  supplierId: number;
  purchasePrice: number;
  salePrice: number;
  minimumStock: number;
  imageUrl?: string | null;
  rowVersion: string;
}

export interface UpdateProductStatusRequest {
  isActive: boolean;
}

export interface ProductBatch {
  id: number;
  productId: number;
  batchNumber: string;
  manufacturingDate?: string;
  expirationDate: string;
  initialQuantity: number;
  currentQuantity: number;
  isActive: boolean;
  daysToExpiration: number;
  status: 'Expired' | 'ExpiringSoon' | 'Good';
}

export interface CreateProductBatchRequest {
  batchNumber: string;
  expirationDate: string;
  initialQuantity: number;
  manufacturingDate?: string;
}

