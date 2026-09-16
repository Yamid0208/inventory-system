using System.Security.Claims;
using Inventory.Application.Common.Models;
using Inventory.Application.Features.Customers.DTOs;
using Inventory.Application.Features.Customers.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class CustomersController : BaseApiController
{
    private readonly ICustomerService _customerService;

    public CustomersController(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    /// <summary>
    /// Consulta paginada del directorio comercial de clientes con búsqueda y filtros de estado. Accesible para todas las sedes del almacén.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(PagedResult<CustomerDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<CustomerDto>>> GetCustomers(
        [FromQuery] CustomerFilterRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _customerService.GetCustomersAsync(request, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Métricas consolidadas de clientes totales, activos e inactivos.
    /// </summary>
    [HttpGet("summary")]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(CustomerSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CustomerSummaryDto>> GetSummary(
        [FromQuery] bool? onlyMine,
        CancellationToken cancellationToken)
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(idClaim, out var currentUserId);
        var email = User.FindFirst(ClaimTypes.Email)?.Value;

        int? filterUserId = (onlyMine == true || email == "demo.limpio@sgi.local") ? currentUserId : null;
        var summary = await _customerService.GetSummaryAsync(filterUserId, cancellationToken);
        return Ok(summary);
    }

    /// <summary>
    /// Obtiene el detalle comercial de un cliente por su identificador único.
    /// </summary>
    [HttpGet("{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(CustomerDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerDto>> GetCustomerById(int id, CancellationToken cancellationToken)
    {
        var customer = await _customerService.GetCustomerByIdAsync(id, cancellationToken);
        return Ok(customer);
    }

    /// <summary>
    /// Registra un nuevo cliente o contacto comercial en el sistema.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(CustomerDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CustomerDto>> CreateCustomer(
        [FromBody] CreateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(idClaim, out var currentUserId);
        request = request with { UserId = currentUserId };

        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "SuperAdmin" && !request.WarehouseId.HasValue)
        {
            request = request with { WarehouseId = GetCurrentWarehouseId() };
        }

        var created = await _customerService.CreateCustomerAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetCustomerById), new { id = created.Id }, created);
    }

    /// <summary>
    /// Actualiza la información fiscal y comercial de un cliente existente.
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(CustomerDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CustomerDto>> UpdateCustomer(
        int id,
        [FromBody] UpdateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await _customerService.UpdateCustomerAsync(id, request, cancellationToken);
        return Ok(updated);
    }

    /// <summary>
    /// Alterna el estado activo/inactivo de un cliente comercial.
    /// </summary>
    [HttpPatch("{id:int}/toggle-status")]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(CustomerDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerDto>> ToggleStatus(int id, CancellationToken cancellationToken)
    {
        var updated = await _customerService.ToggleStatusAsync(id, cancellationToken);
        return Ok(updated);
    }

    /// <summary>
    /// Realiza la baja lógica de un cliente comercial.
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCustomer(int id, CancellationToken cancellationToken)
    {
        await _customerService.DeleteCustomerAsync(id, cancellationToken);
        return NoContent();
    }
}
