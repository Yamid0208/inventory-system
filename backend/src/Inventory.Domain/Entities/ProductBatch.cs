using Inventory.Domain.Common;

namespace Inventory.Domain.Entities;

public class ProductBatch : BaseEntity
{
    public int ProductId { get; private set; }
    public Product Product { get; private set; } = null!;

    public string BatchNumber { get; private set; } = null!;
    public DateTimeOffset? ManufacturingDate { get; private set; }
    public DateTimeOffset ExpirationDate { get; private set; }
    public int InitialQuantity { get; private set; }
    public int CurrentQuantity { get; private set; }
    public bool IsActive { get; private set; } = true;

    protected ProductBatch() { } // Requerido por EF Core

    public ProductBatch(
        int productId,
        string batchNumber,
        DateTimeOffset expirationDate,
        int initialQuantity,
        DateTimeOffset? manufacturingDate = null)
    {
        if (string.IsNullOrWhiteSpace(batchNumber))
        {
            throw new ArgumentException("El código o número de lote es obligatorio.", nameof(batchNumber));
        }

        if (initialQuantity < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(initialQuantity), "La cantidad inicial del lote no puede ser negativa.");
        }

        ProductId = productId;
        BatchNumber = batchNumber.Trim().ToUpperInvariant();
        ExpirationDate = expirationDate;
        InitialQuantity = initialQuantity;
        CurrentQuantity = initialQuantity;
        ManufacturingDate = manufacturingDate;
        IsActive = true;
    }

    public void UpdateQuantity(int delta)
    {
        if (CurrentQuantity + delta < 0)
        {
            throw new InvalidOperationException($"La cantidad resultante del lote no puede ser negativa ({CurrentQuantity + delta}).");
        }

        CurrentQuantity += delta;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
