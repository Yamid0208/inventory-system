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
    private static readonly string[] AllowedImageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
    private static readonly string[] AllowedImageMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

    private const long MaxExcelSizeBytes = 10 * 1024 * 1024; // 10 MB
    private const long MaxImageSizeBytes = 15 * 1024 * 1024; // 15 MB para imágenes y documentos PDF

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
        if (!IsValidFileSignature(stream, extension))
        {
            return BadRequest(new { detail = "La firma binaria del archivo no corresponde con un formato Excel o CSV válido y seguro." });
        }

        var rows = await _importService.ParseExcelAsync(stream, cancellationToken);
        return Ok(rows);
    }

    /// <summary>
    /// Procesa una fotografía o documento PDF de productos usando IA Multimodal (Google Gemini Vision & Document Understanding).
    /// </summary>
    [HttpPost("preview-image")]
    [HttpPost("preview-document")]
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
            return BadRequest(new { detail = "Debe suministrar un archivo de imagen o PDF válido." });
        }

        if (file.Length > MaxImageSizeBytes)
        {
            return BadRequest(new { detail = $"El archivo supera el tamaño máximo permitido de {MaxImageSizeBytes / (1024 * 1024)} MB." });
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(extension))
        {
            return BadRequest(new { detail = $"Formato de archivo no permitido. Solo se aceptan: {string.Join(", ", AllowedImageExtensions)}." });
        }

        var contentType = file.ContentType.ToLowerInvariant();
        if (contentType == "application/octet-stream" && extension == ".pdf")
        {
            contentType = "application/pdf";
        }

        if (!AllowedImageMimeTypes.Contains(contentType))
        {
            return BadRequest(new { detail = "Tipo MIME no válido. Debe ser JPEG, PNG, WebP o PDF (application/pdf)." });
        }

        try
        {
            using var stream = file.OpenReadStream();
            if (!IsValidFileSignature(stream, extension))
            {
                return BadRequest(new { detail = "La firma binaria del archivo no corresponde con una imagen o documento PDF válido y seguro." });
            }

            var rows = await _importService.ParseImageWithGeminiAsync(stream, contentType, cancellationToken);
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

    private static bool IsValidFileSignature(Stream stream, string extension)
    {
        if (stream.CanSeek)
        {
            stream.Seek(0, SeekOrigin.Begin);
        }

        var header = new byte[12];
        var bytesRead = stream.Read(header, 0, header.Length);

        if (stream.CanSeek)
        {
            stream.Seek(0, SeekOrigin.Begin);
        }

        if (bytesRead < 4) return false;

        return extension switch
        {
            ".png" => header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47,
            ".jpg" or ".jpeg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            ".pdf" => header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46,
            ".webp" => bytesRead >= 12 &&
                       header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 && // RIFF
                       header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50, // WEBP
            ".xlsx" => header[0] == 0x50 && header[1] == 0x4B && header[2] == 0x03 && header[3] == 0x04, // PK..
            ".xls" => header[0] == 0xD0 && header[1] == 0xCF && header[2] == 0x11 && header[3] == 0xE0,
            ".csv" => !(header[0] == 0x4D && header[1] == 0x5A) && // Not Windows MZ binary
                      !(header[0] == 0x7F && header[1] == 0x45 && header[2] == 0x4C && header[3] == 0x46), // Not Linux ELF binary
            _ => false
        };
    }
}
