using Inventory.Domain.Common;

namespace Inventory.Domain.Entities;

public class CompanySettings : BaseEntity
{
    public string CompanyName { get; private set; } = null!;
    public string TaxId { get; private set; } = null!;
    public string Email { get; private set; } = null!;
    public string Phone { get; private set; } = null!;
    public string Address { get; private set; } = null!;
    public string City { get; private set; } = null!;
    public string? Website { get; private set; }
    public string? LogoUrl { get; private set; }

    public decimal DefaultTaxRate { get; private set; }
    public string CurrencyCode { get; private set; } = null!;
    public string CurrencySymbol { get; private set; } = null!;
    public int LowStockThresholdDefault { get; private set; }
    public bool AllowNegativeStock { get; private set; }
    public bool EnableAuditNotifications { get; private set; }

    protected CompanySettings() { } // Requerido por EF Core

    public CompanySettings(
        string companyName,
        string taxId,
        string email,
        string phone,
        string address,
        string city,
        decimal defaultTaxRate = 19.00m,
        string currencyCode = "COP",
        string currencySymbol = "$",
        int lowStockThresholdDefault = 10,
        bool allowNegativeStock = false,
        bool enableAuditNotifications = true,
        string? website = null,
        string? logoUrl = null)
    {
        Update(
            companyName,
            taxId,
            email,
            phone,
            address,
            city,
            defaultTaxRate,
            currencyCode,
            currencySymbol,
            lowStockThresholdDefault,
            allowNegativeStock,
            enableAuditNotifications,
            website,
            logoUrl
        );
    }

    public void Update(
        string companyName,
        string taxId,
        string email,
        string phone,
        string address,
        string city,
        decimal defaultTaxRate,
        string currencyCode,
        string currencySymbol,
        int lowStockThresholdDefault,
        bool allowNegativeStock,
        bool enableAuditNotifications,
        string? website = null,
        string? logoUrl = null)
    {
        if (string.IsNullOrWhiteSpace(companyName))
        {
            throw new ArgumentException("El nombre o razón social de la empresa es obligatorio.", nameof(companyName));
        }

        if (string.IsNullOrWhiteSpace(taxId))
        {
            throw new ArgumentException("El NIT o documento fiscal de la empresa es obligatorio.", nameof(taxId));
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("El correo institucional es obligatorio.", nameof(email));
        }

        if (defaultTaxRate < 0 || defaultTaxRate > 100)
        {
            throw new ArgumentOutOfRangeException(nameof(defaultTaxRate), "La tasa impositiva (IVA) debe estar comprendida entre 0% y 100%.");
        }

        if (lowStockThresholdDefault < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(lowStockThresholdDefault), "El umbral de stock bajo debe ser mayor o igual a 0.");
        }

        CompanyName = companyName.Trim();
        TaxId = taxId.Trim().ToUpperInvariant();
        Email = email.Trim().ToLowerInvariant();
        Phone = phone.Trim();
        Address = address.Trim();
        City = city.Trim();
        DefaultTaxRate = Math.Round(defaultTaxRate, 2);
        CurrencyCode = string.IsNullOrWhiteSpace(currencyCode) ? "COP" : currencyCode.Trim().ToUpperInvariant();
        CurrencySymbol = string.IsNullOrWhiteSpace(currencySymbol) ? "$" : currencySymbol.Trim();
        LowStockThresholdDefault = lowStockThresholdDefault;
        AllowNegativeStock = allowNegativeStock;
        EnableAuditNotifications = enableAuditNotifications;
        Website = website?.Trim();
        LogoUrl = logoUrl?.Trim();
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
