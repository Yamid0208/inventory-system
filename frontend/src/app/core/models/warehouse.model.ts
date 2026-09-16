export interface Warehouse {
  id: number;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  adminUserId?: number | null;
  adminUserName?: string | null;
  adminUserEmail?: string | null;
  isActive: boolean;
  employeeCount: number;
  createdAt: string;
}

export interface CreateClientAdminRequest {
  warehouseName: string;
  warehouseCode: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  address?: string;
  city?: string;
  phone?: string;
}

export interface CreateWarehouseRequest {
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
  adminUserId?: number;
}

export interface UpdateWarehouseRequest {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  isActive: boolean;
}
