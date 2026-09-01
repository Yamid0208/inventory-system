using Inventory.Domain.ValueObjects;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class MoneyTests
{
    [Fact]
    public void Constructor_WithValidAmount_RoundsUsingAwayFromZero()
    {
        // Arrange & Act
        var money = new Money(10.555m, "USD");

        // Assert
        Assert.Equal(10.56m, money.Amount);
        Assert.Equal("USD", money.Currency);
    }

    [Fact]
    public void Constructor_WithNegativeAmount_ThrowsArgumentOutOfRangeException()
    {
        // Act & Assert
        Assert.Throws<ArgumentOutOfRangeException>(() => new Money(-1.00m, "USD"));
    }

    [Fact]
    public void Addition_SameCurrency_ReturnsCorrectSum()
    {
        // Arrange
        var m1 = new Money(15.25m, "USD");
        var m2 = new Money(4.75m, "USD");

        // Act
        var result = m1 + m2;

        // Assert
        Assert.Equal(20.00m, result.Amount);
        Assert.Equal("USD", result.Currency);
    }

    [Fact]
    public void Addition_DifferentCurrencies_ThrowsInvalidOperationException()
    {
        // Arrange
        var m1 = new Money(10m, "USD");
        var m2 = new Money(10m, "EUR");

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() => _ = m1 + m2);
    }
}
