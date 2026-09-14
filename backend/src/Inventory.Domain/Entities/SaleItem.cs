using Inventory.Domain.Common;

namespace Inventory.Domain.Entities;

public class SaleItem : BaseEntity
{
    public int SaleId { get; private set; }
    public Sale Sale { get; private set; } = null!;

    public int ProductId { get; private set; }
    public Product Product { get; private set; } = null!;

    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal Subtotal { get; private set; }
    public decimal Tax { get; private set; }
    public decimal Total { get; private set; }

    protected SaleItem() { } // Requerido por EF Core

    public SaleItem(int productId, int quantity, decimal unitPrice, decimal taxRate = 0.19m)
    {
        if (quantity <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(quantity), "La cantidad de venta debe ser mayor a cero.");
        }

        if (unitPrice < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(unitPrice), "El precio unitario de venta no puede ser negativo.");
        }

        if (taxRate < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(taxRate), "La tasa de impuesto no puede ser negativa.");
        }

        ProductId = productId;
        Quantity = quantity;
        UnitPrice = decimal.Round(unitPrice, 2, MidpointRounding.AwayFromZero);
        Subtotal = decimal.Round(Quantity * UnitPrice, 2, MidpointRounding.AwayFromZero);
        Tax = decimal.Round(Subtotal * taxRate, 2, MidpointRounding.AwayFromZero);
        Total = Subtotal + Tax;
        CreatedAt = DateTimeOffset.UtcNow;
    }
}
