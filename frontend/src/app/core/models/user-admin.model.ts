export interface UserDetail {
  id: number;
  fullName: string;
  email: string;
  role: 'SuperAdmin' | 'Admin' | 'Warehouse' | 'Seller';
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  warehouseId?: number | null;
  warehouseName?: string | null;
}

export interface CreateUserAdminRequest {
  fullName: string;
  email: string;
  password: string;
  role: string;
  warehouseId?: number | null;
}

export interface UpdateUserAdminRequest {
  fullName: string;
  email: string;
  role: string;
  warehouseId?: number | null;
}

export interface ResetUserPasswordRequest {
  newPassword: string;
}

export interface UserAdminFilterParams {
  role?: string;
  isActive?: boolean;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
  warehouseId?: number | null;
}
