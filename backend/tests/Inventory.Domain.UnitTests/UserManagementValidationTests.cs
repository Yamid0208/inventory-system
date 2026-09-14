using FluentValidation.TestHelper;
using Inventory.Application.Features.Users.DTOs;
using Inventory.Application.Features.Users.Validators;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class UserManagementValidationTests
{
    private readonly CreateUserAdminValidator _createValidator = new();
    private readonly UpdateUserAdminValidator _updateValidator = new();
    private readonly ResetUserPasswordValidator _resetValidator = new();

    [Fact]
    public void CreateUser_ValidData_PassesValidation()
    {
        var model = new CreateUserAdminRequest(
            FullName: "Carlos Gómez",
            Email: "carlos.gomez@sgi.local",
            Password: "Password123*",
            Role: "Warehouse"
        );

        var result = _createValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("", "carlos@sgi.local", "Pass123*", "Warehouse")]
    [InlineData("Carlos", "correo-invalido", "Pass123*", "Warehouse")]
    [InlineData("Carlos", "carlos@sgi.local", "123", "Warehouse")]
    [InlineData("Carlos", "carlos@sgi.local", "Pass123*", "RolInvalido")]
    public void CreateUser_InvalidFields_FailsValidation(string name, string email, string pass, string role)
    {
        var model = new CreateUserAdminRequest(name, email, pass, role);
        var result = _createValidator.TestValidate(model);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void ResetPassword_TooShort_FailsValidation()
    {
        var model = new ResetUserPasswordRequest("12345");
        var result = _resetValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.NewPassword);
    }
}
