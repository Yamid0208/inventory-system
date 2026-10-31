namespace Inventory.Application.Features.Legal.DTOs;

public record TermsAcceptanceRecordDto(
    int Id,
    int UserId,
    string UserEmail,
    string UserName,
    string UserRole,
    string TermsVersion,
    string PrivacyPolicyVersion,
    DateTimeOffset AcceptedAt,
    string IpAddress,
    string? UserAgent
);

