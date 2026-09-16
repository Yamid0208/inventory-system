using Inventory.Domain.Common;
using Inventory.Domain.Enums;

namespace Inventory.Domain.Entities;

public class SalePayment : BaseEntity
{
    public int SaleId { get; private set; }
    public Sale Sale { get; private set; } = null!;

    public PaymentMethod Method { get; private set; }
    public decimal Amount { get; private set; }
    public string? Reference { get; private set; }

    protected SalePayment() { } // Requerido por EF Core

    public SalePayment(PaymentMethod method, decimal amount, string? reference = null)
    {
        if (amount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(amount), "El monto del pago debe ser mayor a cero.");
        }

        Method = method;
        Amount = amount;
        Reference = reference?.Trim();
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public void AssignSale(int saleId)
    {
        SaleId = saleId;
    }
}
