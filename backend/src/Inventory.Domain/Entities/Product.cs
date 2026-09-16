using Inventory.Domain.Common;

namespace Inventory.Domain.Entities;

public class Product : BaseEntity
{
    public string Sku { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public string? Description { get; private set; }

    public int CategoryId { get; private set; }
    public Category Category { get; private set; } = null!;

    public int SupplierId { get; private set; }
    public Supplier Supplier { get; private set; } = null!;

    public decimal PurchasePrice { get; private set; }
    public decimal SalePrice { get; private set; }
    public int CurrentStock { get; private set; }
    public int MinimumStock { get; private set; }
    public string? ImageUrl { get; private set; }
    public bool IsActive { get; private set; } = true;
    public int? WarehouseId { get; private set; }

    // Token de concurrencia optimista
    public byte[] RowVersion { get; private set; } = Array.Empty<byte>();

    public void UpdateRowVersion()
    {
        RowVersion = Array.Empty<byte>();
    }

    protected Product() { } // Requerido por EF Core

    public Product(
        string sku,
        string name,
        int categoryId,
        int supplierId,
        decimal purchasePrice,
        decimal salePrice,
        int minimumStock = 5,
        string? description = null,
        string? imageUrl = null,
        int? warehouseId = null)
    {
        if (string.IsNullOrWhiteSpace(sku))
        {
            throw new ArgumentException("El código SKU es obligatorio.", nameof(sku));
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("El nombre del producto es obligatorio.", nameof(name));
        }

        if (purchasePrice < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(purchasePrice), "El precio de compra no puede ser negativo.");
        }

        if (salePrice < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(salePrice), "El precio de venta no puede ser negativo.");
        }

        if (minimumStock < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(minimumStock), "El stock mínimo no puede ser negativo.");
        }

        Sku = sku.Trim().ToUpperInvariant();
        Name = name.Trim();
        CategoryId = categoryId;
        SupplierId = supplierId;
        PurchasePrice = decimal.Round(purchasePrice, 2, MidpointRounding.AwayFromZero);
        SalePrice = decimal.Round(salePrice, 2, MidpointRounding.AwayFromZero);
        MinimumStock = minimumStock;
        CurrentStock = 0; // Inicializado en 0 hasta compras o ajustes formales
        Description = description?.Trim();
        ImageUrl = imageUrl?.Trim();
        WarehouseId = warehouseId;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public void AssignWarehouse(int? warehouseId)
    {
        WarehouseId = warehouseId;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Update(
        string name,
        int categoryId,
        int supplierId,
        decimal purchasePrice,
        decimal salePrice,
        int minimumStock,
        string? description,
        string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("El nombre del producto es obligatorio.", nameof(name));
        }

        if (purchasePrice < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(purchasePrice), "El precio de compra no puede ser negativo.");
        }

        if (salePrice < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(salePrice), "El precio de venta no puede ser negativo.");
        }

        if (minimumStock < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(minimumStock), "El stock mínimo no puede ser negativo.");
        }

        Name = name.Trim();
        CategoryId = categoryId;
        SupplierId = supplierId;
        PurchasePrice = decimal.Round(purchasePrice, 2, MidpointRounding.AwayFromZero);
        SalePrice = decimal.Round(salePrice, 2, MidpointRounding.AwayFromZero);
        MinimumStock = minimumStock;
        Description = description?.Trim();
        ImageUrl = imageUrl?.Trim();
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void UpdateStock(int quantityDelta)
    {
        var newStock = CurrentStock + quantityDelta;
        if (newStock < 0)
        {
            throw new InvalidOperationException($"Stock insuficiente para el producto '{Name}' (SKU: {Sku}). Stock actual: {CurrentStock}, cambio solicitado: {quantityDelta}.");
        }

        CurrentStock = newStock;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public bool IsLowStock() => CurrentStock <= MinimumStock;

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
