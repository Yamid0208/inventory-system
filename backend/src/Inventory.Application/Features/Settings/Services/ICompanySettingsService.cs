using Inventory.Application.Features.Settings.DTOs;

namespace Inventory.Application.Features.Settings.Services;

public interface ICompanySettingsService
{
    Task<CompanySettingsDto> GetSettingsAsync(CancellationToken cancellationToken = default);

    Task<CompanySettingsDto> UpdateSettingsAsync(
        UpdateCompanySettingsRequest request,
        string currentUserName,
        CancellationToken cancellationToken = default);
}
