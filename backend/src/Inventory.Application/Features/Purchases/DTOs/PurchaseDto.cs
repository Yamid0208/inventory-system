namespace Inventory.Application.Features.Purchases.DTOs;

public record PurchaseItemDto(
    int Id,
    int ProductId,
    string ProductSku,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal Subtotal,
    decimal Tax,
    decimal Total
);

public record PurchaseDto(
    int Id,
    string PurchaseNumber,
    int SupplierId,
    string SupplierName,
    int UserId,
    string UserName,
    DateTimeOffset PurchaseDate,
    string Status,
    decimal Subtotal,
    decimal Tax,
    decimal Total,
    string? Notes,
    IReadOnlyCollection<PurchaseItemDto> Items,
    int? WarehouseId = null
);
