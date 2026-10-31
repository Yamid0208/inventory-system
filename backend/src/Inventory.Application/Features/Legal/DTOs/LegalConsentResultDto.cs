namespace Inventory.Application.Features.Legal.DTOs;

public record LegalConsentResultDto(
    bool Success,
    string Message,
    DateTimeOffset AcceptedAt,
    string IpAddress,
    string UserEmail,
    string TermsVersion
);

