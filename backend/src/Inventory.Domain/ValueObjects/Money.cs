namespace Inventory.Domain.ValueObjects;

public sealed record Money
{
    public decimal Amount { get; init; }
    public string Currency { get; init; }

    public Money(decimal amount, string currency = "USD")
    {
        if (amount < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(amount), "El monto monetario no puede ser negativo.");
        }

        if (string.IsNullOrWhiteSpace(currency))
        {
            throw new ArgumentException("El código de moneda es requerido.", nameof(currency));
        }

        Amount = decimal.Round(amount, 2, MidpointRounding.AwayFromZero);
        Currency = currency.Trim().ToUpperInvariant();
    }

    public static Money Zero(string currency = "USD") => new(0m, currency);

    public static Money operator +(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return new Money(a.Amount + b.Amount, a.Currency);
    }

    public static Money operator -(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return new Money(a.Amount - b.Amount, a.Currency);
    }

    private static void EnsureSameCurrency(Money a, Money b)
    {
        if (a.Currency != b.Currency)
        {
            throw new InvalidOperationException($"No se pueden operar montos con monedas distintas: {a.Currency} vs {b.Currency}");
        }
    }
}
