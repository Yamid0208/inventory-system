using FluentValidation;
using Inventory.Application.Common.Interfaces;
using Inventory.Application.Features.Categories.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Application.Features.Categories.Validators;

public class CreateCategoryValidator : AbstractValidator<CreateCategoryRequest>
{
    private readonly IApplicationDbContext _context;

    public CreateCategoryValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("El nombre de la categoría es obligatorio.")
            .MaximumLength(100).WithMessage("El nombre no puede exceder los 100 caracteres.")
            .MustAsync(BeUniqueName).WithMessage("Ya existe una categoría con ese nombre en este almacén.");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("La descripción no puede exceder los 500 caracteres.");
    }

    private async Task<bool> BeUniqueName(CreateCategoryRequest request, string name, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(name)) return true;
        var trimmed = name.Trim().ToLower();
        return !await _context.Categories
            .AnyAsync(c => c.WarehouseId == request.WarehouseId && c.Name.ToLower() == trimmed, cancellationToken);
    }
}
