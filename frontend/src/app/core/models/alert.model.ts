export interface StockAlert {
  productId: number;
  sku: string;
  name: string;
  currentStock: number;
  minimumStock: number;
  deficit: number;
  suggestedQuantity: number;
  unitPurchasePrice: number;
  estimatedTotalCost: number;
  severity: 'Critical' | 'Warning';
  categoryName: string;
  supplierId: number;
  supplierName: string;
  supplierEmail?: string;
}

export interface StockAlertSummary {
  totalAlerts: number;
  criticalCount: number;
  warningCount: number;
  estimatedTotalReplenishmentCost: number;
}

export interface StockAlertFilterParams {
  severity?: string;
  categoryId?: number;
  supplierId?: number;
  search?: string;
}
