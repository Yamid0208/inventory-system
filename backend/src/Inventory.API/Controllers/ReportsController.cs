using Inventory.Application.Features.Reports.DTOs;
using Inventory.Application.Features.Reports.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ReportsController : BaseApiController
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
    public async Task<ActionResult<ReportsCatalogSummaryDto>> GetSummary(
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var summary = await _reportService.GetCatalogSummaryAsync(targetWarehouseId, cancellationToken);
        return Ok(summary);
    }

    /// <summary>
    /// Exportación del catálogo de productos en formato CSV estructurado (RFC 4180, UTF-8 BOM).
    /// </summary>
    [HttpGet("products/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportProductsCsv(
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var fileBytes = await _reportService.ExportProductsCsvAsync(targetWarehouseId, cancellationToken);
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
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var fileBytes = await _reportService.ExportInventoryKardexCsvAsync(startDate, endDate, targetWarehouseId, cancellationToken);
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
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var fileBytes = await _reportService.ExportSalesCsvAsync(startDate, endDate, targetWarehouseId, cancellationToken);
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
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var fileBytes = await _reportService.ExportPurchasesCsvAsync(startDate, endDate, targetWarehouseId, cancellationToken);
        var filename = $"reporte_compras_{DateTime.UtcNow:yyyyMMdd_HHmm}.csv";
        return File(fileBytes, "text/csv; charset=utf-8", filename);
    }

    /// <summary>
    /// Consulta tabular paginada de catálogo de productos y valuación de stock.
    /// </summary>
    [HttpGet("products/data")]
    [ProducesResponseType(typeof(PagedReportResultDto<ProductReportItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedReportResultDto<ProductReportItemDto>>> GetProductsData(
        [FromQuery] int? warehouseId,
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetProductsDataAsync(targetWarehouseId, searchTerm, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Consulta tabular paginada del Kardex y movimientos de inventario por rango de fechas.
    /// </summary>
    [HttpGet("inventory/data")]
    [ProducesResponseType(typeof(PagedReportResultDto<InventoryKardexReportItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedReportResultDto<InventoryKardexReportItemDto>>> GetInventoryKardexData(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetInventoryKardexDataAsync(startDate, endDate, targetWarehouseId, searchTerm, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Consulta tabular paginada de facturación y ventas por rango de fechas.
    /// </summary>
    [HttpGet("sales/data")]
    [ProducesResponseType(typeof(PagedReportResultDto<SalesReportItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedReportResultDto<SalesReportItemDto>>> GetSalesData(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetSalesDataAsync(startDate, endDate, targetWarehouseId, searchTerm, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Consulta tabular paginada de compras a proveedores por rango de fechas.
    /// </summary>
    [HttpGet("purchases/data")]
    [ProducesResponseType(typeof(PagedReportResultDto<PurchasesReportItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedReportResultDto<PurchasesReportItemDto>>> GetPurchasesData(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetPurchasesDataAsync(startDate, endDate, targetWarehouseId, searchTerm, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Consulta tabular paginada de productos con stock bajo o agotado.
    /// </summary>
    [HttpGet("low-stock/data")]
    [ProducesResponseType(typeof(PagedReportResultDto<LowStockReportItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedReportResultDto<LowStockReportItemDto>>> GetLowStockData(
        [FromQuery] int? warehouseId,
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetLowStockDataAsync(targetWarehouseId, searchTerm, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Métricas ejecutivas y KPIs de ventas con distribución por método de pago.
    /// </summary>
    [HttpGet("sales/summary-metrics")]
    [ProducesResponseType(typeof(SalesSummaryMetricsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SalesSummaryMetricsDto>> GetSalesSummaryMetrics(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetSalesSummaryMetricsAsync(startDate, endDate, targetWarehouseId, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Ranking de productos más y menos vendidos en el período.
    /// </summary>
    [HttpGet("sales/top-products")]
    [ProducesResponseType(typeof(IReadOnlyList<TopProductReportDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TopProductReportDto>>> GetTopProducts(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        [FromQuery] string? searchTerm,
        [FromQuery] int top = 10,
        [FromQuery] bool ascending = false,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetTopProductsAsync(startDate, endDate, targetWarehouseId, searchTerm, top, ascending, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Resumen de analítica de ventas con comparativa porcentual vs período anterior.
    /// </summary>
    [HttpGet("sales/analytics-summary")]
    [ProducesResponseType(typeof(SalesAnalyticsSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SalesAnalyticsSummaryDto>> GetSalesAnalyticsSummary(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetSalesAnalyticsSummaryAsync(startDate, endDate, targetWarehouseId, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Análisis de ventas agrupadas por categoría de producto.
    /// </summary>
    [HttpGet("sales/by-category")]
    [ProducesResponseType(typeof(IReadOnlyList<SalesByCategoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SalesByCategoryDto>>> GetSalesByCategory(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        [FromQuery] string? searchTerm,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetSalesByCategoryAsync(startDate, endDate, targetWarehouseId, searchTerm, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Exportación CSV de ventas por categoría.
    /// </summary>
    [HttpGet("sales/by-category/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportSalesByCategoryCsv(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var fileBytes = await _reportService.ExportSalesByCategoryCsvAsync(startDate, endDate, targetWarehouseId, cancellationToken);
        var filename = $"ventas_por_categoria_{DateTime.UtcNow:yyyyMMdd_HHmm}.csv";
        return File(fileBytes, "text/csv; charset=utf-8", filename);
    }

    /// <summary>
    /// Distribución de actividad comercial y transacciones por franja horaria (00:00 - 23:59).
    /// </summary>
    [HttpGet("sales/hourly-activity")]
    [ProducesResponseType(typeof(IReadOnlyList<HourlyActivityDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<HourlyActivityDto>>> GetSalesHourlyActivity(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetSalesHourlyActivityAsync(startDate, endDate, targetWarehouseId, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Exportación CSV de actividad horaria de ventas.
    /// </summary>
    [HttpGet("sales/hourly-activity/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportSalesHourlyActivityCsv(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var fileBytes = await _reportService.ExportSalesHourlyActivityCsvAsync(startDate, endDate, targetWarehouseId, cancellationToken);
        var filename = $"actividad_horaria_ventas_{DateTime.UtcNow:yyyyMMdd_HHmm}.csv";
        return File(fileBytes, "text/csv; charset=utf-8", filename);
    }

    /// <summary>
    /// Productividad, transacciones y ventas por empleado / vendedor.
    /// </summary>
    [HttpGet("sales/by-employee")]
    [ProducesResponseType(typeof(IReadOnlyList<SalesByEmployeeDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SalesByEmployeeDto>>> GetSalesByEmployee(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        [FromQuery] string? searchTerm,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetSalesByEmployeeAsync(startDate, endDate, targetWarehouseId, searchTerm, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Exportación CSV de rendimiento por empleado.
    /// </summary>
    [HttpGet("sales/by-employee/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportSalesByEmployeeCsv(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var fileBytes = await _reportService.ExportSalesByEmployeeCsvAsync(startDate, endDate, targetWarehouseId, cancellationToken);
        var filename = $"ventas_por_empleado_{DateTime.UtcNow:yyyyMMdd_HHmm}.csv";
        return File(fileBytes, "text/csv; charset=utf-8", filename);
    }

    /// <summary>
    /// Serie cronológica de ventas para análisis de tendencias comerciales.
    /// </summary>
    [HttpGet("sales/trends")]
    [ProducesResponseType(typeof(IReadOnlyList<SalesTrendDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SalesTrendDto>>> GetSalesTrends(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetSalesTrendsAsync(startDate, endDate, targetWarehouseId, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Reporte de Rentabilidad y Utilidad Bruta calculada a partir del Costo de Mercancía Vendida (CMV) histórico.
    /// </summary>
    [HttpGet("finance/profitability")]
    [ProducesResponseType(typeof(ProfitabilitySummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ProfitabilitySummaryDto>> GetProfitabilityReport(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetProfitabilityReportAsync(startDate, endDate, targetWarehouseId, searchTerm, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Exportación CSV del reporte de Rentabilidad y Utilidad Bruta.
    /// </summary>
    [HttpGet("finance/profitability/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportProfitabilityCsv(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var fileBytes = await _reportService.ExportProfitabilityCsvAsync(startDate, endDate, targetWarehouseId, cancellationToken);
        var filename = $"reporte_rentabilidad_{DateTime.UtcNow:yyyyMMdd_HHmm}.csv";
        return File(fileBytes, "text/csv; charset=utf-8", filename);
    }

    /// <summary>
    /// Reporte de Cierres de Caja POS y Conciliación (Efectivo físico esperado vs contado y pagos electrónicos).
    /// </summary>
    [HttpGet("cash-register/reconciliation")]
    [ProducesResponseType(typeof(CashRegisterReconciliationSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CashRegisterReconciliationSummaryDto>> GetCashRegisterReconciliation(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetCashRegisterReconciliationAsync(startDate, endDate, targetWarehouseId, searchTerm, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Exportación CSV de cierres y conciliación de caja POS.
    /// </summary>
    [HttpGet("cash-register/reconciliation/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportCashReconciliationCsv(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var fileBytes = await _reportService.ExportCashReconciliationCsvAsync(startDate, endDate, targetWarehouseId, cancellationToken);
        var filename = $"conciliacion_caja_{DateTime.UtcNow:yyyyMMdd_HHmm}.csv";
        return File(fileBytes, "text/csv; charset=utf-8", filename);
    }

    /// <summary>
    /// Reporte de Actividad y Auditoría cronológica de operaciones sensibles.
    /// </summary>
    [HttpGet("audit/activity")]
    [ProducesResponseType(typeof(PagedReportResultDto<AuditActivityReportItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedReportResultDto<AuditActivityReportItemDto>>> GetAuditActivity(
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] string? entityName,
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetAuditActivityAsync(startDate, endDate, entityName, searchTerm, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    // =========================================================================
    // 6. SUITE DE VALORACIÓN FINANCIERA Y PATRIMONIAL DE INVENTARIO
    // =========================================================================

    /// <summary>
    /// KPIs consolidados de valoración de inventario (costo, valor comercial, margen y stock estancado).
    /// </summary>
    [HttpGet("inventory/valuation-summary")]
    [ProducesResponseType(typeof(InventoryValuationSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<InventoryValuationSummaryDto>> GetInventoryValuationSummary(
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var summary = await _reportService.GetInventoryValuationSummaryAsync(targetWarehouseId, cancellationToken);
        return Ok(summary);
    }

    /// <summary>
    /// Desglose de capital inmovilizado y potencial comercial agrupado por categoría.
    /// </summary>
    [HttpGet("inventory/valuation-by-category")]
    [ProducesResponseType(typeof(IReadOnlyList<InventoryValuationByCategoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<InventoryValuationByCategoryDto>>> GetInventoryValuationByCategory(
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var list = await _reportService.GetInventoryValuationByCategoryAsync(targetWarehouseId, cancellationToken);
        return Ok(list);
    }

    /// <summary>
    /// Detalle paginado de productos con valoración financiera y clasificación ABC Pareto.
    /// </summary>
    [HttpGet("inventory/valuation-details")]
    [ProducesResponseType(typeof(PagedReportResultDto<InventoryValuationItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedReportResultDto<InventoryValuationItemDto>>> GetInventoryValuationDetails(
        [FromQuery] int? warehouseId,
        [FromQuery] int? categoryId,
        [FromQuery] string? abcClass,
        [FromQuery] bool? stagnantOnly,
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var result = await _reportService.GetInventoryValuationDetailsAsync(
            targetWarehouseId,
            categoryId,
            abcClass,
            stagnantOnly,
            searchTerm,
            pageNumber,
            pageSize,
            cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Exportación del reporte de valoración de inventario a CSV estructurado (RFC 4180 con UTF-8 BOM).
    /// </summary>
    [HttpGet("inventory/valuation/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportInventoryValuationCsv(
        [FromQuery] int? warehouseId,
        [FromQuery] int? categoryId,
        [FromQuery] string? abcClass,
        [FromQuery] bool? stagnantOnly,
        [FromQuery] string? searchTerm,
        CancellationToken cancellationToken = default)
    {
        var targetWarehouseId = ResolveTargetWarehouseId(warehouseId);
        var fileBytes = await _reportService.ExportInventoryValuationCsvAsync(
            targetWarehouseId,
            categoryId,
            abcClass,
            stagnantOnly,
            searchTerm,
            cancellationToken);
        var filename = $"valoracion_inventario_{DateTime.UtcNow:yyyyMMdd_HHmm}.csv";
        return File(fileBytes, "text/csv; charset=utf-8", filename);
    }

    private int? ResolveTargetWarehouseId(int? queryWarehouseId)
    {
        var role = GetCurrentUserRole();
        if (role == "SuperAdmin")
        {
            return queryWarehouseId;
        }

        if (role == "Warehouse" || role == "Seller")
        {
            var userWh = GetCurrentWarehouseId();
            if (userWh.HasValue && userWh.Value > 0)
            {
                return userWh.Value;
            }
        }

        return queryWarehouseId ?? GetCurrentWarehouseId();
    }
}
