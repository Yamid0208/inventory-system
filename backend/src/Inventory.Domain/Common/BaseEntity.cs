namespace Inventory.Domain.Common;

public abstract class BaseEntity<TId>
{
    public TId Id { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTimeOffset? DeletedAt { get; set; }
}

public abstract class BaseEntity : BaseEntity<int>
{
}
