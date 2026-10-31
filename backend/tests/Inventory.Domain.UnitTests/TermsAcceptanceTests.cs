using Inventory.Domain.Entities;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class TermsAcceptanceTests
{
    [Fact]
    public void Constructor_WithValidData_CreatesTermsAcceptanceRecord()
    {
        var acceptance = new TermsAcceptance(
            userId: 1,
            userEmail: "ADMIN@INSINCRO.COM",
            userName: "Administrador General",
            userRole: "Admin",
            termsVersion: "1.0",
            privacyPolicyVersion: "1.0",
            ipAddress: "190.25.10.45",
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        );

        Assert.Equal(1, acceptance.UserId);
        Assert.Equal("admin@insincro.com", acceptance.UserEmail); // normalized lowercase
        Assert.Equal("Administrador General", acceptance.UserName);
        Assert.Equal("Admin", acceptance.UserRole);
        Assert.Equal("1.0", acceptance.TermsVersion);
        Assert.Equal("1.0", acceptance.PrivacyPolicyVersion);
        Assert.Equal("190.25.10.45", acceptance.IpAddress);
        Assert.Equal("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", acceptance.UserAgent);
        Assert.True(acceptance.AcceptedAt <= DateTimeOffset.UtcNow);
        Assert.True(acceptance.AcceptedAt > DateTimeOffset.UtcNow.AddMinutes(-1));
    }

    [Theory]
    [InlineData(0, "user@insincro.com", "User", "Admin", "1.0", "1.0", "127.0.0.1")]
    [InlineData(-1, "user@insincro.com", "User", "Admin", "1.0", "1.0", "127.0.0.1")]
    [InlineData(1, "", "User", "Admin", "1.0", "1.0", "127.0.0.1")]
    [InlineData(1, "   ", "User", "Admin", "1.0", "1.0", "127.0.0.1")]
    [InlineData(1, "user@insincro.com", "", "Admin", "1.0", "1.0", "127.0.0.1")]
    [InlineData(1, "user@insincro.com", "User", "", "1.0", "1.0", "127.0.0.1")]
    [InlineData(1, "user@insincro.com", "User", "Admin", "", "1.0", "127.0.0.1")]
    [InlineData(1, "user@insincro.com", "User", "Admin", "1.0", "", "127.0.0.1")]
    [InlineData(1, "user@insincro.com", "User", "Admin", "1.0", "1.0", "")]
    [InlineData(1, "user@insincro.com", "User", "Admin", "1.0", "1.0", "   ")]
    public void Constructor_WithInvalidData_ThrowsArgumentException(
        int userId,
        string email,
        string name,
        string role,
        string termsVersion,
        string privacyVersion,
        string ip)
    {
        Assert.Throws<ArgumentException>(() => new TermsAcceptance(
            userId,
            email,
            name,
            role,
            termsVersion,
            privacyVersion,
            ip
        ));
    }
}

