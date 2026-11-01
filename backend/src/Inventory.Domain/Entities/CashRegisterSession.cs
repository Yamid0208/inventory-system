using Inventory.Domain.Common;
using Inventory.Domain.Enums;

namespace Inventory.Domain.Entities;

public class CashRegisterSession : BaseEntity
{
    public string SessionNumber { get; private set; } = null!;
    public int UserId { get; private set; }
    public User User { get; private set; } = null!;
    public int? WarehouseId { get; private set; }
    public Warehouse? Warehouse { get; private set; }

    public DateTimeOffset OpenedAt { get; private set; }
    public DateTimeOffset? ClosedAt { get; private set; }
    public CashRegisterStatus Status { get; private set; }

    public decimal InitialCash { get; private set; }
    public string? OpeningNotes { get; private set; }
    public string? ClosingNotes { get; private set; }

    // Instantánea histórica sellada al cierre
    public decimal ExpectedCash { get; private set; }
    public decimal? ActualCash { get; private set; }
    public decimal? CashDifference { get; private set; }
    public CashDifferenceStatus? DifferenceStatus { get; private set; }

    public decimal TotalCashInflow { get; private set; }
    public decimal TotalCashOutflow { get; private set; }
    public decimal TotalTransferInflow { get; private set; }
    public decimal TotalCardInflow { get; private set; }
    public decimal TotalOtherInflow { get; private set; }
    public decimal TotalSales { get; private set; }

    private readonly List<CashRegisterMovement> _movements = new();
    public IReadOnlyCollection<CashRegisterMovement> Movements => _movements.AsReadOnly();

    protected CashRegisterSession() { } // Requerido por EF Core

    public CashRegisterSession(
        string sessionNumber,
        int userId,
        decimal initialCash,
        int? warehouseId = null,
        string? openingNotes = null,
        DateTimeOffset? openedAt = null)
    {
        if (string.IsNullOrWhiteSpace(sessionNumber))
        {
            throw new ArgumentException("El número de sesión de caja es obligatorio.", nameof(sessionNumber));
        }

        if (userId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(userId), "Debe asociar un usuario responsable a la caja.");
        }

        if (initialCash < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(initialCash), "El saldo inicial de efectivo no puede ser negativo.");
        }

        SessionNumber = sessionNumber.Trim().ToUpperInvariant();
        UserId = userId;
        InitialCash = decimal.Round(initialCash, 2, MidpointRounding.AwayFromZero);
        WarehouseId = warehouseId;
        OpeningNotes = openingNotes?.Trim();
        OpenedAt = openedAt ?? DateTimeOffset.UtcNow;
        Status = CashRegisterStatus.Open;

        ExpectedCash = InitialCash;
        TotalCashInflow = 0m;
        TotalCashOutflow = 0m;
        TotalTransferInflow = 0m;
        TotalCardInflow = 0m;
        TotalOtherInflow = 0m;
        TotalSales = 0m;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public void AddMovement(CashRegisterMovement movement)
    {
        ArgumentNullException.ThrowIfNull(movement);

        if (Status == CashRegisterStatus.Closed)
        {
            throw new InvalidOperationException("No se pueden registrar movimientos en una caja cerrada.");
        }

        _movements.Add(movement);
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Close(decimal actualCash, string? closingNotes, DateTimeOffset? closedAt = null)
    {
        if (Status == CashRegisterStatus.Closed)
        {
            throw new InvalidOperationException("La caja ya se encuentra cerrada.");
        }

        if (actualCash < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(actualCash), "El efectivo contado no puede ser negativo.");
        }

        var cashInflows = decimal.Round(_movements
            .Where(m => m.Category == CashMovementCategory.Inflow && m.IsCashEffect)
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        var cashOutflows = decimal.Round(_movements
            .Where(m => m.Category == CashMovementCategory.Outflow && m.IsCashEffect)
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        TotalCashInflow = cashInflows;
        TotalCashOutflow = cashOutflows;
        ExpectedCash = decimal.Round(InitialCash + cashInflows - cashOutflows, 2, MidpointRounding.AwayFromZero);

        ActualCash = decimal.Round(actualCash, 2, MidpointRounding.AwayFromZero);
        CashDifference = decimal.Round(ActualCash.Value - ExpectedCash, 2, MidpointRounding.AwayFromZero);

        if (CashDifference == 0m)
        {
            DifferenceStatus = CashDifferenceStatus.Balanced;
        }
        else if (CashDifference > 0m)
        {
            DifferenceStatus = CashDifferenceStatus.Surplus;
        }
        else
        {
            DifferenceStatus = CashDifferenceStatus.Shortage;
        }

        TotalTransferInflow = decimal.Round(_movements
            .Where(m => m.Category == CashMovementCategory.Inflow &&
                       (m.PaymentMethod == PaymentMethod.Transfer ||
                        m.PaymentMethod == PaymentMethod.Nequi ||
                        m.PaymentMethod == PaymentMethod.Daviplata))
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        TotalCardInflow = decimal.Round(_movements
            .Where(m => m.Category == CashMovementCategory.Inflow &&
                       (m.PaymentMethod == PaymentMethod.CreditCard ||
                        m.PaymentMethod == PaymentMethod.DebitCard))
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        TotalOtherInflow = decimal.Round(_movements
            .Where(m => m.Category == CashMovementCategory.Inflow &&
                        !m.IsCashEffect &&
                        m.PaymentMethod != PaymentMethod.Transfer &&
                        m.PaymentMethod != PaymentMethod.Nequi &&
                        m.PaymentMethod != PaymentMethod.Daviplata &&
                        m.PaymentMethod != PaymentMethod.CreditCard &&
                        m.PaymentMethod != PaymentMethod.DebitCard)
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        TotalSales = decimal.Round(_movements
            .Where(m => m.MovementType == CashMovementType.SaleInflow)
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        Status = CashRegisterStatus.Closed;
        ClosedAt = closedAt ?? DateTimeOffset.UtcNow;
        ClosingNotes = closingNotes?.Trim();
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}

