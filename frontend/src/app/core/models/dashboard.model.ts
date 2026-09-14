export interface DashboardKpis {
  totalInventoryValuation: number;
  totalStockUnits: number;
  totalProductsCount: number;
  lowStockProductsCount: number;
  outOfStockProductsCount: number;
  totalSalesAmount: number;
  completedSalesCount: number;
  totalPurchasesAmount: number;
  pendingPurchasesCount: number;
}

export interface CategoryDistribution {
  categoryId: number;
  categoryName: string;
  productCount: number;
  totalStock: number;
  totalValuation: number;
  percentage: number;
}

export interface RecentMovementSummary {
  movementNumber: string;
  productSku: string;
  productName: string;
  movementType: string;
  quantityDelta: number;
  userName: string;
  createdAt: string;
}

export interface CriticalStockItem {
  productId: number;
  sku: string;
  name: string;
  currentStock: number;
  minStock: number;
  categoryName: string;
  status: string;
}

export interface DashboardSummary {
  kpis: DashboardKpis;
  categories: CategoryDistribution[];
  recentMovements: RecentMovementSummary[];
  criticalProducts: CriticalStockItem[];
}
