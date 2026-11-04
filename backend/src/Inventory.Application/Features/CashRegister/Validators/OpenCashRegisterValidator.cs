using FluentValidation;
using Inventory.Application.Features.CashRegister.DTOs;

namespace Inventory.Application.Features.CashRegister.Validators;

public class OpenCashRegisterValidator : AbstractValidator<OpenCashRegisterRequest>
{
    public OpenCashRegisterValidator()
    {
        RuleFor(x => x.WarehouseId)
            .NotNull().WithMessage("La sede o almacén es obligatoria para realizar la apertura de caja.")
            .GreaterThan(0).WithMessage("Debe seleccionar una sede o almacén válida.");

        RuleFor(x => x.InitialCash)
            .GreaterThanOrEqualTo(0).WithMessage("El efectivo inicial no puede ser negativo.");

        RuleFor(x => x.Notes)
            .MaximumLength(500).WithMessage("Las observaciones no pueden exceder 500 caracteres.");
    }
}
