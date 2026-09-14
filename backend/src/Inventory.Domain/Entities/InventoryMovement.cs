using Inventory.Domain.Common;
using Inventory.Domain.Enums;

namespace Inventory.Domain.Entities;

public class InventoryMovement : BaseEntity
{
    public string MovementNumber { get; private set; } = null!;
    public int ProductId { get; private set; }
    public Product Product { get; private set; } = null!;

    public MovementType Type { get; private set; }
    public int QuantityDelta { get; private set; }
    public int PreviousStock { get; private set; }
    public int NewStock { get; private set; }
    public decimal UnitPrice { get; private set; }

    public string? Reference { get; private set; }
    public string? Notes { get; private set; }

    public int UserId { get; private set; }
    public User User { get; private set; } = null!;
    public int? WarehouseId { get; private set; }

    protected InventoryMovement() { } // Requerido por EF Core

    public InventoryMovement(
        string movementNumber,
        int productId,
        MovementType type,
        int quantityDelta,
        int previousStock,
        int newStock,
        decimal unitPrice,
        int userId,
        string? reference = null,
        string? notes = null,
        int? warehouseId = null)
    {
        if (string.IsNullOrWhiteSpace(movementNumber))
        {
            throw new ArgumentException("El número de movimiento es obligatorio.", nameof(movementNumber));
        }

        if (quantityDelta == 0)
        {
            throw new ArgumentException("El cambio en stock (delta) no puede ser cero.", nameof(quantityDelta));
        }

        if (previousStock < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(previousStock), "El stock anterior no puede ser negativo.");
        }

        if (newStock < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(newStock), "El nuevo stock resultante no puede ser negativo.");
        }

        if (unitPrice < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(unitPrice), "El precio unitario no puede ser negativo.");
        }

        MovementNumber = movementNumber.Trim().ToUpperInvariant();
        ProductId = productId;
        Type = type;
        QuantityDelta = quantityDelta;
        PreviousStock = previousStock;
        NewStock = newStock;
        UnitPrice = decimal.Round(unitPrice, 2, MidpointRounding.AwayFromZero);
        UserId = userId;
        Reference = reference?.Trim();
        Notes = notes?.Trim();
        WarehouseId = warehouseId;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public void AssignWarehouse(int? warehouseId)
    {
        WarehouseId = warehouseId;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
