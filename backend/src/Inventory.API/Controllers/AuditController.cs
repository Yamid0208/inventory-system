using Inventory.Application.Common.Models;
using Inventory.Application.Features.Audit.DTOs;
using Inventory.Application.Features.Audit.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin")]
public class AuditController : ControllerBase
{
    private readonly IAuditService _auditService;

    public AuditController(IAuditService auditService)
    {
        _auditService = auditService;
    }

    /// <summary>
    /// Consulta paginada del registro inmutable de auditoría del sistema con filtros de entidad, acción y fechas.
    /// </summary>
    [HttpGet("logs")]
    [ProducesResponseType(typeof(PagedResult<AuditLogDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<AuditLogDto>>> GetLogs(
        [FromQuery] AuditLogFilterRequest request,
        CancellationToken cancellationToken)
    {
        var logs = await _auditService.GetLogsAsync(request, cancellationToken);
        return Ok(logs);
    }

    /// <summary>
    /// Métricas ejecutivas del volumen de auditoría, eventos de hoy y principales entidades/acciones registradas.
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(AuditSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuditSummaryDto>> GetSummary(
        CancellationToken cancellationToken)
    {
        var summary = await _auditService.GetSummaryAsync(cancellationToken);
        return Ok(summary);
    }
}
