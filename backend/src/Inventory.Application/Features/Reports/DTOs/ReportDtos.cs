namespace Inventory.Application.Features.Reports.DTOs;

public record ReportMetadataDto(
    string Key,
    string Title,
    string Description,
    string Icon,
    int RecordCount,
    DateTimeOffset LastUpdated
);

public record ReportsCatalogSummaryDto(
    IReadOnlyList<ReportMetadataDto> Reports,
    int TotalExportableRecords
);
