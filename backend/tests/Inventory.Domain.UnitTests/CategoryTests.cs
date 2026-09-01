using Inventory.Domain.Entities;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class CategoryTests
{
    [Fact]
    public void Constructor_WithValidData_CreatesCategory()
    {
        var category = new Category("Electrónica", "Dispositivos electrónicos");

        Assert.Equal("Electrónica", category.Name);
        Assert.Equal("Dispositivos electrónicos", category.Description);
        Assert.True(category.IsActive);
        Assert.False(category.IsDeleted);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Constructor_WithInvalidName_ThrowsArgumentException(string? invalidName)
    {
        Assert.Throws<ArgumentException>(() => new Category(invalidName!));
    }

    [Fact]
    public void Deactivate_SetsIsActiveToFalse()
    {
        var category = new Category("Lácteos");
        category.Deactivate();

        Assert.False(category.IsActive);
        Assert.NotNull(category.UpdatedAt);
    }

    [Fact]
    public void SoftDelete_SetsIsDeletedAndDeletedAt()
    {
        var category = new Category("Bebidas");
        category.SoftDelete();

        Assert.True(category.IsDeleted);
        Assert.NotNull(category.DeletedAt);
    }
}
