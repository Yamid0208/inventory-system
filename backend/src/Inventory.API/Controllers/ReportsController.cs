using System.Security.Claims;
using Inventory.Application.Features.Reports.DTOs;
using Inventory.Application.Features.Reports.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportExportService _reportService;

    public ReportsController(IReportExportService reportService)
    {
        _reportService = reportService;
    }

    /// <summary>
    /// Resumen ejecutivo del catálogo de reportes exportables y volúmenes de datos.
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(ReportsCatalogSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ReportsCatalogSummaryDto>> GetSummary(CancellationToken cancellationToken)
    {
        var warehouseId = GetCurrentWarehouseId();
        var summary = await _reportService.GetCatalogSummaryAsync(warehouseId, cancellationToken);
        return Ok(summary);
    }

    /// <summary>
    /// Exportación del catálogo de productos en formato CSV estructurado (RFC 4180, UTF-8 BOM).
    /// </summary>
    [HttpGet("products/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportProductsCsv(CancellationToken cancellationToken)
    {
        var warehouseId = GetCurrentWarehouseId();
        var fileBytes = await _reportService.ExportProductsCsvAsync(warehouseId, cancellationToken);
        var filename = $"catalogo_productos_{DateTime.UtcNow:yyyyMMdd_HHmm}.csv";
        return File(fileBytes, "text/csv; charset=utf-8", filename);
    }

    /// <summary>
    /// Exportación del Kardex y movimientos de inventario en CSV estructurado.
    /// </summary>
    [HttpGet("inventory/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportInventoryCsv(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        CancellationToken cancellationToken)
    {
        var warehouseId = GetCurrentWarehouseId();
        var fileBytes = await _reportService.ExportInventoryKardexCsvAsync(startDate, endDate, warehouseId, cancellationToken);
        var filename = $"kardex_inventario_{DateTime.UtcNow:yyyyMMdd_HHmm}.csv";
        return File(fileBytes, "text/csv; charset=utf-8", filename);
    }

    /// <summary>
    /// Exportación de facturación y ventas en CSV estructurado.
    /// </summary>
    [HttpGet("sales/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportSalesCsv(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        CancellationToken cancellationToken)
    {
        var warehouseId = GetCurrentWarehouseId();
        var fileBytes = await _reportService.ExportSalesCsvAsync(startDate, endDate, warehouseId, cancellationToken);
        var filename = $"reporte_ventas_{DateTime.UtcNow:yyyyMMdd_HHmm}.csv";
        return File(fileBytes, "text/csv; charset=utf-8", filename);
    }

    /// <summary>
    /// Exportación de compras y abastecimiento en CSV estructurado.
    /// </summary>
    [HttpGet("purchases/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportPurchasesCsv(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        CancellationToken cancellationToken)
    {
        var warehouseId = GetCurrentWarehouseId();
        var fileBytes = await _reportService.ExportPurchasesCsvAsync(startDate, endDate, warehouseId, cancellationToken);
        var filename = $"reporte_compras_{DateTime.UtcNow:yyyyMMdd_HHmm}.csv";
        return File(fileBytes, "text/csv; charset=utf-8", filename);
    }

    private int? GetCurrentWarehouseId()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role == "SuperAdmin") return null;

        var whClaim = User.FindFirst("warehouseId")?.Value;
        return int.TryParse(whClaim, out var wid) && wid > 0 ? wid : null;
    }
}
