using Inventory.Application.Common.Models;
using Inventory.Application.Features.Legal.DTOs;

namespace Inventory.Application.Features.Legal.Services;

public interface ILegalService
{
    Task<TermsStatusDto> GetConsentStatusAsync(int userId, CancellationToken cancellationToken = default);
    Task<Result<LegalConsentResultDto>> AcceptTermsAsync(int userId, AcceptTermsRequest request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);
    Task<LegalDocumentsDto> GetDocumentsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TermsAcceptanceRecordDto>> GetAuditRecordsAsync(CancellationToken cancellationToken = default);
}

