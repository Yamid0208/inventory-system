namespace Inventory.Domain.Enums;

public enum MovementType : byte
{
    Purchase = 1,
    Sale = 2,
    AdjustmentIn = 3,
    AdjustmentOut = 4,
    Return = 5
}
