using FluentValidation;
using Inventory.Application.Features.Purchases.DTOs;

namespace Inventory.Application.Features.Purchases.Validators;

public class CreatePurchaseValidator : AbstractValidator<CreatePurchaseRequest>
{
    public CreatePurchaseValidator()
    {
        RuleFor(x => x.SupplierId)
            .GreaterThan(0)
            .WithMessage("Debe seleccionar un proveedor válido.");

        RuleFor(x => x.Items)
            .NotEmpty()
            .WithMessage("La compra debe incluir al menos un producto.");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId)
                .GreaterThan(0)
                .WithMessage("El producto en cada línea debe ser válido.");

            item.RuleFor(i => i.Quantity)
                .GreaterThan(0)
                .WithMessage("La cantidad a comprar debe ser mayor a cero.");

            item.RuleFor(i => i.UnitPrice)
                .GreaterThanOrEqualTo(0)
                .WithMessage("El precio unitario no puede ser negativo.");
        });

        RuleFor(x => x.Notes)
            .MaximumLength(500)
            .WithMessage("Las observaciones no pueden superar los 500 caracteres.");
    }
}
