export interface Customer {
  id: number;
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCustomerRequest {
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  notes?: string;
}

export interface UpdateCustomerRequest {
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  notes?: string;
}

export interface CustomerFilterParams {
  search?: string;
  isActive?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface CustomerSummary {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
}
