using Inventory.Application.Features.Products.DTOs;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class ProductImportValidationTests
{
    private static readonly string[] AllowedDocumentExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
    private static readonly string[] AllowedDocumentMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

    [Theory]
    [InlineData(".pdf", true)]
    [InlineData(".png", true)]
    [InlineData(".jpg", true)]
    [InlineData(".jpeg", true)]
    [InlineData(".webp", true)]
    [InlineData(".exe", false)]
    [InlineData(".docx", false)]
    [InlineData(".txt", false)]
    public void DocumentExtensionValidation_ShouldAcceptPdfAndImages(string extension, bool expectedValid)
    {
        var isValid = AllowedDocumentExtensions.Contains(extension.ToLowerInvariant());
        Assert.Equal(expectedValid, isValid);
    }

    [Theory]
    [InlineData("application/pdf", true)]
    [InlineData("image/jpeg", true)]
    [InlineData("image/png", true)]
    [InlineData("image/webp", true)]
    [InlineData("application/zip", false)]
    [InlineData("application/octet-stream", false)]
    public void DocumentMimeTypeValidation_ShouldAcceptPdfAndStandardImageMimes(string mimeType, bool expectedValid)
    {
        var isValid = AllowedDocumentMimeTypes.Contains(mimeType.ToLowerInvariant());
        Assert.Equal(expectedValid, isValid);
    }

    [Fact]
    public void ProductImportRowDto_WhenValidData_MaintainsFieldIntegrity()
    {
        var row = new ProductImportRowDto
        {
            RowNumber = 1,
            Sku = "PDF-PROD-001",
            Name = "Monitor Gamer 27\"",
            CategoryName = "Monitores",
            PurchasePrice = 250m,
            SalePrice = 399.99m,
            InitialStock = 15,
            MinimumStock = 3,
            IsValid = true
        };

        Assert.Equal("PDF-PROD-001", row.Sku);
        Assert.Equal(250m, row.PurchasePrice);
        Assert.Equal(399.99m, row.SalePrice);
        Assert.Equal(15, row.InitialStock);
        Assert.True(row.IsValid);
        Assert.False(row.IsExisting);
    }
}
