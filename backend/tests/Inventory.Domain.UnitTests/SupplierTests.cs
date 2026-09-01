using Inventory.Domain.Entities;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class SupplierTests
{
    [Fact]
    public void Constructor_WithValidData_CreatesSupplier()
    {
        var supplier = new Supplier("Distribuidora Global", "J-12345678-9", "Juan Pérez", "ventas@global.com", "+123456789", "Av. Principal #100");

        Assert.Equal("Distribuidora Global", supplier.Name);
        Assert.Equal("J-12345678-9", supplier.TaxId);
        Assert.Equal("ventas@global.com", supplier.Email);
        Assert.True(supplier.IsActive);
        Assert.False(supplier.IsDeleted);
    }

    [Theory]
    [InlineData("", "TAX-123")]
    [InlineData("Proveedor", "")]
    [InlineData("   ", "TAX-123")]
    [InlineData("Proveedor", "   ")]
    public void Constructor_WithMissingRequiredFields_ThrowsArgumentException(string name, string taxId)
    {
        Assert.Throws<ArgumentException>(() => new Supplier(name, taxId));
    }

    [Fact]
    public void Deactivate_SetsIsActiveToFalse()
    {
        var supplier = new Supplier("Tech Supplies", "TAX-999");
        supplier.Deactivate();

        Assert.False(supplier.IsActive);
        Assert.NotNull(supplier.UpdatedAt);
    }
}
