using Inventory.Domain.Common;

namespace Inventory.Domain.Entities;

public class TermsAcceptance : BaseEntity
{
    public int UserId { get; private set; }
    public string UserEmail { get; private set; } = null!;
    public string UserName { get; private set; } = null!;
    public string UserRole { get; private set; } = null!;
    public string TermsVersion { get; private set; } = null!;
    public string PrivacyPolicyVersion { get; private set; } = null!;
    public DateTimeOffset AcceptedAt { get; private set; }
    public string IpAddress { get; private set; } = null!;
    public string? UserAgent { get; private set; }

    public User? User { get; private set; }

    protected TermsAcceptance() { } // Requerido por EF Core

    public TermsAcceptance(
        int userId,
        string userEmail,
        string userName,
        string userRole,
        string termsVersion,
        string privacyPolicyVersion,
        string ipAddress,
        string? userAgent = null)
    {
        if (userId <= 0)
        {
            throw new ArgumentException("El identificador del usuario debe ser mayor a cero.", nameof(userId));
        }

        if (string.IsNullOrWhiteSpace(userEmail))
        {
            throw new ArgumentException("El correo electrónico de la cuenta es obligatorio para el registro probatorio.", nameof(userEmail));
        }

        if (string.IsNullOrWhiteSpace(userName))
        {
            throw new ArgumentException("El nombre del usuario es obligatorio.", nameof(userName));
        }

        if (string.IsNullOrWhiteSpace(userRole))
        {
            throw new ArgumentException("El rol del usuario es obligatorio.", nameof(userRole));
        }

        if (string.IsNullOrWhiteSpace(termsVersion))
        {
            throw new ArgumentException("La versión de los términos y condiciones es obligatoria.", nameof(termsVersion));
        }

        if (string.IsNullOrWhiteSpace(privacyPolicyVersion))
        {
            throw new ArgumentException("La versión de la política de privacidad es obligatoria.", nameof(privacyPolicyVersion));
        }

        if (string.IsNullOrWhiteSpace(ipAddress))
        {
            throw new ArgumentException("La dirección IP del cliente es obligatoria para el registro de auditoría legal.", nameof(ipAddress));
        }

        UserId = userId;
        UserEmail = userEmail.Trim().ToLowerInvariant();
        UserName = userName.Trim();
        UserRole = userRole.Trim();
        TermsVersion = termsVersion.Trim();
        PrivacyPolicyVersion = privacyPolicyVersion.Trim();
        IpAddress = ipAddress.Trim();
        UserAgent = userAgent?.Trim();
        AcceptedAt = DateTimeOffset.UtcNow;
        CreatedAt = AcceptedAt;
    }
}

