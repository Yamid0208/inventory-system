using Inventory.Domain.Entities;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class CustomerTests
{
    [Fact]
    public void Constructor_WithValidData_CreatesCustomerSuccessfully()
    {
        var customer = new Customer(
            name: "Distribuidora Andina S.A.S.",
            taxId: "900123456-1",
            email: "contacto@distriandina.com",
            phone: "+57 300 123 4567",
            address: "Calle 100 #15-20",
            city: "Bogotá",
            notes: "Cliente preferencial"
        );

        Assert.Equal("Distribuidora Andina S.A.S.", customer.Name);
        Assert.Equal("900123456-1", customer.TaxId);
        Assert.Equal("contacto@distriandina.com", customer.Email);
        Assert.True(customer.IsActive);
        Assert.False(customer.IsDeleted);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_WithEmptyName_ThrowsArgumentException(string? invalidName)
    {
        Assert.Throws<ArgumentException>(() => new Customer(invalidName!));
    }

    [Theory]
    [InlineData("correo-invalido")]
    [InlineData("sin-arroba.com")]
    [InlineData("test@")]
    public void Constructor_WithInvalidEmail_ThrowsArgumentException(string invalidEmail)
    {
        Assert.Throws<ArgumentException>(() => new Customer("Cliente Prueba", email: invalidEmail));
    }

    [Fact]
    public void DeactivateAndActivate_TogglesIsActiveCorrectly()
    {
        var customer = new Customer("Cliente Activo");
        Assert.True(customer.IsActive);

        customer.Deactivate();
        Assert.False(customer.IsActive);

        customer.Activate();
        Assert.True(customer.IsActive);
    }

    [Fact]
    public void SoftDelete_SetsIsDeletedAndDeletedAt()
    {
        var customer = new Customer("Cliente Para Borrar");
        Assert.False(customer.IsDeleted);

        customer.SoftDelete();
        Assert.True(customer.IsDeleted);
        Assert.NotNull(customer.DeletedAt);
    }
}
