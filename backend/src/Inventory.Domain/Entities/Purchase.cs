using Inventory.Domain.Common;
using Inventory.Domain.Enums;

namespace Inventory.Domain.Entities;

public class Purchase : BaseEntity
{
    public string PurchaseNumber { get; private set; } = null!;
    public int SupplierId { get; private set; }
    public Supplier Supplier { get; private set; } = null!;

    public int UserId { get; private set; }
    public User User { get; private set; } = null!;

    public DateTimeOffset PurchaseDate { get; private set; }
    public PurchaseStatus Status { get; private set; }

    public decimal Subtotal { get; private set; }
    public decimal Tax { get; private set; }
    public decimal Total { get; private set; }
    public string? Notes { get; private set; }
    public int? WarehouseId { get; private set; }

    private readonly List<PurchaseItem> _items = new();
    public IReadOnlyCollection<PurchaseItem> Items => _items.AsReadOnly();

    protected Purchase() { } // Requerido por EF Core

    public Purchase(
        string purchaseNumber,
        int supplierId,
        int userId,
        DateTimeOffset purchaseDate,
        string? notes = null,
        PurchaseStatus initialStatus = PurchaseStatus.Pending,
        int? warehouseId = null)
    {
        if (string.IsNullOrWhiteSpace(purchaseNumber))
        {
            throw new ArgumentException("El número de compra/orden es obligatorio.", nameof(purchaseNumber));
        }

        if (supplierId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(supplierId), "Debe asociar un proveedor válido.");
        }

        if (userId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(userId), "Debe asociar un usuario responsable.");
        }

        PurchaseNumber = purchaseNumber.Trim().ToUpperInvariant();
        SupplierId = supplierId;
        UserId = userId;
        PurchaseDate = purchaseDate;
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

    public void AddItem(PurchaseItem item)
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

    public void MarkAsReceived()
    {
        if (Status == PurchaseStatus.Received)
        {
            throw new InvalidOperationException("La compra ya se encuentra registrada como Recibida.");
        }

        if (Status == PurchaseStatus.Cancelled)
        {
            throw new InvalidOperationException("No se puede recibir una orden de compra que fue Cancelada previamente.");
        }

        Status = PurchaseStatus.Received;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Cancel()
    {
        if (Status == PurchaseStatus.Cancelled)
        {
            throw new InvalidOperationException("La compra ya se encuentra cancelada.");
        }

        Status = PurchaseStatus.Cancelled;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
