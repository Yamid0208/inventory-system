using System.Security.Claims;
using Inventory.Application.Features.Auth.DTOs;
using Inventory.Application.Features.Auth.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private const string RefreshTokenCookieName = "refreshToken";

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [EnableRateLimiting("AuthLimiter")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = GetClientIp();
        var result = await _authService.LoginAsync(request, ipAddress, cancellationToken);

        if (!result.IsSuccess || result.Value == null)
        {
            return Unauthorized(new ProblemDetails
            {
                Title = "Error de autenticación",
                Detail = result.Error ?? "Credenciales incorrectas.",
                Status = StatusCodes.Status401Unauthorized
            });
        }

        SetRefreshTokenCookie(result.Value.RefreshToken, result.Value.ExpiresAt);

        return Ok(new
        {
            accessToken = result.Value.AccessToken,
            refreshToken = result.Value.RefreshToken,
            user = result.Value.User,
            expiresAt = result.Value.ExpiresAt
        });
    }

    public record RefreshTokenRequestDto(string? RefreshToken);

    [HttpPost("refresh")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto? request, CancellationToken cancellationToken)
    {
        string? refreshToken = null;

        // 1. Prioridad: Cookie HttpOnly
        if (Request.Cookies.TryGetValue(RefreshTokenCookieName, out var cookieToken) && !string.IsNullOrWhiteSpace(cookieToken))
        {
            refreshToken = cookieToken;
        }
        // 2. Fallback resiliente: Cabecera personalizada X-Refresh-Token (mitiga proxies que filtran cookies)
        else if (Request.Headers.TryGetValue("X-Refresh-Token", out var headerToken) && !string.IsNullOrWhiteSpace(headerToken))
        {
            refreshToken = headerToken.ToString();
        }
        // 3. Fallback: Cuerpo de la petición JSON
        else if (request != null && !string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            refreshToken = request.RefreshToken;
        }

        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return Unauthorized(new ProblemDetails
            {
                Title = "No autorizado",
                Detail = "No se proporcionó un token de refresco válido en la cookie, cabecera ni cuerpo.",
                Status = StatusCodes.Status401Unauthorized
            });
        }

        var ipAddress = GetClientIp();
        var result = await _authService.RefreshTokenAsync(refreshToken, ipAddress, cancellationToken);

        if (!result.IsSuccess || result.Value == null)
        {
            DeleteRefreshTokenCookie();
            return Unauthorized(new ProblemDetails
            {
                Title = "Sesión expirada o inválida",
                Detail = result.Error ?? "Token no válido.",
                Status = StatusCodes.Status401Unauthorized
            });
        }

        SetRefreshTokenCookie(result.Value.RefreshToken, result.Value.ExpiresAt);

        return Ok(new
        {
            accessToken = result.Value.AccessToken,
            refreshToken = result.Value.RefreshToken,
            user = result.Value.User,
            expiresAt = result.Value.ExpiresAt
        });
    }

    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequestDto? request, CancellationToken cancellationToken)
    {
        string? refreshToken = null;

        if (Request.Cookies.TryGetValue(RefreshTokenCookieName, out var cookieToken) && !string.IsNullOrWhiteSpace(cookieToken))
        {
            refreshToken = cookieToken;
        }
        else if (Request.Headers.TryGetValue("X-Refresh-Token", out var headerToken) && !string.IsNullOrWhiteSpace(headerToken))
        {
            refreshToken = headerToken.ToString();
        }
        else if (request != null && !string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            refreshToken = request.RefreshToken;
        }

        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            var ipAddress = GetClientIp();
            await _authService.RevokeTokenAsync(refreshToken, ipAddress, cancellationToken);
        }

        DeleteRefreshTokenCookie();

        return Ok(new { message = "Sesión cerrada exitosamente." });
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var result = await _authService.GetCurrentUserAsync(userId, cancellationToken);
        if (!result.IsSuccess || result.Value == null)
        {
            return NotFound(new ProblemDetails { Title = "Usuario no encontrado", Detail = result.Error });
        }

        return Ok(result.Value);
    }

    private void SetRefreshTokenCookie(string token, DateTimeOffset expiresAt)
    {
        var isSecure = Request.IsHttps || !HttpContext.Request.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase);
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = isSecure,
            SameSite = SameSiteMode.Lax,
            Expires = expiresAt.UtcDateTime,
            Path = "/"
        };

        Response.Cookies.Append(RefreshTokenCookieName, token, cookieOptions);
    }

    private void DeleteRefreshTokenCookie()
    {
        var isSecure = Request.IsHttps || !HttpContext.Request.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase);
        Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = isSecure,
            SameSite = SameSiteMode.Lax,
            Path = "/"
        });
    }

    private string? GetClientIp()
    {
        if (Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor))
        {
            return forwardedFor.FirstOrDefault()?.Split(',').FirstOrDefault()?.Trim();
        }
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
