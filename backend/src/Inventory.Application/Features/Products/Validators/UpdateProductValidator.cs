using FluentValidation;
using Inventory.Application.Common.Interfaces;
using Inventory.Application.Features.Products.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Application.Features.Products.Validators;

public class UpdateProductValidator : AbstractValidator<UpdateProductRequest>
{
    private readonly IApplicationDbContext _context;

    public UpdateProductValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("El nombre del producto es obligatorio.")
            .MaximumLength(200).WithMessage("El nombre no puede exceder los 200 caracteres.");

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("La descripción no puede exceder los 1000 caracteres.");

        RuleFor(x => x.CategoryId)
            .GreaterThan(0).WithMessage("Debes seleccionar una categoría válida.")
            .MustAsync(CategoryExists).WithMessage("La categoría seleccionada no existe o se encuentra inactiva.");

        RuleFor(x => x.SupplierId)
            .GreaterThan(0).WithMessage("Debes seleccionar un proveedor válido.")
            .MustAsync(SupplierExists).WithMessage("El proveedor seleccionado no existe o se encuentra inactivo.");

        RuleFor(x => x.PurchasePrice)
            .GreaterThanOrEqualTo(0).WithMessage("El precio de compra no puede ser negativo.");

        RuleFor(x => x.SalePrice)
            .GreaterThanOrEqualTo(0).WithMessage("El precio de venta no puede ser negativo.")
            .GreaterThanOrEqualTo(x => x.PurchasePrice)
            .WithMessage("El precio de venta debe ser mayor o igual al precio de compra para evitar márgenes negativos (RN-003).");

        RuleFor(x => x.MinimumStock)
            .GreaterThanOrEqualTo(0).WithMessage("El stock mínimo no puede ser negativo.");

        RuleFor(x => x.RowVersion)
            .NotEmpty().WithMessage("El token de concurrencia optimista (RowVersion) es obligatorio para editar el producto.");
    }

    private async Task<bool> CategoryExists(int categoryId, CancellationToken cancellationToken)
    {
        return await _context.Categories
            .AnyAsync(c => c.Id == categoryId && c.IsActive, cancellationToken);
    }

    private async Task<bool> SupplierExists(int supplierId, CancellationToken cancellationToken)
    {
        return await _context.Suppliers
            .AnyAsync(s => s.Id == supplierId && s.IsActive, cancellationToken);
    }
}
