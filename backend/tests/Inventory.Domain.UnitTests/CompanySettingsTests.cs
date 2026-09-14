using Inventory.Domain.Entities;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class CompanySettingsTests
{
    [Fact]
    public void Constructor_WithValidArguments_CreatesCompanySettingsSuccessfully()
    {
        var settings = new CompanySettings(
            companyName: "LogiStock Enterprise S.A.S.",
            taxId: "901.458.789-2",
            email: "contacto@logistock.com",
            phone: "+57 601 555 8900",
            address: "Calle 26 #69D-91",
            city: "Bogotá",
            defaultTaxRate: 19.00m,
            currencyCode: "COP",
            currencySymbol: "$",
            lowStockThresholdDefault: 10,
            allowNegativeStock: false,
            enableAuditNotifications: true
        );

        Assert.Equal("LogiStock Enterprise S.A.S.", settings.CompanyName);
        Assert.Equal("901.458.789-2", settings.TaxId);
        Assert.Equal("contacto@logistock.com", settings.Email);
        Assert.Equal(19.00m, settings.DefaultTaxRate);
        Assert.Equal("COP", settings.CurrencyCode);
        Assert.Equal("$", settings.CurrencySymbol);
        Assert.False(settings.AllowNegativeStock);
        Assert.True(settings.EnableAuditNotifications);
    }

    [Theory]
    [InlineData(null, "901.458.789-2", "correo@empresa.com")]
    [InlineData("", "901.458.789-2", "correo@empresa.com")]
    [InlineData("   ", "901.458.789-2", "correo@empresa.com")]
    [InlineData("Empresa", null, "correo@empresa.com")]
    [InlineData("Empresa", "", "correo@empresa.com")]
    [InlineData("Empresa", "   ", "correo@empresa.com")]
    [InlineData("Empresa", "901.458.789-2", null)]
    [InlineData("Empresa", "901.458.789-2", "")]
    [InlineData("Empresa", "901.458.789-2", "   ")]
    public void Constructor_WithMissingRequiredFields_ThrowsArgumentException(
        string? name, string? taxId, string? email)
    {
        Assert.Throws<ArgumentException>(() => new CompanySettings(
            name!, taxId!, email!, "+57 300 000 0000", "Dir", "Ciudad"));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(100.1)]
    [InlineData(150)]
    public void Constructor_WithInvalidTaxRate_ThrowsArgumentOutOfRangeException(decimal invalidTaxRate)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new CompanySettings(
            "Empresa", "901.458.789-2", "correo@empresa.com", "Tel", "Dir", "Ciudad", defaultTaxRate: invalidTaxRate));
    }

    [Fact]
    public void Constructor_WithNegativeLowStockThreshold_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new CompanySettings(
            "Empresa", "901.458.789-2", "correo@empresa.com", "Tel", "Dir", "Ciudad", lowStockThresholdDefault: -5));
    }
}
