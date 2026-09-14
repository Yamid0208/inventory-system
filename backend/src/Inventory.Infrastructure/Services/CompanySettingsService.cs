using Inventory.Application.Features.Settings.DTOs;
using Inventory.Application.Features.Settings.Services;
using Inventory.Domain.Entities;
using Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Infrastructure.Services;

public class CompanySettingsService : ICompanySettingsService
{
    private readonly ApplicationDbContext _context;

    public CompanySettingsService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CompanySettingsDto> GetSettingsAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _context.CompanySettings
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken);

        if (settings == null)
        {
            settings = new CompanySettings(
                companyName: "LogiStock Enterprise S.A.S.",
                taxId: "901.458.789-2",
                email: "contacto@logistock.com",
                phone: "+57 601 555 8900",
                address: "Calle 26 #69D-91 Torre 2 Piso 8",
                city: "Bogotá D.C., Colombia"
            );

            _context.CompanySettings.Add(settings);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return MapToDto(settings);
    }

    public async Task<CompanySettingsDto> UpdateSettingsAsync(
        UpdateCompanySettingsRequest request,
        string currentUserName,
        CancellationToken cancellationToken = default)
    {
        var settings = await _context.CompanySettings
            .FirstOrDefaultAsync(cancellationToken);

        if (settings == null)
        {
            settings = new CompanySettings(
                request.CompanyName,
                request.TaxId,
                request.Email,
                request.Phone,
                request.Address,
                request.City,
                request.DefaultTaxRate,
                request.CurrencyCode,
                request.CurrencySymbol,
                request.LowStockThresholdDefault,
                request.AllowNegativeStock,
                request.EnableAuditNotifications,
                request.Website,
                request.LogoUrl
            );
            _context.CompanySettings.Add(settings);
        }
        else
        {
            settings.Update(
                request.CompanyName,
                request.TaxId,
                request.Email,
                request.Phone,
                request.Address,
                request.City,
                request.DefaultTaxRate,
                request.CurrencyCode,
                request.CurrencySymbol,
                request.LowStockThresholdDefault,
                request.AllowNegativeStock,
                request.EnableAuditNotifications,
                request.Website,
                request.LogoUrl
            );
        }

        _context.AuditLogs.Add(new AuditLog(
            "Settings",
            "Update",
            $"Parámetros institucionales actualizados por {currentUserName}: Razón Social='{settings.CompanyName}', IVA={settings.DefaultTaxRate}%, Divisa={settings.CurrencyCode}.",
            currentUserName,
            null,
            settings.Id.ToString()
        ));

        await _context.SaveChangesAsync(cancellationToken);
        return MapToDto(settings);
    }

    private static CompanySettingsDto MapToDto(CompanySettings s) =>
        new(
            s.Id,
            s.CompanyName,
            s.TaxId,
            s.Email,
            s.Phone,
            s.Address,
            s.City,
            s.Website,
            s.LogoUrl,
            s.DefaultTaxRate,
            s.CurrencyCode,
            s.CurrencySymbol,
            s.LowStockThresholdDefault,
            s.AllowNegativeStock,
            s.EnableAuditNotifications,
            s.UpdatedAt
        );
}
