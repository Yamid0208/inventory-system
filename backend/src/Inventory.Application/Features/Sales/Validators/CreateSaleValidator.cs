using FluentValidation;
using Inventory.Application.Features.Sales.DTOs;
using Inventory.Domain.Enums;

namespace Inventory.Application.Features.Sales.Validators;

public class CreateSaleValidator : AbstractValidator<CreateSaleRequest>
{
    public CreateSaleValidator()
    {
        RuleFor(x => x.CustomerName)
            .NotEmpty()
            .WithMessage("El nombre del cliente o razón social es obligatorio.")
            .MaximumLength(200)
            .WithMessage("El nombre del cliente no puede exceder los 200 caracteres.");

        RuleFor(x => x.InvoiceType)
            .Must(m => Enum.TryParse<InvoiceType>(m, true, out _))
            .WithMessage("Debe seleccionar un tipo de factura válido (Traditional, Electronic).");

        RuleFor(x => x.CustomerTaxId)
            .NotEmpty()
            .When(x => x.InvoiceType != null && x.InvoiceType.Equals("Electronic", StringComparison.OrdinalIgnoreCase))
            .WithMessage("El NIT/Documento es obligatorio para facturación electrónica.")
            .MaximumLength(50)
            .WithMessage("El NIT o identificación no puede superar los 50 caracteres.");

        RuleFor(x => x.CustomerEmail)
            .NotEmpty()
            .When(x => x.InvoiceType != null && x.InvoiceType.Equals("Electronic", StringComparison.OrdinalIgnoreCase))
            .WithMessage("El correo electrónico es obligatorio para facturación electrónica.")
            .EmailAddress()
            .When(x => !string.IsNullOrWhiteSpace(x.CustomerEmail))
            .WithMessage("El correo electrónico del cliente tiene un formato inválido.");

        RuleFor(x => x.PaymentMethod)
            .Must(m => Enum.TryParse<PaymentMethod>(m, true, out _))
            .WithMessage("Debe seleccionar un método de pago válido (Cash, CreditCard, Transfer, Credit).");

        RuleFor(x => x.Items)
            .NotEmpty()
            .WithMessage("La venta debe incluir al menos un producto.");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId)
                .GreaterThan(0)
                .WithMessage("El producto en cada línea debe ser válido.");

            item.RuleFor(i => i.Quantity)
                .GreaterThan(0)
                .WithMessage("La cantidad a vender debe ser mayor a cero.");

            item.RuleFor(i => i.UnitPrice)
                .GreaterThanOrEqualTo(0)
                .WithMessage("El precio de venta no puede ser negativo.");
        });

        RuleForEach(x => x.Payments!).ChildRules(payment =>
        {
            payment.RuleFor(p => p.Method)
                .Must(m => Enum.TryParse<PaymentMethod>(m, true, out _))
                .WithMessage("El método de pago es inválido.");

            payment.RuleFor(p => p.Amount)
                .GreaterThan(0)
                .WithMessage("El monto asignado a cada método de pago debe ser mayor a cero.");
        }).When(x => x.Payments != null && x.Payments.Count > 0);

        RuleFor(x => x.Notes)
            .MaximumLength(500)
            .WithMessage("Las observaciones no pueden superar los 500 caracteres.");
    }
}
