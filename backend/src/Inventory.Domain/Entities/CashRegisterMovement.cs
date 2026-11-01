using Inventory.Domain.Common;
using Inventory.Domain.Enums;

namespace Inventory.Domain.Entities;

public class CashRegisterMovement : BaseEntity
{
    public int CashRegisterSessionId { get; private set; }
    public CashRegisterSession CashRegisterSession { get; private set; } = null!;

    public string MovementNumber { get; private set; } = null!;
    public CashMovementType MovementType { get; private set; }
    public CashMovementCategory Category { get; private set; }
    public PaymentMethod PaymentMethod { get; private set; }
    public decimal Amount { get; private set; }
    public string Concept { get; private set; } = null!;
    public string? Notes { get; private set; }
    public DateTimeOffset MovementDate { get; private set; }
    public int UserId { get; private set; }
    public User User { get; private set; } = null!;

    public int? SaleId { get; private set; }
    public Sale? Sale { get; private set; }

    public bool IsCashEffect { get; private set; }

    protected CashRegisterMovement() { } // Requerido por EF Core

    public CashRegisterMovement(
        int cashRegisterSessionId,
        string movementNumber,
        CashMovementType movementType,
        PaymentMethod paymentMethod,
        decimal amount,
        string concept,
        int userId,
        string? notes = null,
        int? saleId = null,
        DateTimeOffset? movementDate = null,
        bool? isCashEffect = null)
    {
        if (cashRegisterSessionId < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(cashRegisterSessionId), "La sesión de caja asociada no es válida.");
        }

        if (string.IsNullOrWhiteSpace(movementNumber))
        {
            throw new ArgumentException("El número de movimiento es obligatorio.", nameof(movementNumber));
        }

        if (amount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(amount), "El valor del movimiento debe ser estrictamente mayor a cero.");
        }

        if (string.IsNullOrWhiteSpace(concept))
        {
            throw new ArgumentException("El concepto o descripción del movimiento es obligatorio.", nameof(concept));
        }

        if (userId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(userId), "El usuario responsable del movimiento es obligatorio.");
        }

        CashRegisterSessionId = cashRegisterSessionId;
        MovementNumber = movementNumber.Trim().ToUpperInvariant();
        MovementType = movementType;
        PaymentMethod = paymentMethod;
        Amount = decimal.Round(amount, 2, MidpointRounding.AwayFromZero);
        Concept = concept.Trim();
        UserId = userId;
        Notes = notes?.Trim();
        SaleId = saleId;
        MovementDate = movementDate ?? DateTimeOffset.UtcNow;
        CreatedAt = DateTimeOffset.UtcNow;

        Category = movementType switch
        {
            CashMovementType.SaleInflow => CashMovementCategory.Inflow,
            CashMovementType.ManualInflow => CashMovementCategory.Inflow,
            CashMovementType.ManualOutflow => CashMovementCategory.Outflow,
            CashMovementType.CashWithdrawal => CashMovementCategory.Outflow,
            CashMovementType.SaleReturnOutflow => CashMovementCategory.Outflow,
            _ => CashMovementCategory.Inflow
        };

        IsCashEffect = isCashEffect ?? (paymentMethod == PaymentMethod.Cash);
    }

    public void AssignSession(int sessionId)
    {
        if (sessionId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(sessionId), "El ID de la sesión de caja debe ser mayor a cero.");
        }
        CashRegisterSessionId = sessionId;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
