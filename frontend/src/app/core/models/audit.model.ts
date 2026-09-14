export interface AuditLog {
  id: number;
  entityName: string;
  entityId?: string;
  action: string;
  details: string;
  userId?: number;
  userName: string;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditSummary {
  totalLogs: number;
  todayCount: number;
  topActions: Record<string, number>;
  topEntities: Record<string, number>;
}

export interface AuditLogFilterParams {
  entityName?: string;
  action?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}
