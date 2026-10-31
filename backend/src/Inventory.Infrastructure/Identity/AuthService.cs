using Inventory.Application.Common.Interfaces;
using Inventory.Application.Common.Models;
using Inventory.Application.Features.Auth.DTOs;
using Inventory.Application.Features.Auth.Services;
using Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Inventory.Infrastructure.Identity;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _tokenGenerator;
    private readonly IConfiguration _configuration;

    public AuthService(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator tokenGenerator,
        IConfiguration configuration)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _tokenGenerator = tokenGenerator;
        _configuration = configuration;
    }

    public async Task<Result<AuthResponse>> LoginAsync(LoginRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        // PERF-005: Cargar solo tokens activos en memoria, evitando arrastrar historiales obsoletos
        var user = await _context.Users
            .Include(u => u.RefreshTokens.Where(rt => rt.RevokedAt == null && rt.ExpiresAt > DateTimeOffset.UtcNow))
            .Include(u => u.Warehouse)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail && !u.IsDeleted, cancellationToken);

        if (user == null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Result<AuthResponse>.Failure("Credenciales incorrectas o usuario no encontrado.");
        }

        if (!user.IsActive)
        {
            return Result<AuthResponse>.Failure("La cuenta de usuario está desactivada. Contacte al administrador.");
        }

        var accessToken = _tokenGenerator.GenerateAccessToken(user);
        var rawRefreshToken = _tokenGenerator.GenerateRefreshToken();
        var refreshDays = int.TryParse(_configuration["Jwt:RefreshTokenExpirationDays"], out var days) ? days : 7;
        var expiresAt = DateTimeOffset.UtcNow.AddDays(refreshDays);

        user.AddRefreshToken(rawRefreshToken, expiresAt, ipAddress);
        _context.AuditLogs.Add(new AuditLog(
            "Auth",
            "Login",
            $"Inicio de sesión exitoso para la cuenta {user.Email}.",
            user.FullName,
            user.Id,
            user.Id.ToString(),
            ipAddress
        ));
        await _context.SaveChangesAsync(cancellationToken);

        var hasAcceptedTerms = await CheckHasAcceptedTermsAsync(user.Id, cancellationToken);
        var userDto = new UserDto(
            user.Id,
            user.FullName,
            user.Email,
            user.Role.ToString(),
            user.IsActive,
            user.WarehouseId,
            user.Warehouse?.Name,
            hasAcceptedTerms
        );
        return Result<AuthResponse>.Success(new AuthResponse(accessToken, userDto, expiresAt, rawRefreshToken));
    }

    public async Task<Result<AuthResponse>> RefreshTokenAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return Result<AuthResponse>.Failure("El token de refresco es requerido.");
        }

        var tokenEntity = await _context.RefreshTokens
            .Include(t => t.User)
                .ThenInclude(u => u.Warehouse)
            .FirstOrDefaultAsync(t => t.Token == refreshToken, cancellationToken);

        if (tokenEntity == null)
        {
            return Result<AuthResponse>.Failure("Token de refresco inválido.");
        }

        // Detección de Replay Attack con período de gracia de 30 segundos
        // Permite mitigar condiciones de carrera por recargas de página (F5) o llamadas concurrentes legítimas
        if (tokenEntity.RevokedAt != null)
        {
            var gracePeriod = TimeSpan.FromSeconds(30);
            if (DateTimeOffset.UtcNow - tokenEntity.RevokedAt > gracePeriod)
            {
                tokenEntity.User.RevokeAllRefreshTokens(ipAddress);
                await _context.SaveChangesAsync(cancellationToken);
                return Result<AuthResponse>.Failure("Violación de seguridad detectada: Intento de reuso de token revocado. Todas las sesiones han sido cerradas.");
            }

            // Dentro del período de gracia (<= 30s), retornar el token activo más reciente sin invalidar la sesión
            var latestActiveToken = await _context.RefreshTokens
                .Where(t => t.UserId == tokenEntity.UserId && t.RevokedAt == null && t.ExpiresAt > DateTimeOffset.UtcNow)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (latestActiveToken != null)
            {
                var graceAccessToken = _tokenGenerator.GenerateAccessToken(tokenEntity.User);
                var hasAccepted = await CheckHasAcceptedTermsAsync(tokenEntity.User.Id, cancellationToken);
                var graceUserDto = new UserDto(
                    tokenEntity.User.Id,
                    tokenEntity.User.FullName,
                    tokenEntity.User.Email,
                    tokenEntity.User.Role.ToString(),
                    tokenEntity.User.IsActive,
                    tokenEntity.User.WarehouseId,
                    tokenEntity.User.Warehouse?.Name,
                    hasAccepted
                );
                return Result<AuthResponse>.Success(new AuthResponse(graceAccessToken, graceUserDto, latestActiveToken.ExpiresAt, latestActiveToken.Token));
            }
        }

        if (DateTimeOffset.UtcNow >= tokenEntity.ExpiresAt)
        {
            return Result<AuthResponse>.Failure("El token de refresco ha expirado. Debe iniciar sesión nuevamente.");
        }

        if (!tokenEntity.User.IsActive || tokenEntity.User.IsDeleted)
        {
            return Result<AuthResponse>.Failure("El usuario asociado a este token se encuentra inactivo o eliminado.");
        }

        // Rotación de Refresh Token
        var newAccessToken = _tokenGenerator.GenerateAccessToken(tokenEntity.User);
        var newRawRefreshToken = _tokenGenerator.GenerateRefreshToken();
        var refreshDays = int.TryParse(_configuration["Jwt:RefreshTokenExpirationDays"], out var days) ? days : 7;
        var expiresAt = DateTimeOffset.UtcNow.AddDays(refreshDays);

        tokenEntity.Revoke(ipAddress, newRawRefreshToken);
        tokenEntity.User.AddRefreshToken(newRawRefreshToken, expiresAt, ipAddress);

        await _context.SaveChangesAsync(cancellationToken);

        var hasAcceptedTerms = await CheckHasAcceptedTermsAsync(tokenEntity.User.Id, cancellationToken);
        var userDto = new UserDto(
            tokenEntity.User.Id,
            tokenEntity.User.FullName,
            tokenEntity.User.Email,
            tokenEntity.User.Role.ToString(),
            tokenEntity.User.IsActive,
            tokenEntity.User.WarehouseId,
            tokenEntity.User.Warehouse?.Name,
            hasAcceptedTerms
        );
        return Result<AuthResponse>.Success(new AuthResponse(newAccessToken, userDto, expiresAt, newRawRefreshToken));
    }

    public async Task<Result> RevokeTokenAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return Result.Failure("Token no proporcionado.");
        }

        var tokenEntity = await _context.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == refreshToken && t.RevokedAt == null, cancellationToken);

        if (tokenEntity == null)
        {
            return Result.Failure("Token inválido o ya revocado.");
        }

        tokenEntity.Revoke(ipAddress);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result<UserDto>> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result<UserDto>.Failure("Usuario no encontrado.");
        }

        var hasAcceptedTerms = await CheckHasAcceptedTermsAsync(user.Id, cancellationToken);
        return Result<UserDto>.Success(new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.IsActive, user.WarehouseId, null, hasAcceptedTerms));
    }

    private async Task<bool> CheckHasAcceptedTermsAsync(int userId, CancellationToken cancellationToken)
    {
        return await _context.TermsAcceptances
            .AnyAsync(t => t.UserId == userId && t.TermsVersion == "1.0", cancellationToken);
    }
}
