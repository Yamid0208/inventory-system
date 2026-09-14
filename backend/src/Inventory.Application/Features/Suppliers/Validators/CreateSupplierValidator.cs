using FluentValidation;
using Inventory.Application.Common.Interfaces;
using Inventory.Application.Features.Suppliers.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Application.Features.Suppliers.Validators;

public class CreateSupplierValidator : AbstractValidator<CreateSupplierRequest>
{
    private readonly IApplicationDbContext _context;

    public CreateSupplierValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("El nombre o razón social del proveedor es obligatorio.")
            .MaximumLength(150).WithMessage("El nombre no puede superar los 150 caracteres.");

        RuleFor(x => x.TaxId)
            .NotEmpty().WithMessage("El identificador fiscal (RUT/RFC/TaxId) es obligatorio.")
            .MaximumLength(30).WithMessage("El identificador fiscal no puede superar los 30 caracteres.")
            .MustAsync(BeUniqueTaxId).WithMessage("Ya existe un proveedor registrado con ese identificador fiscal en este almacén.");

        RuleFor(x => x.ContactName)
            .MaximumLength(100).WithMessage("El nombre de contacto no puede superar los 100 caracteres.");

        When(x => !string.IsNullOrWhiteSpace(x.Email), () =>
        {
            RuleFor(x => x.Email)
                .EmailAddress().WithMessage("El formato del correo electrónico no es válido.")
                .MaximumLength(150).WithMessage("El correo no puede superar los 150 caracteres.");
        });

        RuleFor(x => x.Phone)
            .MaximumLength(30).WithMessage("El teléfono no puede superar los 30 caracteres.");

        RuleFor(x => x.Address)
            .MaximumLength(300).WithMessage("La dirección no puede superar los 300 caracteres.");
    }

    private async Task<bool> BeUniqueTaxId(CreateSupplierRequest request, string taxId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(taxId)) return true;
        var normalized = taxId.Trim().ToUpperInvariant();
        return !await _context.Suppliers
            .AnyAsync(s => s.WarehouseId == request.WarehouseId && s.TaxId.ToUpper() == normalized, cancellationToken);
    }
}
