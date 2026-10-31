using FluentValidation;
using Inventory.Application.Features.Inventory.DTOs;

namespace Inventory.Application.Features.Inventory.Validators;

public class CreateStockAdjustmentValidator : AbstractValidator<CreateStockAdjustmentRequest>
{
    public CreateStockAdjustmentValidator()
    {
        RuleFor(x => x.ProductId)
            .GreaterThan(0)
            .When(x => string.IsNullOrWhiteSpace(x.NewProductName) && string.IsNullOrWhiteSpace(x.NewProductSku))
            .WithMessage("Debe seleccionar un producto válido o registrar el nuevo producto.");

        RuleFor(x => x.NewProductName)
            .NotEmpty()
            .When(x => !x.ProductId.HasValue || x.ProductId <= 0)
            .WithMessage("El nombre del nuevo producto es obligatorio.");

        RuleFor(x => x.AdjustmentType)
            .NotEmpty()
            .WithMessage("El tipo de ajuste es obligatorio.")
            .Must(t => t == "AdjustmentIn" || t == "AdjustmentOut")
            .WithMessage("El tipo de ajuste debe ser 'AdjustmentIn' (Entrada) o 'AdjustmentOut' (Salida).");

        RuleFor(x => x.Quantity)
            .GreaterThan(0)
            .WithMessage("La cantidad a ajustar debe ser un número entero mayor a cero.");

        RuleFor(x => x.Reason)
            .NotEmpty()
            .WithMessage("El motivo o razón del ajuste es obligatorio.")
            .MaximumLength(100)
            .WithMessage("El motivo no puede exceder los 100 caracteres.");

        RuleFor(x => x.Notes)
            .MaximumLength(500)
            .WithMessage("Las observaciones no pueden exceder los 500 caracteres.");
    }
}
