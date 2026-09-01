using Inventory.Domain.ValueObjects;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class SkuTests
{
    [Theory]
    [InlineData("prod-001", "PROD-001")]
    [InlineData("  abc-123  ", "ABC-123")]
    public void Constructor_ValidSku_NormalizesToUpper(string input, string expected)
    {
        var sku = new Sku(input);
        Assert.Equal(expected, sku.Value);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("a")]
    public void Constructor_InvalidSku_ThrowsArgumentException(string invalidInput)
    {
        Assert.Throws<ArgumentException>(() => new Sku(invalidInput));
    }
}
