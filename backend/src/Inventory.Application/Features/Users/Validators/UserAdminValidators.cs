using FluentValidation;
using Inventory.Application.Features.Users.DTOs;
using Inventory.Domain.Enums;

namespace Inventory.Application.Features.Users.Validators;

public class CreateUserAdminValidator : AbstractValidator<CreateUserAdminRequest>
{
    public CreateUserAdminValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("El nombre completo es obligatorio.")
            .MaximumLength(150).WithMessage("El nombre no puede exceder los 150 caracteres.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("El correo electrónico es obligatorio.")
            .EmailAddress().WithMessage("El correo electrónico no es válido.")
            .MaximumLength(150).WithMessage("El correo no puede exceder los 150 caracteres.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("La contraseña inicial es obligatoria.")
            .MinimumLength(6).WithMessage("La contraseña debe contener al menos 6 caracteres.");

        RuleFor(x => x.Role)
            .Must(r => Enum.TryParse<UserRole>(r, true, out _))
            .WithMessage("Debe asignar un rol válido (Admin, Warehouse, Seller).");
    }
}

public class UpdateUserAdminValidator : AbstractValidator<UpdateUserAdminRequest>
{
    public UpdateUserAdminValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("El nombre completo es obligatorio.")
            .MaximumLength(150).WithMessage("El nombre no puede exceder los 150 caracteres.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("El correo electrónico es obligatorio.")
            .EmailAddress().WithMessage("El correo electrónico no es válido.")
            .MaximumLength(150).WithMessage("El correo no puede exceder los 150 caracteres.");

        RuleFor(x => x.Role)
            .Must(r => Enum.TryParse<UserRole>(r, true, out _))
            .WithMessage("Debe asignar un rol válido (Admin, Warehouse, Seller).");
    }
}

public class ResetUserPasswordValidator : AbstractValidator<ResetUserPasswordRequest>
{
    public ResetUserPasswordValidator()
    {
        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("La nueva contraseña es obligatoria.")
            .MinimumLength(6).WithMessage("La nueva contraseña debe contener al menos 6 caracteres.");
    }
}
