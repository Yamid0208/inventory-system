using Inventory.Application.Common.Models;
using Inventory.Application.Features.Audit.DTOs;

namespace Inventory.Application.Features.Audit.Services;

public interface IAuditService
{
    Task LogAsync(
        string entityName,
        string action,
        string details,
        string userName,
        int? userId = null,
        string? entityId = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default);

    Task<PagedResult<AuditLogDto>> GetLogsAsync(
        AuditLogFilterRequest request,
        CancellationToken cancellationToken = default);

    Task<AuditSummaryDto> GetSummaryAsync(
        CancellationToken cancellationToken = default);
}
