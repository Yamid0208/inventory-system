namespace Inventory.Domain.ValueObjects;

public sealed record Sku
{
    public string Value { get; init; }

    public Sku(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("El código SKU no puede estar vacío.", nameof(value));
        }

        var normalized = value.Trim().ToUpperInvariant();
        if (normalized.Length < 3 || normalized.Length > 50)
        {
            throw new ArgumentException("El SKU debe tener entre 3 y 50 caracteres.", nameof(value));
        }

        Value = normalized;
    }

    public override string ToString() => Value;
}
