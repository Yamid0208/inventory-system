namespace Inventory.Domain.Enums;

public enum CashMovementType : byte
{
    SaleInflow = 1,
    ManualInflow = 2,
    ManualOutflow = 3,
    CashWithdrawal = 4,
    SaleReturnOutflow = 5
}

