using Inventory.Domain.Entities;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class AuditLogTests
{
    [Fact]
    public void Constructor_WithValidArguments_CreatesAuditLogSuccessfully()
    {
        var log = new AuditLog(
            entityName: "Product",
            action: "Create",
            details: "Producto ELE-KB-089 registrado con stock inicial 0.",
            userName: "Administrador",
            userId: 1,
            entityId: "10",
            ipAddress: "127.0.0.1"
        );

        Assert.Equal("Product", log.EntityName);
        Assert.Equal("Create", log.Action);
        Assert.Equal("Administrador", log.UserName);
        Assert.Equal(1, log.UserId);
        Assert.Equal("10", log.EntityId);
        Assert.Equal("127.0.0.1", log.IpAddress);
        Assert.True(log.CreatedAt <= DateTimeOffset.UtcNow);
    }

    [Theory]
    [InlineData("", "Create", "Detalle")]
    [InlineData("   ", "Create", "Detalle")]
    [InlineData("Product", "", "Detalle")]
    [InlineData("Product", "   ", "Detalle")]
    [InlineData("Product", "Create", "")]
    [InlineData("Product", "Create", "   ")]
    public void Constructor_WithMissingRequiredFields_ThrowsArgumentException(
        string entity, string action, string details)
    {
        Assert.Throws<ArgumentException>(() => new AuditLog(entity, action, details, "Admin"));
    }
}
