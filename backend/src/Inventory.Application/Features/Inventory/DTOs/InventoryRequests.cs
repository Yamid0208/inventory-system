namespace Inventory.Application.Features.Inventory.DTOs;

public record KardexFilterRequest(
    int? ProductId = null,
    string? MovementType = null,
    DateTimeOffset? StartDate = null,
    DateTimeOffset? EndDate = null,
    string? Search = null,
    int PageNumber = 1,
    int PageSize = 15,
    int? WarehouseId = null,
    IReadOnlyList<int>? AllowedWarehouseIds = null
);

public record CreateStockAdjustmentRequest(
    int ProductId,
    string AdjustmentType, // "AdjustmentIn" | "AdjustmentOut"
    int Quantity,
    string Reason,
    string? Notes = null,
    int? WarehouseId = null
);

public record ProcessReturnRequest(
    int ProductId,
    string ReturnType, // "CustomerReturn" | "SupplierReturn"
    int Quantity,
    string Reason,
    string? ReferenceDocument = null,
    string? Notes = null,
    int? WarehouseId = null
);
