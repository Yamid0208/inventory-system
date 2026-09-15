import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Expresión regular estándar y robusta para validar emails con TLD válido.
 * Rechaza: usuario, usuario@, @dominio.com, usuario@dominio, usuario dominio.com
 * Acepta: usuario@gmail.com, usuario.nombre@empresa.com, nombre+test@dominio.co
 */
export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validador reactivo para formato de correo electrónico.
 * Si el campo está vacío, no reporta error (debe usarse junto con Validators.required si es obligatorio).
 */
export function emailFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (val === null || val === undefined) {
      return null;
    }
    const strVal = String(val).trim();
    if (strVal === '') {
      return null;
    }
    return EMAIL_PATTERN.test(strVal) ? null : { invalidEmail: true, email: true };
  };
}

/**
 * Validador helper que combina opcionalmente obligatoriedad y formato de email.
 */
export function appEmailValidator(required: boolean = false): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    const strVal = val === null || val === undefined ? '' : String(val).trim();
    if (strVal === '') {
      return required ? { required: true } : null;
    }
    return EMAIL_PATTERN.test(strVal) ? null : { invalidEmail: true, email: true };
  };
}

/**
 * Función utilitaria síncrona para validar un string de correo directamente
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return EMAIL_PATTERN.test(email.trim());
}
