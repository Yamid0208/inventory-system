using Inventory.Domain.Entities;
using Inventory.Domain.Enums;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class CashRegisterTests
{
    [Fact]
    public void CashRegisterSession_Creation_SetsInitialPropertiesCorrectly()
    {
        var session = new CashRegisterSession(
            sessionNumber: "CAJA-20261031-0001",
            userId: 5,
            initialCash: 150000m,
            warehouseId: 1,
            openingNotes: "Apertura turno mañana"
        );

        Assert.Equal("CAJA-20261031-0001", session.SessionNumber);
        Assert.Equal(5, session.UserId);
        Assert.Equal(150000m, session.InitialCash);
        Assert.Equal(150000m, session.ExpectedCash);
        Assert.Equal(1, session.WarehouseId);
        Assert.Equal(CashRegisterStatus.Open, session.Status);
        Assert.Equal("Apertura turno mañana", session.OpeningNotes);
        Assert.Null(session.ClosedAt);
        Assert.Null(session.ActualCash);
        Assert.Empty(session.Movements);
    }

    [Fact]
    public void CashRegisterSession_NegativeInitialCash_ThrowsException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new CashRegisterSession("CAJA-001", 1, -500m));
    }

    [Fact]
    public void CashRegisterSession_InvalidSessionNumberOrUser_ThrowsException()
    {
        Assert.Throws<ArgumentException>(() =>
            new CashRegisterSession("", 1, 100m));

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new CashRegisterSession("CAJA-001", 0, 100m));
    }

    [Fact]
    public void CashRegisterSession_AddMovement_OnlyAllowedWhenOpen()
    {
        var session = new CashRegisterSession("CAJA-001", 1, 100000m);
        var movement = new CashRegisterMovement(
            cashRegisterSessionId: session.Id,
            movementNumber: "MOV-001",
            movementType: CashMovementType.SaleInflow,
            paymentMethod: PaymentMethod.Cash,
            amount: 50000m,
            concept: "Venta VEN-001",
            userId: 1
        );

        session.AddMovement(movement);
        Assert.Single(session.Movements);

        // Cerrar la caja
        session.Close(150000m, "Cierre sin diferencias");
        Assert.Equal(CashRegisterStatus.Closed, session.Status);

        // Intentar agregar movimiento a caja cerrada debe arrojar InvalidOperationException
        var movement2 = new CashRegisterMovement(
            cashRegisterSessionId: session.Id,
            movementNumber: "MOV-002",
            movementType: CashMovementType.ManualInflow,
            paymentMethod: PaymentMethod.Cash,
            amount: 10000m,
            concept: "Inyección",
            userId: 1
        );

        Assert.Throws<InvalidOperationException>(() => session.AddMovement(movement2));
    }

    [Fact]
    public void CashRegisterSession_Close_CalculatesExpectedCashAndBalancedDifference()
    {
        var session = new CashRegisterSession("CAJA-001", 1, 200000m);

        // Venta en efectivo: +50,000 (afecta efectivo físico)
        session.AddMovement(new CashRegisterMovement(
            session.Id, "MOV-01", CashMovementType.SaleInflow, PaymentMethod.Cash, 50000m, "Venta Efectivo", 1));

        // Venta por transferencia Nequi: +30,000 (no afecta efectivo físico)
        session.AddMovement(new CashRegisterMovement(
            session.Id, "MOV-02", CashMovementType.SaleInflow, PaymentMethod.Nequi, 30000m, "Venta Nequi", 1));

        // Venta con tarjeta crédito: +40,000 (no afecta efectivo físico)
        session.AddMovement(new CashRegisterMovement(
            session.Id, "MOV-03", CashMovementType.SaleInflow, PaymentMethod.CreditCard, 40000m, "Venta Tarjeta", 1));

        // Gasto menor en efectivo: -15,000 (afecta efectivo físico)
        session.AddMovement(new CashRegisterMovement(
            session.Id, "MOV-04", CashMovementType.ManualOutflow, PaymentMethod.Cash, 15000m, "Insumos aseo", 1));

        // Retiro de efectivo: -20,000 (afecta efectivo físico)
        session.AddMovement(new CashRegisterMovement(
            session.Id, "MOV-05", CashMovementType.CashWithdrawal, PaymentMethod.Cash, 20000m, "Retiro para cambio", 1));

        // Efectivo esperado: 200,000 (inicial) + 50,000 (ingreso efectivo) - 35,000 (egresos efectivo) = 215,000
        // Conteo físico: 215,000 -> CUADRADO
        session.Close(215000m, "Cierre exacto");

        Assert.Equal(CashRegisterStatus.Closed, session.Status);
        Assert.NotNull(session.ClosedAt);
        Assert.Equal(215000m, session.ExpectedCash);
        Assert.Equal(215000m, session.ActualCash);
        Assert.Equal(0m, session.CashDifference);
        Assert.Equal(CashDifferenceStatus.Balanced, session.DifferenceStatus);

        Assert.Equal(50000m, session.TotalCashInflow);
        Assert.Equal(35000m, session.TotalCashOutflow);
        Assert.Equal(30000m, session.TotalTransferInflow);
        Assert.Equal(40000m, session.TotalCardInflow);
        Assert.Equal(120000m, session.TotalSales); // 50,000 + 30,000 + 40,000
    }

    [Fact]
    public void CashRegisterSession_Close_DetectsShortageAndSurplusCorrectly()
    {
        // Caso Faltante
        var sessionShortage = new CashRegisterSession("CAJA-002", 1, 100000m);
        sessionShortage.AddMovement(new CashRegisterMovement(
            sessionShortage.Id, "MOV-01", CashMovementType.SaleInflow, PaymentMethod.Cash, 20000m, "Venta", 1));
        // Esperado: 120,000. Contado: 110,000. Diferencia: -10,000
        sessionShortage.Close(110000m, "Faltaron 10.000 por cambio erróneo");

        Assert.Equal(CashDifferenceStatus.Shortage, sessionShortage.DifferenceStatus);
        Assert.Equal(-10000m, sessionShortage.CashDifference);

        // Caso Sobrante
        var sessionSurplus = new CashRegisterSession("CAJA-003", 1, 100000m);
        sessionSurplus.AddMovement(new CashRegisterMovement(
            sessionSurplus.Id, "MOV-02", CashMovementType.SaleInflow, PaymentMethod.Cash, 20000m, "Venta", 1));
        // Esperado: 120,000. Contado: 125,000. Diferencia: +5,000
        sessionSurplus.Close(125000m, "Sobraron 5.000");

        Assert.Equal(CashDifferenceStatus.Surplus, sessionSurplus.DifferenceStatus);
        Assert.Equal(5000m, sessionSurplus.CashDifference);
    }

    [Fact]
    public void CashRegisterMovement_Validation_RejectsInvalidValues()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new CashRegisterMovement(-1, "MOV-01", CashMovementType.ManualInflow, PaymentMethod.Cash, 100m, "Test", 1));

        Assert.Throws<ArgumentException>(() =>
            new CashRegisterMovement(1, "", CashMovementType.ManualInflow, PaymentMethod.Cash, 100m, "Test", 1));

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new CashRegisterMovement(1, "MOV-01", CashMovementType.ManualInflow, PaymentMethod.Cash, 0m, "Test", 1));

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new CashRegisterMovement(1, "MOV-01", CashMovementType.ManualInflow, PaymentMethod.Cash, -50m, "Test", 1));

        Assert.Throws<ArgumentException>(() =>
            new CashRegisterMovement(1, "MOV-01", CashMovementType.ManualInflow, PaymentMethod.Cash, 100m, " ", 1));

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new CashRegisterMovement(1, "MOV-01", CashMovementType.ManualInflow, PaymentMethod.Cash, 100m, "Test", 0));
    }
}
