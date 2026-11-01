export type CashRegisterStatus = 'Open' | 'Closed';
export type CashMovementType = 'SaleInflow' | 'ManualInflow' | 'ManualOutflow' | 'CashWithdrawal' | 'SaleReturnOutflow';
export type CashMovementCategory = 'Inflow' | 'Outflow';
export type CashDifferenceStatus = 'Balanced' | 'Surplus' | 'Shortage';

export interface CashRegisterMovement {
  id: number;
  cashRegisterSessionId: number;
  movementNumber: string;
  movementType: CashMovementType | string;
  category: CashMovementCategory | string;
  paymentMethod: string;
  amount: number;
  concept: string;
  notes?: string;
  movementDate: string;
  userId: number;
  userName: string;
  saleId?: number;
  saleNumber?: string;
  isCashEffect: boolean;
}

export interface CashRegisterSession {
  id: number;
  sessionNumber: string;
  userId: number;
  userName: string;
  warehouseId?: number;
  warehouseName?: string;
  openedAt: string;
  closedAt?: string;
  status: CashRegisterStatus;
  initialCash: number;
  openingNotes?: string;
  closingNotes?: string;
  expectedCash: number;
  actualCash?: number;
  cashDifference?: number;
  differenceStatus?: CashDifferenceStatus | string;
  totalCashInflow: number;
  totalCashOutflow: number;
  totalTransferInflow: number;
  totalCardInflow: number;
  totalOtherInflow: number;
  totalSales: number;
  movementCount: number;
}

export interface CashRegisterAuditSummary {
  sessionId: number;
  sessionNumber: string;
  userId: number;
  userName: string;
  warehouseId?: number;
  warehouseName?: string;
  openedAt: string;
  status: string;
  initialCash: number;
  totalCashSales: number;
  totalCashInflows: number;
  totalCashOutflows: number;
  totalCashWithdrawals: number;
  expectedCash: number;
  totalTransferSales: number;
  totalCardSales: number;
  totalOtherSales: number;
  totalSales: number;
  movementCount: number;
}

export interface CashRegisterDashboard {
  hasActiveSession: boolean;
  activeSession: CashRegisterSession | null;
  todayTotalSales: number;
  todayCashInflow: number;
  todayTransferInflow: number;
  todayCardInflow: number;
  todayTotalOutflow: number;
  todayExpectedCash: number;
  todayMovementCount: number;
}

export interface OpenCashRegisterRequest {
  initialCash: number;
  notes?: string;
  warehouseId?: number;
}

export interface CreateCashMovementRequest {
  movementType: 'ManualInflow' | 'ManualOutflow' | 'CashWithdrawal' | string;
  amount: number;
  paymentMethod: string;
  concept: string;
  notes?: string;
}

export interface CloseCashRegisterRequest {
  actualCash: number;
  notes?: string;
}

export interface CashRegisterFilterRequest {
  pageNumber?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  userId?: number;
  status?: string;
  warehouseId?: number;
}

