namespace Inventory.Application.Features.Settings.DTOs;

public record CompanySettingsDto(
    int Id,
    string CompanyName,
    string TaxId,
    string Email,
    string Phone,
    string Address,
    string City,
    string? Website,
    string? LogoUrl,
    decimal DefaultTaxRate,
    string CurrencyCode,
    string CurrencySymbol,
    int LowStockThresholdDefault,
    bool AllowNegativeStock,
    bool EnableAuditNotifications,
    DateTimeOffset? UpdatedAt
);

public record UpdateCompanySettingsRequest(
    string CompanyName,
    string TaxId,
    string Email,
    string Phone,
    string Address,
    string City,
    decimal DefaultTaxRate,
    string CurrencyCode = "COP",
    string CurrencySymbol = "$",
    int LowStockThresholdDefault = 10,
    bool AllowNegativeStock = false,
    bool EnableAuditNotifications = true,
    string? Website = null,
    string? LogoUrl = null
);
