import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { FormControl } from '@angular/forms';
import { emailFormatValidator, appEmailValidator, isValidEmail } from './email.validator';

describe('Email Validator (Unit Tests)', () => {
  const validator = emailFormatValidator();

  it('should accept valid emails', () => {
    const validEmails = [
      'usuario@gmail.com',
      'usuario.nombre@empresa.com',
      'nombre+test@dominio.co',
      'admin@sistema.local.com',
      'test.user+tag@domain.org'
    ];

    for (const email of validEmails) {
      const control = new FormControl(email);
      expect(validator(control)).toBeNull();
      expect(isValidEmail(email)).toBe(true);
    }
  });

  it('should reject invalid emails', () => {
    const invalidEmails = [
      'usuario',
      'usuario@',
      '@dominio.com',
      'usuario@dominio',
      'usuario dominio.com',
      'usuario@.com',
      'usuario@dominio.',
      'plainaddress'
    ];

    for (const email of invalidEmails) {
      const control = new FormControl(email);
      expect(validator(control)).not.toBeNull();
      expect(isValidEmail(email)).toBe(false);
    }
  });

  it('should not fail on empty value when only format is validated', () => {
    expect(validator(new FormControl(''))).toBeNull();
    expect(validator(new FormControl(null))).toBeNull();
  });

  it('should fail on empty value when required is true with appEmailValidator', () => {
    const reqValidator = appEmailValidator(true);
    expect(reqValidator(new FormControl(''))).toEqual({ required: true });
    expect(reqValidator(new FormControl(null))).toEqual({ required: true });
    expect(reqValidator(new FormControl('usuario@gmail.com'))).toBeNull();
  });
});
