using Inventory.Application.Common.Models;
using Inventory.Application.Features.CashRegister.DTOs;
using Inventory.Application.Features.CashRegister.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/cash-register")]
[Authorize]
public class CashRegisterController : BaseApiController
{
    private readonly ICashRegisterService _cashRegisterService;

    public CashRegisterController(ICashRegisterService cashRegisterService)
    {
        _cashRegisterService = cashRegisterService;
    }

    /// <summary>
    /// Obtiene la sesión de caja activa (abierta) del usuario autenticado.
    /// </summary>
    [HttpGet("current")]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(CashRegisterSessionDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CashRegisterSessionDto?>> GetCurrentSession(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId <= 0)
        {
            return Unauthorized();
        }

        var session = await _cashRegisterService.GetCurrentSessionAsync(userId, cancellationToken);
        return Ok(session);
    }

    /// <summary>
    /// Realiza la apertura de caja para el empleado autenticado.
    /// </summary>
    [HttpPost("open")]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(CashRegisterSessionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CashRegisterSessionDto>> OpenSession(
        [FromBody] OpenCashRegisterRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId <= 0)
        {
            return Unauthorized();
        }

        var session = await _cashRegisterService.OpenSessionAsync(request, userId, cancellationToken);
        return CreatedAtAction(nameof(GetSessionById), new { id = session.Id }, session);
    }

    /// <summary>
    /// Obtiene el resumen de arqueo de caja con el cálculo en vivo de efectivo esperado y ventas digitales.
    /// </summary>
    [HttpGet("{id:int}/audit")]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(CashRegisterAuditSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CashRegisterAuditSummaryDto>> GetAuditSummary(
        int id,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var role = GetCurrentUserRole();
        if (userId <= 0)
        {
            return Unauthorized();
        }

        var summary = await _cashRegisterService.GetAuditSummaryAsync(id, userId, role, cancellationToken);
        return Ok(summary);
    }

    /// <summary>
    /// Realiza el cierre definitivo de una sesión de caja registrando el conteo físico y la diferencia.
    /// </summary>
    [HttpPost("{id:int}/close")]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(CashRegisterSessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CashRegisterSessionDto>> CloseSession(
        int id,
        [FromBody] CloseCashRegisterRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId <= 0)
        {
            return Unauthorized();
        }

        var session = await _cashRegisterService.CloseSessionAsync(id, request, userId, cancellationToken);
        return Ok(session);
    }

    /// <summary>
    /// Registra un movimiento manual (ingreso extraordinario, egreso operativo o retiro de efectivo).
    /// </summary>
    [HttpPost("movements")]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(CashRegisterMovementDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CashRegisterMovementDto>> CreateMovement(
        [FromBody] CreateCashMovementRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId <= 0)
        {
            return Unauthorized();
        }

        var movement = await _cashRegisterService.CreateMovementAsync(request, userId, cancellationToken);
        return Created($"/api/v1/cash-register/sessions/{movement.CashRegisterSessionId}/movements", movement);
    }

    /// <summary>
    /// Consulta el historial paginado de sesiones de caja con filtros.
    /// </summary>
    [HttpGet("sessions")]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(PagedResult<CashRegisterSessionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<CashRegisterSessionDto>>> GetSessions(
        [FromQuery] CashRegisterFilterRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var role = GetCurrentUserRole();
        if (userId <= 0)
        {
            return Unauthorized();
        }

        var result = await _cashRegisterService.GetSessionsAsync(request, userId, role, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene el detalle de una sesión de caja histórica por ID.
    /// </summary>
    [HttpGet("sessions/{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(CashRegisterSessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CashRegisterSessionDto>> GetSessionById(
        int id,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var role = GetCurrentUserRole();
        if (userId <= 0)
        {
            return Unauthorized();
        }

        var session = await _cashRegisterService.GetSessionByIdAsync(id, userId, role, cancellationToken);
        return Ok(session);
    }

    /// <summary>
    /// Obtiene todos los movimientos financieros asociados a una sesión de caja.
    /// </summary>
    [HttpGet("sessions/{id:int}/movements")]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(IReadOnlyList<CashRegisterMovementDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<CashRegisterMovementDto>>> GetSessionMovements(
        int id,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var role = GetCurrentUserRole();
        if (userId <= 0)
        {
            return Unauthorized();
        }

        var movements = await _cashRegisterService.GetSessionMovementsAsync(id, userId, role, cancellationToken);
        return Ok(movements);
    }

    /// <summary>
    /// Obtiene los indicadores financieros y métricas consolidadas del panel de caja.
    /// </summary>
    [HttpGet("dashboard")]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(CashRegisterDashboardDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CashRegisterDashboardDto>> GetDashboard(
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var role = GetCurrentUserRole();
        if (userId <= 0)
        {
            return Unauthorized();
        }

        var effectiveWarehouseId = warehouseId ?? GetCurrentWarehouseId();
        var dashboard = await _cashRegisterService.GetDashboardAsync(userId, role, effectiveWarehouseId, cancellationToken);
        return Ok(dashboard);
    }
}
