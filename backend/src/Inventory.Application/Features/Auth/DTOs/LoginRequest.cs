using System.ComponentModel.DataAnnotations;

namespace Inventory.Application.Features.Auth.DTOs;

public record LoginRequest(
    [Required(ErrorMessage = "El correo electrónico es obligatorio.")]
    [EmailAddress(ErrorMessage = "Formato de correo electrónico inválido.")]
    string Email,

    [Required(ErrorMessage = "La contraseña es obligatoria.")]
    string Password
);
