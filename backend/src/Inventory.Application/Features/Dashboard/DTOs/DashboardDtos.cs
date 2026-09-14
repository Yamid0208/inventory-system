namespace Inventory.Application.Features.Dashboard.DTOs;

public record DashboardKpisDto(
    decimal TotalInventoryValuation,
    int TotalStockUnits,
    int TotalProductsCount,
    int LowStockProductsCount,
    int OutOfStockProductsCount,
    decimal TotalSalesAmount,
    int CompletedSalesCount,
    decimal TotalPurchasesAmount,
    int PendingPurchasesCount
);

public record CategoryDistributionDto(
    int CategoryId,
    string CategoryName,
    int ProductCount,
    int TotalStock,
    decimal TotalValuation,
    double Percentage
);

public record RecentMovementSummaryDto(
    string MovementNumber,
    string ProductSku,
    string ProductName,
    string MovementType,
    int QuantityDelta,
    string UserName,
    DateTimeOffset CreatedAt
);

public record CriticalStockItemDto(
    int ProductId,
    string Sku,
    string Name,
    int CurrentStock,
    int MinStock,
    string CategoryName,
    string Status
);

public record DashboardSummaryDto(
    DashboardKpisDto Kpis,
    List<CategoryDistributionDto> Categories,
    List<RecentMovementSummaryDto> RecentMovements,
    List<CriticalStockItemDto> CriticalProducts
);
