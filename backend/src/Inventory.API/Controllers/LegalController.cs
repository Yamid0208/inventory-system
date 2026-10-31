using System.Security.Claims;
using Inventory.Application.Features.Legal.DTOs;
using Inventory.Application.Features.Legal.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class LegalController : ControllerBase
{
    private readonly ILegalService _legalService;

    public LegalController(ILegalService legalService)
    {
        _legalService = legalService;
    }

    [HttpGet("status")]
    [Authorize]
    [ProducesResponseType(typeof(TermsStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetStatus(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new ProblemDetails
            {
                Title = "No autorizado",
                Detail = "No se pudo identificar la cuenta del usuario solicitante.",
                Status = StatusCodes.Status401Unauthorized
            });
        }

        var status = await _legalService.GetConsentStatusAsync(userId.Value, cancellationToken);
        return Ok(status);
    }

    [HttpGet("documents")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LegalDocumentsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDocuments(CancellationToken cancellationToken)
    {
        var docs = await _legalService.GetDocumentsAsync(cancellationToken);
        return Ok(docs);
    }

    [HttpPost("accept")]
    [Authorize]
    [ProducesResponseType(typeof(LegalConsentResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> AcceptTerms([FromBody] AcceptTermsRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new ProblemDetails
            {
                Title = "No autorizado",
                Detail = "No se pudo identificar la cuenta del usuario solicitante.",
                Status = StatusCodes.Status401Unauthorized
            });
        }

        var ipAddress = GetClientIp() ?? "127.0.0.1";
        var userAgent = Request.Headers.UserAgent.ToString();

        var result = await _legalService.AcceptTermsAsync(userId.Value, request, ipAddress, userAgent, cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Error al registrar consentimiento",
                Detail = result.Error,
                Status = StatusCodes.Status400BadRequest
            });
        }

        return Ok(result.Value);
    }

    [HttpGet("audit-records")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    [ProducesResponseType(typeof(IReadOnlyList<TermsAcceptanceRecordDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAuditRecords(CancellationToken cancellationToken)
    {
        var records = await _legalService.GetAuditRecordsAsync(cancellationToken);
        return Ok(records);
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(userIdClaim, out var userId) ? userId : null;
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

