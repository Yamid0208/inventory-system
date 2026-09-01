using Inventory.Domain.Entities;
using Inventory.Domain.Enums;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class UserTests
{
    [Fact]
    public void Constructor_WithValidData_CreatesUserWithRole()
    {
        var user = new User("Administrador SGI", "admin@sgi.local", "hashed_password_123", UserRole.Admin);

        Assert.Equal("Administrador SGI", user.FullName);
        Assert.Equal("admin@sgi.local", user.Email);
        Assert.Equal(UserRole.Admin, user.Role);
        Assert.True(user.IsActive);
        Assert.False(user.IsDeleted);
        Assert.Empty(user.RefreshTokens);
    }

    [Theory]
    [InlineData("", "admin@sgi.local")]
    [InlineData("Admin", "")]
    [InlineData("   ", "admin@sgi.local")]
    [InlineData("Admin", "   ")]
    public void Constructor_WithInvalidData_ThrowsArgumentException(string name, string email)
    {
        Assert.Throws<ArgumentException>(() => new User(name, email, "hash", UserRole.Admin));
    }

    [Fact]
    public void AddRefreshToken_AddsTokenToCollection()
    {
        var user = new User("Vendedor", "vendedor@sgi.local", "hash", UserRole.Seller);
        var expiresAt = DateTimeOffset.UtcNow.AddDays(7);

        var token = user.AddRefreshToken("sample_refresh_token_123", expiresAt, "127.0.0.1");

        Assert.Single(user.RefreshTokens);
        Assert.Equal("sample_refresh_token_123", token.Token);
        Assert.True(token.IsActiveToken);
        Assert.False(token.IsRevoked);
        Assert.False(token.IsExpired);
    }

    [Fact]
    public void RevokeAllRefreshTokens_RevokesAllActiveTokens()
    {
        var user = new User("Operador Almacén", "almacen@sgi.local", "hash", UserRole.Warehouse);
        var expiresAt = DateTimeOffset.UtcNow.AddDays(7);

        user.AddRefreshToken("token_1", expiresAt);
        user.AddRefreshToken("token_2", expiresAt);

        user.RevokeAllRefreshTokens("192.168.1.50");

        Assert.All(user.RefreshTokens, t =>
        {
            Assert.True(t.IsRevoked);
            Assert.False(t.IsActiveToken);
            Assert.Equal("192.168.1.50", t.RevokedByIp);
        });
    }
}
