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

// Modelos INSINCRO POS: Métodos de Pago y Top Productos
export interface PaymentMethodBreakdown {
  method: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface SalesSummaryMetrics {
  totalSalesAmount: number;
  totalTransactions: number;
  averageTicket: number;
  totalSubtotal: number;
  totalTax: number;
  paymentMethods: PaymentMethodBreakdown[];
}

export interface TopProductReportItem {
  productId: number;
  sku: string;
  productName: string;
  categoryName: string;
  unitsSold: number;
  totalRevenue: number;
  averageUnitPrice: number;
}

// Modelos INSINCRO POS: Finanzas & Rentabilidad (CMV Histórico)
export interface ProductProfitabilityItem {
  productId: number;
  sku: string;
  productName: string;
  categoryName: string;
  unitsSold: number;
  totalRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMarginPercentage: number;
}

export interface ProfitabilitySummary {
  totalRevenue: number;
  totalCostOfGoodsSold: number;
  grossProfit: number;
  grossMarginPercentage: number;
  totalItemsSold: number;
  productDetails: PagedReportResult<ProductProfitabilityItem>;
}

// Modelos INSINCRO POS: Caja & Conciliación
export interface CashRegisterSessionReportItem {
  sessionId: number;
  sessionNumber: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string | null;
  status: string;
  initialCash: number;
  totalSales: number;
  totalCashInflow: number;
  totalCashOutflow: number;
  totalElectronicInflow: number;
  expectedCash: number;
  actualCash?: number | null;
  difference?: number | null;
  differenceStatus?: string | null;
}

export interface CashRegisterReconciliationSummary {
  totalOpeningBalance: number;
  totalExpectedCash: number;
  totalActualCash: number;
  totalDifference: number;
  totalElectronicInflow: number;
  totalSessionsCount: number;
  sessions: PagedReportResult<CashRegisterSessionReportItem>;
}

// Modelos INSINCRO POS: Auditoría
export interface AuditActivityReportItem {
  id: number;
  createdAt: string;
  entityName: string;
  action: string;
  details: string;
  userName: string;
  ipAddress?: string | null;
}

// Modelos INSINCRO POS: Suite de Análisis Empresarial e Inteligencia Comercial
export interface SalesAnalyticsSummary {
  totalRevenue: number;
  netRevenue: number;
  tax: number;
  transactionCount: number;
  averageTicket: number;
  unitsSold: number;
  prevTotalRevenue: number;
  prevTransactionCount: number;
  prevAverageTicket: number;
  revenueGrowthPct: number;
  transactionsGrowthPct: number;
  ticketGrowthPct: number;
  paymentMethods: PaymentMethodBreakdown[];
}

export interface SalesByCategoryItem {
  categoryId: number;
  categoryName: string;
  unitsSold: number;
  totalRevenue: number;
  sharePercentage: number;
  transactionCount: number;
}

export interface HourlyActivityItem {
  hour: number;
  hourLabel: string;
  transactionCount: number;
  totalRevenue: number;
  isPeakHour: boolean;
}

export interface SalesByEmployeeItem {
  userId: number;
  employeeName: string;
  role: string;
  transactionCount: number;
  totalRevenue: number;
  averageTicket: number;
  sharePercentage: number;
}

export interface SalesTrendItem {
  date: string;
  label: string;
  transactionCount: number;
  totalRevenue: number;
}

export interface InventoryValuationSummary {
  totalCostValuation: number;
  totalRetailValuation: number;
  potentialProfit: number;
  profitMarginPercentage: number;
  totalStockUnits: number;
  totalProductsCount: number;
  stagnantCapitalAmount: number;
  stagnantProductsCount: number;
  categoryACount: number;
  categoryACostAmount: number;
  categoryASharePct: number;
  categoryBCount: number;
  categoryBCostAmount: number;
  categoryBSharePct: number;
  categoryCCount: number;
  categoryCCostAmount: number;
  categoryCSharePct: number;
}

export interface InventoryValuationByCategory {
  categoryId: number;
  categoryName: string;
  totalUnits: number;
  totalCostValuation: number;
  totalRetailValuation: number;
  potentialProfit: number;
  profitMarginPercentage: number;
  capitalSharePercentage: number;
  productCount: number;
}

export interface InventoryValuationItem {
  productId: number;
  sku: string;
  productName: string;
  categoryId: number;
  categoryName: string;
  supplierName: string;
  currentStock: number;
  minimumStock: number;
  unitCost: number;
  unitPrice: number;
  totalCostValuation: number;
  totalRetailValuation: number;
  potentialProfit: number;
  profitMarginPercentage: number;
  abcClassification: string;
  daysWithoutSales: number;
  isStagnant: boolean;
  lastSaleDate?: string | null;
}

export type ReportCategoryKey = 'sales' | 'finance' | 'inventory' | 'purchases' | 'cash' | 'audit';

export type ReportTypeKey =
  | 'sales'
  | 'sales-top'
  | 'sales-categories'
  | 'sales-hourly'
  | 'sales-employees'
  | 'inventory'
  | 'inventory-valuation'
  | 'low-stock'
  | 'purchases'
  | 'products'
  | 'finance'
  | 'cash-reconciliation'
  | 'audit';

export type DatePreset = 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'all' | 'custom';
