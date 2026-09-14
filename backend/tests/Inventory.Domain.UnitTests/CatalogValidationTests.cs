using Inventory.Application.Common.Exceptions;
using Inventory.Application.Features.Categories.DTOs;
using Inventory.Application.Features.Categories.Validators;
using Inventory.Application.Features.Suppliers.DTOs;
using Inventory.Application.Features.Suppliers.Validators;
using Inventory.Domain.Entities;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class CatalogValidationTests
{
    [Fact]
    public void UpdateCategoryValidator_WithValidData_PassesValidation()
    {
        var validator = new UpdateCategoryValidator();
        var request = new UpdateCategoryRequest
        {
            Name = "Mobiliario Ergonómico",
            Description = "Sillas y escritorios para oficina"
        };

        var result = validator.Validate(request);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void UpdateCategoryValidator_WithEmptyName_FailsValidation(string? invalidName)
    {
        var validator = new UpdateCategoryValidator();
        var request = new UpdateCategoryRequest
        {
            Name = invalidName!,
            Description = "Descripción válida"
        };

        var result = validator.Validate(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(UpdateCategoryRequest.Name));
    }

    [Fact]
    public void UpdateCategoryValidator_WithExceededLength_FailsValidation()
    {
        var validator = new UpdateCategoryValidator();
        var request = new UpdateCategoryRequest
        {
            Name = new string('A', 101),
            Description = new string('B', 501)
        };

        var result = validator.Validate(request);

        Assert.False(result.IsValid);
        Assert.Equal(2, result.Errors.Count);
    }

    [Fact]
    public void UpdateSupplierValidator_WithValidData_PassesValidation()
    {
        var validator = new UpdateSupplierValidator();
        var request = new UpdateSupplierRequest
        {
            Name = "TechSupply Global Corp",
            TaxId = "NIT-900876543-1",
            ContactName = "Carlos Mendoza",
            Email = "ventas@techsupply.com",
            Phone = "+57 310 9876543",
            Address = "Av. El Dorado #68C-61"
        };

        var result = validator.Validate(request);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void UpdateSupplierValidator_WithInvalidEmail_FailsValidation()
    {
        var validator = new UpdateSupplierValidator();
        var request = new UpdateSupplierRequest
        {
            Name = "Proveedor Test",
            TaxId = "TAX-123",
            Email = "correo-invalido-sin-arroba"
        };

        var result = validator.Validate(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(UpdateSupplierRequest.Email));
    }

    [Fact]
    public void BusinessRuleViolationException_CarriesRuleCodeAndMessage()
    {
        var ex = new BusinessRuleViolationException("RN-005", "No se puede eliminar la categoría porque posee productos.");

        Assert.Equal("RN-005", ex.RuleCode);
        Assert.Contains("RN-005", ex.RuleCode);
        Assert.Equal("No se puede eliminar la categoría porque posee productos.", ex.Message);
    }

    [Fact]
    public void Category_Update_UpdatesFieldsAndSetsUpdatedAt()
    {
        var category = new Category("Inicial", "Desc inicial");
        var before = category.UpdatedAt;

        category.Update("Nuevo Nombre", "Nueva Desc");

        Assert.Equal("Nuevo Nombre", category.Name);
        Assert.Equal("Nueva Desc", category.Description);
        Assert.NotNull(category.UpdatedAt);
    }

    [Fact]
    public void Supplier_Update_UpdatesFieldsAndNormalizesTaxId()
    {
        var supplier = new Supplier("Inicial", "tax-123");

        supplier.Update("Proveedor Actualizado", "nit-999", "Contacto", "info@test.com", "123", "Calle 1");

        Assert.Equal("Proveedor Actualizado", supplier.Name);
        Assert.Equal("NIT-999", supplier.TaxId);
        Assert.Equal("info@test.com", supplier.Email);
        Assert.NotNull(supplier.UpdatedAt);
    }
}
