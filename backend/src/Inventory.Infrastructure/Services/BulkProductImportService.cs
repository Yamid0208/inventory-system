using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ClosedXML.Excel;
using Inventory.Application.Features.Products.DTOs;
using Inventory.Application.Features.Products.Services;
using Inventory.Domain.Entities;
using Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Inventory.Infrastructure.Services;

public class BulkProductImportService : IBulkProductImportService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<BulkProductImportService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public BulkProductImportService(
        ApplicationDbContext context,
        IConfiguration configuration,
        ILogger<BulkProductImportService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<byte[]> GenerateExcelTemplateAsync(CancellationToken cancellationToken = default)
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Productos");

        // Encabezados
        var headers = new[]
        {
            "SKU*", "Nombre*", "Categoría*", "Proveedor",
            "Precio Compra*", "Precio Venta*", "Stock Inicial*", "Stock Mínimo", "Descripción"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            var cell = worksheet.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromArgb(15, 23, 42); // Slate-900
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        // Filas de ejemplo
        var examples = new[]
        {
            new object[] { "PROD-001", "Taladro Percutor 1/2", "Herramientas", "Ferretería Central", 120000, 165000, 25, 5, "Potencia 650W con velocidad variable" },
            new object[] { "PROD-002", "Caja Destornilladores x6", "Herramientas", "Ferretería Central", 35000, 52000, 50, 10, "Punta imantada en cromo vanadio" },
            new object[] { "PROD-003", "Pintura Blanco Nieve 1 Gal", "Pinturas", "Distribuidora Color", 65000, 95000, 15, 4, "Lavable acabado mate" }
        };

        for (int r = 0; r < examples.Length; r++)
        {
            for (int c = 0; c < examples[r].Length; c++)
            {
                worksheet.Cell(r + 2, c + 1).Value = XLCellValue.FromObject(examples[r][c]);
            }
        }

        // Formatos
        worksheet.Column(5).Style.NumberFormat.Format = "$#,##0.00";
        worksheet.Column(6).Style.NumberFormat.Format = "$#,##0.00";
        worksheet.Column(7).Style.NumberFormat.Format = "#,##0";
        worksheet.Column(8).Style.NumberFormat.Format = "#,##0";

        worksheet.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<List<ProductImportRowDto>> ParseExcelAsync(Stream fileStream, CancellationToken cancellationToken = default)
    {
        var result = new List<ProductImportRowDto>();

        using var workbook = new XLWorkbook(fileStream);
        var worksheet = workbook.Worksheets.FirstOrDefault();
        if (worksheet == null)
        {
            return result;
        }

        var rows = worksheet.RangeUsed()?.RowsUsed()?.Skip(1); // Omitir encabezado
        if (rows == null)
        {
            return result;
        }

        int rowNum = 2;
        var rawRows = new List<(IXLRangeRow row, int rowNum, string sku, string name, string category, string? supplier, string? purchasePriceStr, string? salePriceStr, string? stockStr, string? minStockStr, string? description)>();
        var batchSkus = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in rows)
        {
            var sku = row.Cell(1).GetString()?.Trim() ?? string.Empty;
            var name = row.Cell(2).GetString()?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(sku) && string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            if (!string.IsNullOrWhiteSpace(sku))
            {
                batchSkus.Add(sku.ToUpperInvariant());
            }

            rawRows.Add((
                row,
                rowNum++,
                sku,
                name,
                row.Cell(3).GetString()?.Trim() ?? string.Empty,
                row.Cell(4).GetString()?.Trim(),
                row.Cell(5).GetString()?.Trim(),
                row.Cell(6).GetString()?.Trim(),
                row.Cell(7).GetString()?.Trim(),
                row.Cell(8).GetString()?.Trim(),
                row.Cell(9).GetString()?.Trim()
            ));
        }

        // PERF-002: Consultar ÚNICAMENTE los SKUs presentes en el lote importado, no todo el catálogo
        var existingSkus = batchSkus.Count > 0
            ? (await _context.Products
                .AsNoTracking()
                .Where(p => batchSkus.Contains(p.Sku.ToUpper()) && !p.IsDeleted)
                .Select(p => p.Sku.ToUpper())
                .ToListAsync(cancellationToken))
                .ToHashSet(StringComparer.OrdinalIgnoreCase)
            : new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var skusInBatch = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var raw in rawRows)
        {
            var item = new ProductImportRowDto
            {
                RowNumber = raw.rowNum,
                Sku = raw.sku,
                Name = raw.name,
                CategoryName = raw.category,
                SupplierName = string.IsNullOrWhiteSpace(raw.supplier) ? null : raw.supplier,
                Description = string.IsNullOrWhiteSpace(raw.description) ? null : raw.description
            };

            // Parseo de números tolerante a formatos con moneda o comas
            if (TryExtractDecimal(raw.purchasePriceStr, out var pPrice) || raw.row.Cell(5).TryGetValue(out pPrice))
            {
                item.PurchasePrice = pPrice;
            }
            else
            {
                item.ValidationErrors.Add("Precio de compra inválido.");
            }

            if (TryExtractDecimal(raw.salePriceStr, out var sPrice) || raw.row.Cell(6).TryGetValue(out sPrice))
            {
                item.SalePrice = sPrice;
            }
            else
            {
                item.ValidationErrors.Add("Precio de venta inválido.");
            }

            if (TryExtractInt(raw.stockStr, out var stock) || raw.row.Cell(7).TryGetValue(out stock))
            {
                item.InitialStock = stock;
            }
            else
            {
                item.ValidationErrors.Add("Stock inicial inválido.");
            }

            if (TryExtractInt(raw.minStockStr, out var minStock) || raw.row.Cell(8).TryGetValue(out minStock))
            {
                item.MinimumStock = minStock > 0 ? minStock : 5;
            }
            else
            {
                item.MinimumStock = 5;
            }

            // Sanitizaciones y defaults tolerantes
            if (string.IsNullOrWhiteSpace(item.CategoryName))
            {
                item.CategoryName = "General";
            }

            if (item.PurchasePrice < 0) item.PurchasePrice = 0;

            if (item.SalePrice <= 0 || item.SalePrice < item.PurchasePrice)
            {
                item.SalePrice = item.PurchasePrice > 0 ? Math.Round(item.PurchasePrice * 1.3m, 2) : 1000m;
            }

            if (item.InitialStock < 0) item.InitialStock = 0;

            // Validaciones de negocio
            if (string.IsNullOrWhiteSpace(item.Sku)) item.ValidationErrors.Add("El SKU es obligatorio.");
            if (string.IsNullOrWhiteSpace(item.Name)) item.ValidationErrors.Add("El nombre es obligatorio.");

            if (!string.IsNullOrWhiteSpace(item.Sku))
            {
                var normalizedSku = item.Sku.Trim().ToUpperInvariant();
                if (!skusInBatch.Add(normalizedSku))
                {
                    item.ValidationErrors.Add($"El SKU '{item.Sku}' está duplicado en el archivo.");
                }
                else if (existingSkus.Contains(normalizedSku))
                {
                    item.IsExisting = true;
                    item.ValidationErrors.Add($"El SKU '{item.Sku}' ya existe en el catálogo (se actualizará precio/stock si confirma).");
                }
            }

            item.IsValid = item.ValidationErrors.Count == 0 || (item.IsExisting && item.ValidationErrors.Count == 1);
            result.Add(item);
        }

        return result;
    }

    public async Task<List<ProductImportRowDto>> ParseImageWithGeminiAsync(Stream imageStream, string mimeType, CancellationToken cancellationToken = default)
    {
        var apiKey = _configuration["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "TU_API_KEY_AQUI")
        {
            apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        }

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "TU_API_KEY_AQUI")
        {
            throw new InvalidOperationException("Clave de API de Gemini no configurada. Agrega tu clave en Gemini:ApiKey en appsettings.Development.json o variable de entorno GEMINI_API_KEY.");
        }

        var configuredModel = _configuration["Gemini:Model"] ?? "gemini-3.5-flash-lite";
        var candidateModels = new[] { configuredModel, "gemini-3.5-flash-lite", "gemini-3.8-flash" }
            .Where(m => !string.IsNullOrWhiteSpace(m))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        using var memoryStream = new MemoryStream();
        await imageStream.CopyToAsync(memoryStream, cancellationToken);
        var base64Image = Convert.ToBase64String(memoryStream.ToArray());

        var prompt = @"Analiza esta imagen que contiene una tabla de inventario o lista de productos.
Extrae los productos en un array JSON con los siguientes campos estrictos:
- sku (string, si no tiene inventa uno consecutivo como PROD-001)
- name (string, nombre del producto)
- categoryName (string, si no está clasificado pon 'General')
- supplierName (string o null)
- purchasePrice (number, costo de compra o adquisición)
- salePrice (number, precio venta público)
- initialStock (integer, cantidad de inventario encontrada)
- minimumStock (integer, por defecto 5 si no se especifica)
- description (string o null)

Responde ÚNICAMENTE con el bloque JSON crudo sin bloques markdown ```json ... ```";

        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(45);

        HttpResponseMessage? response = null;
        string? respString = null;

        // Intento 1: API Moderna de Interacciones con modelos candidatos
        foreach (var candidateModel in candidateModels)
        {
            try
            {
                var interactionsUrl = $"https://generativelanguage.googleapis.com/v1beta/interactions?key={apiKey}";
                var interactionsBody = new
                {
                    model = candidateModel,
                    input = new object[]
                    {
                        new { type = "text", text = prompt },
                        new { type = "image", data = base64Image, mime_type = string.IsNullOrWhiteSpace(mimeType) ? "image/jpeg" : mimeType }
                    }
                };

                var intContent = new StringContent(JsonSerializer.Serialize(interactionsBody), Encoding.UTF8, "application/json");
                response = await client.PostAsync(interactionsUrl, intContent, cancellationToken);
                if (response.IsSuccessStatusCode)
                {
                    respString = await response.Content.ReadAsStringAsync(cancellationToken);
                    break;
                }
                else
                {
                    var err = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogWarning("Modelo {Model} en Interactions retornó {Status}: {Err}", candidateModel, response.StatusCode, err);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Excepción con modelo {Model} en Interactions API", candidateModel);
            }
        }

        // Intento 2: Fallback a generateContent si interactions no fue exitoso
        if (respString == null)
        {
            var fallbackUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{configuredModel}:generateContent?key={apiKey}";
            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new { text = prompt },
                            new
                            {
                                inline_data = new
                                {
                                    mime_type = string.IsNullOrWhiteSpace(mimeType) ? "image/jpeg" : mimeType,
                                    data = base64Image
                                }
                            }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.1,
                    response_mime_type = "application/json"
                }
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            response = await client.PostAsync(fallbackUrl, jsonContent, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Error al invocar Gemini API: {Err}", err);
                throw new InvalidOperationException($"Error comunicándose con el servicio de Inteligencia Artificial: {response.StatusCode}");
            }

            respString = await response.Content.ReadAsStringAsync(cancellationToken);
        }

        string? candidateText = null;
        using (var doc = JsonDocument.Parse(respString))
        {
            if (doc.RootElement.TryGetProperty("steps", out var steps))
            {
                foreach (var step in steps.EnumerateArray())
                {
                    if (step.TryGetProperty("type", out var typeEl) && typeEl.GetString() == "model_output")
                    {
                        if (step.TryGetProperty("content", out var contents))
                        {
                            foreach (var c in contents.EnumerateArray())
                            {
                                if (c.TryGetProperty("type", out var cType) && cType.GetString() == "text")
                                {
                                    candidateText = c.GetProperty("text").GetString();
                                    break;
                                }
                            }
                        }
                    }
                    if (!string.IsNullOrWhiteSpace(candidateText)) break;
                }
            }
            else if (doc.RootElement.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
            {
                candidateText = candidates[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();
            }
        }

        if (string.IsNullOrWhiteSpace(candidateText))
        {
            return new List<ProductImportRowDto>();
        }

        // Limpiar backticks si el modelo los adjuntó
        candidateText = candidateText.Trim();
        if (candidateText.StartsWith("```json")) candidateText = candidateText.Substring(7);
        if (candidateText.StartsWith("```")) candidateText = candidateText.Substring(3);
        if (candidateText.EndsWith("```")) candidateText = candidateText.Substring(0, candidateText.Length - 3);
        candidateText = candidateText.Trim();

        var extractedItems = JsonSerializer.Deserialize<List<ProductImportRowDto>>(candidateText, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? new List<ProductImportRowDto>();

        int rowNum = 1;
        var existingSkus = await _context.Products.Select(p => p.Sku.ToUpper()).ToListAsync(cancellationToken);

        foreach (var item in extractedItems)
        {
            item.RowNumber = rowNum++;
            item.ValidationErrors = new List<string>();

            if (string.IsNullOrWhiteSpace(item.Sku)) item.Sku = $"AI-{rowNum:D3}";
            if (string.IsNullOrWhiteSpace(item.Name)) item.ValidationErrors.Add("Nombre no detectado.");
            if (string.IsNullOrWhiteSpace(item.CategoryName)) item.CategoryName = "General";
            if (item.PurchasePrice < 0) item.PurchasePrice = 0;
            if (item.SalePrice <= 0 || item.SalePrice < item.PurchasePrice)
            {
                item.SalePrice = item.PurchasePrice > 0 ? Math.Round(item.PurchasePrice * 1.3m, 2) : 1000m;
            }
            if (item.InitialStock < 0) item.InitialStock = 0;
            if (item.MinimumStock <= 0) item.MinimumStock = 5;

            var normalizedSku = item.Sku.Trim().ToUpperInvariant();
            if (existingSkus.Contains(normalizedSku))
            {
                item.IsExisting = true;
                item.ValidationErrors.Add($"El SKU '{item.Sku}' ya existe en el sistema.");
            }

            item.IsValid = item.ValidationErrors.Count == 0 || (item.IsExisting && item.ValidationErrors.Count == 1);
        }

        return extractedItems;
    }

    public async Task<BulkImportResultDto> CommitBulkImportAsync(BulkImportRequest request, int userId, string userEmail, CancellationToken cancellationToken = default)
    {
        var result = new BulkImportResultDto();

        var items = (request.Products != null && request.Products.Count > 0) ? request.Products : request.Items;
        if (items == null || items.Count == 0)
        {
            result.Messages.Add("No hay elementos para importar.");
            return result;
        }

        var updateExisting = request.UpdateExisting || request.UpdateExistingProducts;

        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                // PERF-003: Categorías al vuelo en lote (un solo SaveChanges)
                var categoryNames = items
                    .Select(i => string.IsNullOrWhiteSpace(i.CategoryName) ? "General" : i.CategoryName.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                var existingCategories = await _context.Categories
                    .Where(c => !c.IsDeleted)
                    .ToListAsync(cancellationToken);

                var categoryMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                bool hasNewCategories = false;
                foreach (var catName in categoryNames)
                {
                    var found = existingCategories.FirstOrDefault(c => c.Name.Equals(catName, StringComparison.OrdinalIgnoreCase));
                    if (found != null)
                    {
                        categoryMap[catName] = found.Id;
                    }
                    else
                    {
                        var newCat = new Category(catName, $"Categoría autogenerada en carga masiva", warehouseId: request.WarehouseId);
                        _context.Categories.Add(newCat);
                        hasNewCategories = true;
                    }
                }

                if (hasNewCategories)
                {
                    await _context.SaveChangesAsync(cancellationToken);
                    var refreshedCategories = await _context.Categories
                        .Where(c => !c.IsDeleted)
                        .ToListAsync(cancellationToken);
                    foreach (var cat in refreshedCategories)
                    {
                        categoryMap[cat.Name] = cat.Id;
                    }
                }

                // Proveedor por defecto si no existe
                var defaultSupplier = await _context.Suppliers.FirstOrDefaultAsync(s => !s.IsDeleted, cancellationToken);
                if (defaultSupplier == null)
                {
                    defaultSupplier = new Supplier("Proveedor General", "900000000-1", contactName: "General", email: "contacto@general.com", warehouseId: request.WarehouseId);
                    _context.Suppliers.Add(defaultSupplier);
                    await _context.SaveChangesAsync(cancellationToken);
                }

                // PERF-003: Proveedores al vuelo en lote
                var supplierNames = items
                    .Where(i => !string.IsNullOrWhiteSpace(i.SupplierName))
                    .Select(i => i.SupplierName!.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                var existingSuppliers = await _context.Suppliers
                    .Where(s => !s.IsDeleted)
                    .ToListAsync(cancellationToken);

                var supplierMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                bool hasNewSuppliers = false;
                foreach (var sName in supplierNames)
                {
                    var found = existingSuppliers.FirstOrDefault(s => s.Name.Equals(sName, StringComparison.OrdinalIgnoreCase));
                    if (found != null)
                    {
                        supplierMap[sName] = found.Id;
                    }
                    else
                    {
                        var randomNit = $"{Random.Shared.Next(10000000, 99999999)}-{Random.Shared.Next(0, 9)}";
                        var sup = new Supplier(sName, randomNit, contactName: sName, email: $"contacto@{Guid.NewGuid().ToString()[..6]}.com", warehouseId: request.WarehouseId);
                        _context.Suppliers.Add(sup);
                        hasNewSuppliers = true;
                    }
                }

                if (hasNewSuppliers)
                {
                    await _context.SaveChangesAsync(cancellationToken);
                    var refreshedSuppliers = await _context.Suppliers
                        .Where(s => !s.IsDeleted)
                        .ToListAsync(cancellationToken);
                    foreach (var s in refreshedSuppliers)
                    {
                        supplierMap[s.Name] = s.Id;
                    }
                }

                // PERF-003: Pre-cargar en UNA sola consulta los productos existentes en el lote (elimina N+1)
                var allSkusInBatch = items
                    .Where(i => !string.IsNullOrWhiteSpace(i.Sku))
                    .Select(i => i.Sku.Trim().ToUpperInvariant())
                    .Distinct()
                    .ToList();

                var existingProducts = allSkusInBatch.Count > 0
                    ? await _context.Products
                        .Where(p => allSkusInBatch.Contains(p.Sku.ToUpper()) && !p.IsDeleted)
                        .ToListAsync(cancellationToken)
                    : new List<Product>();

                var productMap = existingProducts.ToDictionary(p => p.Sku.Trim().ToUpperInvariant(), StringComparer.OrdinalIgnoreCase);

                var newProductsWithStock = new List<(Product Product, int Stock, decimal PurchasePrice)>();
                var updatedMovements = new List<InventoryMovement>();

                foreach (var item in items)
                {
                    if (string.IsNullOrWhiteSpace(item.Name) && string.IsNullOrWhiteSpace(item.Sku)) continue;

                    if (string.IsNullOrWhiteSpace(item.Sku))
                    {
                        item.Sku = $"PROD-{Guid.NewGuid().ToString()[..6].ToUpper()}";
                    }

                    if (string.IsNullOrWhiteSpace(item.Name))
                    {
                        item.Name = $"Producto {item.Sku}";
                    }

                    var catName = string.IsNullOrWhiteSpace(item.CategoryName) ? "General" : item.CategoryName.Trim();
                    if (!categoryMap.TryGetValue(catName, out var catId))
                    {
                        catId = categoryMap.Values.FirstOrDefault();
                    }

                    var supplierId = defaultSupplier.Id;
                    if (!string.IsNullOrWhiteSpace(item.SupplierName) && supplierMap.TryGetValue(item.SupplierName.Trim(), out var sId))
                    {
                        supplierId = sId;
                    }

                    if (item.PurchasePrice < 0) item.PurchasePrice = 0;
                    if (item.SalePrice <= 0 || item.SalePrice < item.PurchasePrice)
                    {
                        item.SalePrice = item.PurchasePrice > 0 ? Math.Round(item.PurchasePrice * 1.3m, 2) : 1000m;
                    }
                    if (item.InitialStock < 0) item.InitialStock = 0;
                    if (item.MinimumStock <= 0) item.MinimumStock = 5;

                    var normalizedSku = item.Sku.Trim().ToUpperInvariant();

                    if (productMap.TryGetValue(normalizedSku, out var existingProduct))
                    {
                        if (updateExisting)
                        {
                            existingProduct.Update(
                                name: string.IsNullOrWhiteSpace(item.Name) ? existingProduct.Name : item.Name,
                                categoryId: catId,
                                supplierId: supplierId,
                                purchasePrice: item.PurchasePrice,
                                salePrice: item.SalePrice,
                                minimumStock: item.MinimumStock > 0 ? item.MinimumStock : existingProduct.MinimumStock,
                                description: item.Description ?? existingProduct.Description,
                                imageUrl: existingProduct.ImageUrl
                            );

                            if (item.InitialStock > 0)
                            {
                                var prevStock = existingProduct.CurrentStock;
                                existingProduct.UpdateStock(item.InitialStock);
                                
                                var movement = new InventoryMovement(
                                    movementNumber: $"MOV-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString()[..6].ToUpper()}",
                                    productId: existingProduct.Id,
                                    type: Domain.Enums.MovementType.AdjustmentIn,
                                    quantityDelta: item.InitialStock,
                                    previousStock: prevStock,
                                    newStock: existingProduct.CurrentStock,
                                    unitPrice: item.PurchasePrice,
                                    userId: userId,
                                    reference: "CARGA-MASIVA",
                                    notes: "Carga Masiva (Actualización de Stock)",
                                    warehouseId: request.WarehouseId ?? existingProduct.WarehouseId
                                );
                                updatedMovements.Add(movement);
                            }
                            result.ProductsUpdated++;
                        }
                    }
                    else
                    {
                        var newProduct = new Product(
                            sku: item.Sku,
                            name: item.Name,
                            categoryId: catId,
                            supplierId: supplierId,
                            purchasePrice: item.PurchasePrice,
                            salePrice: item.SalePrice,
                            minimumStock: item.MinimumStock > 0 ? item.MinimumStock : 5,
                            description: item.Description,
                            warehouseId: request.WarehouseId
                        );

                        if (item.InitialStock > 0)
                        {
                            newProduct.UpdateStock(item.InitialStock);
                        }

                        _context.Products.Add(newProduct);
                        productMap[normalizedSku] = newProduct;

                        if (item.InitialStock > 0)
                        {
                            newProductsWithStock.Add((newProduct, item.InitialStock, item.PurchasePrice));
                        }

                        result.ProductsCreated++;
                    }

                    result.TotalProcessed++;
                }

                // PERF-003: Persistir todos los productos insertados y actualizados en una sola operación atómica
                await _context.SaveChangesAsync(cancellationToken);

                // Crear los movimientos de inventario ahora que los nuevos productos tienen Id generado
                foreach (var (newProd, stock, price) in newProductsWithStock)
                {
                    var movement = new InventoryMovement(
                        movementNumber: $"MOV-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString()[..6].ToUpper()}",
                        productId: newProd.Id,
                        type: Domain.Enums.MovementType.AdjustmentIn,
                        quantityDelta: stock,
                        previousStock: 0,
                        newStock: stock,
                        unitPrice: price,
                        userId: userId,
                        reference: "CARGA-MASIVA",
                        notes: "Carga Masiva (Inventario Inicial)",
                        warehouseId: request.WarehouseId
                    );
                    _context.InventoryMovements.Add(movement);
                }

                foreach (var mov in updatedMovements)
                {
                    _context.InventoryMovements.Add(mov);
                }

                if (newProductsWithStock.Count > 0 || updatedMovements.Count > 0)
                {
                    await _context.SaveChangesAsync(cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);

                result.Messages.Add($"Carga masiva completada: {result.ProductsCreated} creados, {result.ProductsUpdated} actualizados.");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Fallo en transacción de carga masiva: {Message}", ex.Message);
                result.ErrorsCount++;
                result.Messages.Add($"Error crítico en la transacción: {ex.Message}");
            }

            return result;
        });
    }

    private static bool TryExtractDecimal(string? str, out decimal val)
    {
        val = 0;
        if (string.IsNullOrWhiteSpace(str)) return false;
        var clean = str.Replace("$", "").Replace(" ", "").Trim();
        return decimal.TryParse(clean, NumberStyles.Any, CultureInfo.InvariantCulture, out val) ||
               decimal.TryParse(clean, NumberStyles.Any, new CultureInfo("es-CO"), out val);
    }

    private static bool TryExtractInt(string? str, out int val)
    {
        val = 0;
        if (string.IsNullOrWhiteSpace(str)) return false;
        var clean = str.Replace(".", "").Replace(",", "").Trim();
        return int.TryParse(clean, out val);
    }
}
