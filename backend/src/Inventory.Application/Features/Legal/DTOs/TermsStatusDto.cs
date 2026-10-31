namespace Inventory.Application.Features.Legal.DTOs;

public record TermsStatusDto(
    bool HasAccepted,
    string CurrentTermsVersion,
    string CurrentPrivacyVersion,
    DateTimeOffset? AcceptedAt,
    string? IpAddress,
    string? UserEmail
);

