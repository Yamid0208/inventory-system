using Inventory.Domain.Common;
using Inventory.Domain.Enums;

namespace Inventory.Domain.Entities;

public class Sale : BaseEntity
{
    public string SaleNumber { get; private set; } = null!;
    public string CustomerName { get; private set; } = null!;
    public string? CustomerTaxId { get; private set; }
    public string? CustomerEmail { get; private set; }

    public int UserId { get; private set; }
    public User User { get; private set; } = null!;

    public DateTimeOffset SaleDate { get; private set; }
    public SaleStatus Status { get; private set; }
    public PaymentMethod PaymentMethod { get; private set; }
    public InvoiceType InvoiceType { get; private set; }

    public decimal Subtotal { get; private set; }
    public decimal Tax { get; private set; }
    public decimal Total { get; private set; }
    public string? Notes { get; private set; }
    public int? WarehouseId { get; private set; }

    private readonly List<SaleItem> _items = new();
    public IReadOnlyCollection<SaleItem> Items => _items.AsReadOnly();

    protected Sale() { } // Requerido por EF Core

    public Sale(
        string saleNumber,
        string customerName,
        int userId,
        DateTimeOffset saleDate,
        PaymentMethod paymentMethod,
        InvoiceType invoiceType = InvoiceType.Traditional,
        string? customerTaxId = null,
        string? customerEmail = null,
        string? notes = null,
        SaleStatus initialStatus = SaleStatus.Completed,
        int? warehouseId = null)
    {
        if (string.IsNullOrWhiteSpace(saleNumber))
        {
            throw new ArgumentException("El número de comprobante/venta es obligatorio.", nameof(saleNumber));
        }

        if (string.IsNullOrWhiteSpace(customerName))
        {
            throw new ArgumentException("El nombre del cliente o razón social es obligatorio.", nameof(customerName));
        }

        if (userId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(userId), "Debe asociar un usuario responsable de la venta.");
        }

        SaleNumber = saleNumber.Trim().ToUpperInvariant();
        CustomerName = customerName.Trim();
        CustomerTaxId = customerTaxId?.Trim().ToUpperInvariant();
        CustomerEmail = customerEmail?.Trim().ToLowerInvariant();
        UserId = userId;
        SaleDate = saleDate;
        PaymentMethod = paymentMethod;
        InvoiceType = invoiceType;
        Status = initialStatus;
        Notes = notes?.Trim();
        Subtotal = 0m;
        Tax = 0m;
        Total = 0m;
        WarehouseId = warehouseId;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public void AssignWarehouse(int? warehouseId)
    {
        WarehouseId = warehouseId;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void AddItem(SaleItem item)
    {
        ArgumentNullException.ThrowIfNull(item);
        _items.Add(item);
        RecalculateTotals();
    }

    public void RecalculateTotals()
    {
        Subtotal = decimal.Round(_items.Sum(i => i.Subtotal), 2, MidpointRounding.AwayFromZero);
        Tax = decimal.Round(_items.Sum(i => i.Tax), 2, MidpointRounding.AwayFromZero);
        Total = decimal.Round(_items.Sum(i => i.Total), 2, MidpointRounding.AwayFromZero);
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Complete()
    {
        if (Status == SaleStatus.Completed)
        {
            throw new InvalidOperationException("La venta ya se encuentra completada.");
        }

        if (Status == SaleStatus.Cancelled)
        {
            throw new InvalidOperationException("No se puede completar una venta previamente cancelada.");
        }

        Status = SaleStatus.Completed;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Cancel()
    {
        if (Status == SaleStatus.Cancelled)
        {
            throw new InvalidOperationException("La venta ya se encuentra cancelada.");
        }

        Status = SaleStatus.Cancelled;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
