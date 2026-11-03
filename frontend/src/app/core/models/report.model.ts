export interface ReportMetadata {
  key: string;
  title: string;
  description: string;
  icon: string;
  recordCount: number;
  lastUpdated: string;
}

export interface ReportsCatalogSummary {
  reports: ReportMetadata[];
  totalExportableRecords: number;
}

export type ReportSummary = ReportsCatalogSummary;

export interface PagedReportResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalAmount?: number | null;
  totalQuantity?: number | null;
}

export interface ProductReportItem {
  id: number;
  sku: string;
  name: string;
  categoryName: string;
  supplierName: string;
  purchasePrice: number;
  salePrice: number;
  currentStock: number;
  minimumStock: number;
  valuation: number;
  status: string;
  isActive: boolean;
  createdAt: string;
}

export interface InventoryKardexReportItem {
  id: number;
  movementNumber: string;
  createdAt: string;
  type: string;
  productId: number;
  productSku: string;
  productName: string;
  quantityDelta: number;
  previousStock: number;
  newStock: number;
  unitPrice: number;
  operatorName: string;
  reference?: string | null;
  notes?: string | null;
}

export interface SalesReportItem {
  id: number;
  saleNumber: string;
  saleDate: string;
  createdAt: string;
  customerName: string;
  customerTaxId?: string | null;
  paymentMethod: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  itemsCount: number;
}

export interface PurchasesReportItem {
  id: number;
  purchaseNumber: string;
  purchaseDate: string;
  createdAt: string;
  supplierName: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  itemsCount: number;
}

export interface LowStockReportItem {
  id: number;
  sku: string;
  name: string;
  categoryName: string;
  supplierName: string;
  currentStock: number;
  minimumStock: number;
  deficit: number;
  purchasePrice: number;
  estimatedRestockCost: number;
  status: string;
}

export type ReportTypeKey = 'sales' | 'inventory' | 'purchases' | 'products' | 'low-stock';
