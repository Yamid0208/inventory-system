export type UserRole = 'SuperAdmin' | 'Admin' | 'Warehouse' | 'Seller';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  warehouseId?: number | null;
  warehouseName?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
  expiresAt: string;
}
