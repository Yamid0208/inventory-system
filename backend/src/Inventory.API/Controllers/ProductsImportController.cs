using System.Security.Claims;
using Inventory.Application.Features.Products.DTOs;
using Inventory.Application.Features.Products.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/products/import")]
[Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
public class ProductsImportController : ControllerBase
{
    private readonly IBulkProductImportService _importService;

    public ProductsImportController(IBulkProductImportService importService)
    {
        _importService = importService;
    }

    /// <summary>
    /// Descarga la plantilla oficial en formato Excel (.xlsx) con columnas y formatos predefinidos.
    /// </summary>
    [HttpGet("template")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> DownloadTemplate(CancellationToken cancellationToken)
    {
        var fileBytes = await _importService.GenerateExcelTemplateAsync(cancellationToken);
        return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Plantilla_Carga_Productos.xlsx");
    }

    /// <summary>
    /// Analiza un archivo Excel (.xlsx) o CSV y extrae los productos en estado borrador (staging) para revisión.
    /// </summary>
    [HttpPost("preview-excel")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(List<ProductImportRowDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<ProductImportRowDto>>> PreviewExcel(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { detail = "Debe suministrar un archivo válido." });
        }

        using var stream = file.OpenReadStream();
        var rows = await _importService.ParseExcelAsync(stream, cancellationToken);
        return Ok(rows);
    }

    /// <summary>
    /// Procesa una fotografía o escaneo de tabla de productos usando IA Multimodal (Google Gemini Vision).
    /// </summary>
    [HttpPost("preview-image")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(List<ProductImportRowDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<ProductImportRowDto>>> PreviewImage(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { detail = "Debe suministrar una imagen válida." });
        }

        try
        {
            using var stream = file.OpenReadStream();
            var rows = await _importService.ParseImageWithGeminiAsync(stream, file.ContentType, cancellationToken);
            return Ok(rows);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { detail = ex.Message });
        }
    }

    /// <summary>
    /// Confirma y persiste atómicamente la lista de productos validados e impacta el stock en el Kardex.
    /// </summary>
    [HttpPost("commit")]
    [ProducesResponseType(typeof(BulkImportResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BulkImportResultDto>> CommitImport(
        [FromBody] BulkImportRequest request,
        CancellationToken cancellationToken)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "1";
        int.TryParse(userIdStr, out var userId);
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "admin@sgi.local";

        if (!request.WarehouseId.HasValue || request.WarehouseId.Value <= 0)
        {
            var userWh = User.FindFirstValue("WarehouseId");
            if (int.TryParse(userWh, out var wh) && wh > 0)
            {
                request.WarehouseId = wh;
            }
        }

        var result = await _importService.CommitBulkImportAsync(request, userId, userEmail, cancellationToken);
        if (result.ErrorCount > 0 && result.TotalProcessed == 0)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }
}
