namespace Inventory.Application.Features.Reports.DTOs;

public record ReportMetadataDto(
    string Key,
    string Title,
    string Description,
    string Icon,
    int RecordCount,
    DateTimeOffset LastUpdated
);

public record ReportsCatalogSummaryDto(
    IReadOnlyList<ReportMetadataDto> Reports,
    int TotalExportableRecords
);

public record PagedReportResultDto<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages,
    decimal? TotalAmount = null,
    int? TotalQuantity = null
);

public record ProductReportItemDto(
    int Id,
    string Sku,
    string Name,
    string CategoryName,
    string SupplierName,
    decimal PurchasePrice,
    decimal SalePrice,
    int CurrentStock,
    int MinimumStock,
    decimal Valuation,
    string Status,
    bool IsActive,
    DateTimeOffset CreatedAt
);

public record InventoryKardexReportItemDto(
    int Id,
    string MovementNumber,
    DateTimeOffset CreatedAt,
    string Type,
    int ProductId,
    string ProductSku,
    string ProductName,
    int QuantityDelta,
    int PreviousStock,
    int NewStock,
    decimal UnitPrice,
    string OperatorName,
    string? Reference,
    string? Notes
);

public record SalesReportItemDto(
    int Id,
    string SaleNumber,
    DateTimeOffset SaleDate,
    DateTimeOffset CreatedAt,
    string CustomerName,
    string? CustomerTaxId,
    string PaymentMethod,
    string Status,
    decimal Subtotal,
    decimal Tax,
    decimal Total,
    int ItemsCount
);

public record PurchasesReportItemDto(
    int Id,
    string PurchaseNumber,
    DateTimeOffset PurchaseDate,
    DateTimeOffset CreatedAt,
    string SupplierName,
    string Status,
    decimal Subtotal,
    decimal Tax,
    decimal Total,
    int ItemsCount
);

public record LowStockReportItemDto(
    int Id,
    string Sku,
    string Name,
    string CategoryName,
    string SupplierName,
    int CurrentStock,
    int MinimumStock,
    int Deficit,
    decimal PurchasePrice,
    decimal EstimatedRestockCost,
    string Status
);

// DTOs para INSINCRO: Ventas Avanzadas & Métodos de Pago
public record PaymentMethodBreakdownDto(
    string Method,
    decimal TotalAmount,
    int TransactionCount,
    decimal Percentage
);

public record SalesSummaryMetricsDto(
    decimal TotalSalesAmount,
    int TotalTransactions,
    decimal AverageTicket,
    decimal TotalSubtotal,
    decimal TotalTax,
    IReadOnlyList<PaymentMethodBreakdownDto> PaymentMethods
);

public record TopProductReportDto(
    int ProductId,
    string Sku,
    string ProductName,
    string CategoryName,
    int UnitsSold,
    decimal TotalRevenue,
    decimal AverageUnitPrice
);

// DTOs para INSINCRO: Finanzas & Rentabilidad (Utilidad Bruta con CMV histórico)
public record ProductProfitabilityItemDto(
    int ProductId,
    string Sku,
    string ProductName,
    string CategoryName,
    int UnitsSold,
    decimal TotalRevenue,
    decimal CostOfGoodsSold,
    decimal GrossProfit,
    decimal GrossMarginPercentage
);

public record ProfitabilitySummaryDto(
    decimal TotalRevenue,
    decimal TotalCostOfGoodsSold,
    decimal GrossProfit,
    decimal GrossMarginPercentage,
    int TotalItemsSold,
    PagedReportResultDto<ProductProfitabilityItemDto> ProductDetails
);

// DTOs para INSINCRO: Caja POS & Conciliación
public record CashRegisterSessionReportItemDto(
    int SessionId,
    string SessionNumber,
    string CashierName,
    DateTimeOffset OpenedAt,
    DateTimeOffset? ClosedAt,
    string Status,
    decimal InitialCash,
    decimal TotalSales,
    decimal TotalCashInflow,
    decimal TotalCashOutflow,
    decimal TotalElectronicInflow,
    decimal ExpectedCash,
    decimal? ActualCash,
    decimal? Difference,
    string? DifferenceStatus
);

public record CashRegisterReconciliationSummaryDto(
    decimal TotalOpeningBalance,
    decimal TotalExpectedCash,
    decimal TotalActualCash,
    decimal TotalDifference,
    decimal TotalElectronicInflow,
    int TotalSessionsCount,
    PagedReportResultDto<CashRegisterSessionReportItemDto> Sessions
);

// DTOs para INSINCRO: Actividad & Auditoría
public record AuditActivityReportItemDto(
    int Id,
    DateTimeOffset CreatedAt,
    string EntityName,
    string Action,
    string Details,
    string UserName,
    string? IpAddress
);

// DTOs para INSINCRO: Suite de Análisis Empresarial e Inteligencia Comercial
public record SalesAnalyticsSummaryDto(
    decimal TotalRevenue,
    decimal NetRevenue,
    decimal Tax,
    int TransactionCount,
    decimal AverageTicket,
    int UnitsSold,
    decimal PrevTotalRevenue,
    int PrevTransactionCount,
    decimal PrevAverageTicket,
    decimal RevenueGrowthPct,
    decimal TransactionsGrowthPct,
    decimal TicketGrowthPct,
    IReadOnlyList<PaymentMethodBreakdownDto> PaymentMethods
);

public record SalesByCategoryDto(
    int CategoryId,
    string CategoryName,
    int UnitsSold,
    decimal TotalRevenue,
    decimal SharePercentage,
    int TransactionCount
);

public record HourlyActivityDto(
    int Hour,
    string HourLabel,
    int TransactionCount,
    decimal TotalRevenue,
    bool IsPeakHour
);

public record SalesByEmployeeDto(
    int UserId,
    string EmployeeName,
    string Role,
    int TransactionCount,
    decimal TotalRevenue,
    decimal AverageTicket,
    decimal SharePercentage
);

public record SalesTrendDto(
    string Date,
    string Label,
    int TransactionCount,
    decimal TotalRevenue
);

// =========================================================================
// DTOs para INSINCRO: Suite de Valoración Financiera y Patrimonial de Inventario
// =========================================================================

public record InventoryValuationSummaryDto(
    decimal TotalCostValuation,
    decimal TotalRetailValuation,
    decimal PotentialProfit,
    decimal ProfitMarginPercentage,
    int TotalStockUnits,
    int TotalProductsCount,
    decimal StagnantCapitalAmount,
    int StagnantProductsCount,
    int CategoryACount,
    decimal CategoryACostAmount,
    decimal CategoryASharePct,
    int CategoryBCount,
    decimal CategoryBCostAmount,
    decimal CategoryBSharePct,
    int CategoryCCount,
    decimal CategoryCCostAmount,
    decimal CategoryCSharePct
);

public record InventoryValuationByCategoryDto(
    int CategoryId,
    string CategoryName,
    int TotalUnits,
    decimal TotalCostValuation,
    decimal TotalRetailValuation,
    decimal PotentialProfit,
    decimal ProfitMarginPercentage,
    decimal CapitalSharePercentage,
    int ProductCount
);

public record InventoryValuationItemDto(
    int ProductId,
    string Sku,
    string ProductName,
    int CategoryId,
    string CategoryName,
    string SupplierName,
    int CurrentStock,
    int MinimumStock,
    decimal UnitCost,
    decimal UnitPrice,
    decimal TotalCostValuation,
    decimal TotalRetailValuation,
    decimal PotentialProfit,
    decimal ProfitMarginPercentage,
    string AbcClassification,
    int DaysWithoutSales,
    bool IsStagnant,
    DateTimeOffset? LastSaleDate
);


