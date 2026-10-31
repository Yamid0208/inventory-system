namespace Inventory.Application.Features.Legal.DTOs;

public record AcceptTermsRequest(
    string TermsVersion = "1.0",
    string PrivacyPolicyVersion = "1.0"
);

