namespace Inventory.Application.Features.Purchases.DTOs;

public record PurchaseFilterRequest(
    int? SupplierId = null,
    string? Status = null,
    DateTimeOffset? StartDate = null,
    DateTimeOffset? EndDate = null,
    string? Search = null,
    int PageNumber = 1,
    int PageSize = 10,
    int? UserId = null,
    bool? OnlyMine = null,
    int? WarehouseId = null,
    IReadOnlyList<int>? AllowedWarehouseIds = null
);

public record CreatePurchaseItemRequest(
    int ProductId,
    int Quantity,
    decimal UnitPrice,
    decimal TaxRate = 0.19m
);

public record CreatePurchaseRequest(
    int SupplierId,
    DateTimeOffset PurchaseDate,
    string? Notes,
    List<CreatePurchaseItemRequest> Items,
    bool AutoReceive = true,
    int? WarehouseId = null
);

public record ReturnPurchaseItemRequest(
    int ProductId,
    int Quantity
);

public record ReturnPurchaseRequest(
    string Reason,
    List<ReturnPurchaseItemRequest> Items,
    string? Notes = null
);

