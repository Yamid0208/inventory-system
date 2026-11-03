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
