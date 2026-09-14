namespace Inventory.Application.Features.Inventory.DTOs;

public record InventoryMovementDto(
    int Id,
    string MovementNumber,
    int ProductId,
    string ProductSku,
    string ProductName,
    string MovementType,
    int QuantityDelta,
    int PreviousStock,
    int NewStock,
    decimal UnitPrice,
    string? Reference,
    string? Notes,
    int UserId,
    string UserName,
    DateTimeOffset CreatedAt,
    int? WarehouseId = null
);
