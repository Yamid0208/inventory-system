using System.Security.Claims;
using Inventory.Application.Features.Products.DTOs;
using Inventory.Application.Features.Products.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/products/import")]
[Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
public class ProductsImportController : BaseApiController
{
    private readonly IBulkProductImportService _importService;
    private static readonly string[] AllowedExcelExtensions = [".xlsx", ".xls", ".csv"];
    private static readonly string[] AllowedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private static readonly string[] AllowedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"];

    private const long MaxExcelSizeBytes = 10 * 1024 * 1024; // 10 MB
    private const long MaxImageSizeBytes = 5 * 1024 * 1024;   // 5 MB

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

        if (file.Length > MaxExcelSizeBytes)
        {
            return BadRequest(new { detail = $"El archivo supera el tamaño máximo permitido de {MaxExcelSizeBytes / (1024 * 1024)} MB." });
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExcelExtensions.Contains(extension))
        {
            return BadRequest(new { detail = $"Formato no permitido. Solo se aceptan extensiones: {string.Join(", ", AllowedExcelExtensions)}." });
        }

        using var stream = file.OpenReadStream();
        var rows = await _importService.ParseExcelAsync(stream, cancellationToken);
        return Ok(rows);
    }

    /// <summary>
    /// Procesa una fotografía o escaneo de tabla de productos usando IA Multimodal (Google Gemini Vision).
    /// </summary>
    [HttpPost("preview-image")]
    [EnableRateLimiting("AiImportLimiter")]
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

        if (file.Length > MaxImageSizeBytes)
        {
            return BadRequest(new { detail = $"La imagen supera el tamaño máximo permitido de {MaxImageSizeBytes / (1024 * 1024)} MB." });
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(extension))
        {
            return BadRequest(new { detail = $"Formato de imagen no permitido. Solo se aceptan: {string.Join(", ", AllowedImageExtensions)}." });
        }

        if (!AllowedImageMimeTypes.Contains(file.ContentType.ToLowerInvariant()))
        {
            return BadRequest(new { detail = "Tipo MIME de imagen no válido. Debe ser JPEG, PNG o WebP." });
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
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<BulkImportResultDto>> CommitImport(
        [FromBody] BulkImportRequest request,
        CancellationToken cancellationToken)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "1";
        int.TryParse(userIdStr, out var userId);
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "admin@sgi.local";

        if (!request.WarehouseId.HasValue || request.WarehouseId.Value <= 0)
        {
            var userWh = GetCurrentWarehouseId();
            if (userWh.HasValue && userWh.Value > 0)
            {
                request.WarehouseId = userWh.Value;
            }
            else
            {
                var allowed = await GetAuthorizedWarehouseIdsAsync(cancellationToken);
                if (allowed.Count > 0)
                {
                    request.WarehouseId = allowed[0];
                }
            }
        }

        if (!IsSuperAdmin() && request.WarehouseId.HasValue)
        {
            var allowedWarehouses = await GetAuthorizedWarehouseIdsAsync(cancellationToken);
            if (allowedWarehouses.Count > 0 && !allowedWarehouses.Contains(request.WarehouseId.Value))
            {
                return Forbid();
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
