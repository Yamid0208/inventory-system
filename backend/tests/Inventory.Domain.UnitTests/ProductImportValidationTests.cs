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

    [Theory]
    [InlineData(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }, ".png", true)]
    [InlineData(new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46 }, ".jpg", true)]
    [InlineData(new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35 }, ".pdf", true)]
    [InlineData(new byte[] { 0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00 }, ".xlsx", true)]
    [InlineData(new byte[] { 0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00 }, ".csv", false)] // Disguised Windows MZ binary executable
    [InlineData(new byte[] { 0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00 }, ".csv", false)] // Disguised Linux ELF binary executable
    [InlineData(new byte[] { 0x4D, 0x5A, 0x90, 0x00 }, ".pdf", false)] // Disguised Windows EXE as PDF
    public void FileMagicNumberValidation_ShouldDetectValidSignaturesAndBlockDisguisedBinaries(byte[] bytes, string extension, bool expectedValid)
    {
        using var stream = new MemoryStream(bytes);
        var header = new byte[12];
        var bytesRead = stream.Read(header, 0, header.Length);

        var isValid = bytesRead >= 4 && extension switch
        {
            ".png" => header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47,
            ".jpg" or ".jpeg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            ".pdf" => header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46,
            ".xlsx" => header[0] == 0x50 && header[1] == 0x4B && header[2] == 0x03 && header[3] == 0x04,
            ".csv" => !(header[0] == 0x4D && header[1] == 0x5A) && !(header[0] == 0x7F && header[1] == 0x45 && header[2] == 0x4C && header[3] == 0x46),
            _ => false
        };

        Assert.Equal(expectedValid, isValid);
    }
}
