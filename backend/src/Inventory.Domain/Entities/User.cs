using Inventory.Domain.Common;
using Inventory.Domain.Enums;

namespace Inventory.Domain.Entities;

public class User : BaseEntity
{
    public string FullName { get; private set; } = null!;
    public string Email { get; private set; } = null!;
    public string PasswordHash { get; private set; } = null!;
    public UserRole Role { get; private set; }
    public bool IsActive { get; private set; } = true;

    private readonly List<RefreshToken> _refreshTokens = new();
    public IReadOnlyCollection<RefreshToken> RefreshTokens => _refreshTokens.AsReadOnly();

    protected User() { } // Requerido por EF Core

    public User(string fullName, string email, string passwordHash, UserRole role)
    {
        Update(fullName, email, role);
        SetPasswordHash(passwordHash);
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public void Update(string fullName, string email, UserRole role)
    {
        if (string.IsNullOrWhiteSpace(fullName))
        {
            throw new ArgumentException("El nombre completo es obligatorio.", nameof(fullName));
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("El correo electrónico es obligatorio.", nameof(email));
        }

        FullName = fullName.Trim();
        Email = email.Trim().ToLowerInvariant();
        Role = role;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void SetPasswordHash(string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
        {
            throw new ArgumentException("El hash de contraseña es obligatorio.", nameof(passwordHash));
        }

        PasswordHash = passwordHash;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public RefreshToken AddRefreshToken(string token, DateTimeOffset expiresAt, string? createdByIp = null)
    {
        var refreshToken = new RefreshToken(Id, token, expiresAt, createdByIp);
        _refreshTokens.Add(refreshToken);
        return refreshToken;
    }

    public void RevokeAllRefreshTokens(string? revokedByIp = null)
    {
        foreach (var token in _refreshTokens.Where(t => t.IsActiveToken))
        {
            token.Revoke(revokedByIp);
        }
    }
}
