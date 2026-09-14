using Inventory.Application.Features.Settings.DTOs;
using Inventory.Application.Features.Settings.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly ICompanySettingsService _settingsService;

    public SettingsController(ICompanySettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    /// <summary>
    /// Obtiene los parámetros institucionales globales, datos fiscales y directrices de inventario.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(CompanySettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CompanySettingsDto>> GetSettings(CancellationToken cancellationToken)
    {
        var settings = await _settingsService.GetSettingsAsync(cancellationToken);
        return Ok(settings);
    }

    /// <summary>
    /// Actualiza los parámetros institucionales de la empresa (Requiere rol Administrador).
    /// </summary>
    [HttpPut]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(CompanySettingsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<CompanySettingsDto>> UpdateSettings(
        [FromBody] UpdateCompanySettingsRequest request,
        CancellationToken cancellationToken)
    {
        var userName = User.Identity?.Name ?? "Administrador";
        var updated = await _settingsService.UpdateSettingsAsync(request, userName, cancellationToken);
        return Ok(updated);
    }
}
