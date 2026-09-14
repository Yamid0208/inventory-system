namespace Inventory.Application.Features.Alerts.DTOs;

public record StockAlertDto(
    int ProductId,
    string Sku,
    string Name,
    int CurrentStock,
    int MinimumStock,
    int Deficit,
    int SuggestedQuantity,
    decimal UnitPurchasePrice,
    decimal EstimatedTotalCost,
    string Severity,
    string CategoryName,
    int SupplierId,
    string SupplierName,
    string? SupplierEmail
);

public record StockAlertSummaryDto(
    int TotalAlerts,
    int CriticalCount,
    int WarningCount,
    decimal EstimatedTotalReplenishmentCost
);

public record StockAlertFilterRequest(
    string? Severity = null,
    int? CategoryId = null,
    int? SupplierId = null,
    string? Search = null,
    int? WarehouseId = null
);
