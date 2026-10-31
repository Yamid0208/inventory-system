namespace Inventory.Application.Features.Legal.DTOs;

public record LegalDocumentsDto(
    string TermsVersion,
    string PrivacyVersion,
    DateTimeOffset LastUpdated,
    string TermsTitle,
    string TermsContent,
    string PrivacyTitle,
    string PrivacyContent
);

