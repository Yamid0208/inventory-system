export interface Supplier {
  id: number;
  name: string;
  taxId: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string | null;
  warehouseId?: number | null;
}

export interface CreateSupplierRequest {
  name: string;
  taxId: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface UpdateSupplierRequest {
  name: string;
  taxId: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface UpdateSupplierStatusRequest {
  isActive: boolean;
}
