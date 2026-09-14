namespace Inventory.Application.Features.Audit.DTOs;

public record AuditLogDto(
    int Id,
    string EntityName,
    string? EntityId,
    string Action,
    string Details,
    int? UserId,
    string UserName,
    string? IpAddress,
    DateTimeOffset CreatedAt
);

public record AuditSummaryDto(
    int TotalLogs,
    int TodayCount,
    IReadOnlyDictionary<string, int> TopActions,
    IReadOnlyDictionary<string, int> TopEntities
);

public record AuditLogFilterRequest(
    string? EntityName = null,
    string? Action = null,
    int? UserId = null,
    DateTimeOffset? StartDate = null,
    DateTimeOffset? EndDate = null,
    string? Search = null,
    int PageNumber = 1,
    int PageSize = 15
);
