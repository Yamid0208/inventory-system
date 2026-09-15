import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/services/auth.service';

describe('LoginComponent (Unit Tests - Remember Me & Email Validation)', () => {
  let component: LoginComponent;
  let authServiceMock: any;
  let routerMock: any;
  let routeMock: any;
  let localStorageMock: Record<string, string> = {};

  beforeEach(() => {
    localStorageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn((key: string, val: string) => { localStorageMock[key] = val; }),
      removeItem: vi.fn((key: string) => { delete localStorageMock[key]; }),
      clear: vi.fn(() => { localStorageMock = {}; })
    });

    authServiceMock = {
      login: vi.fn().mockReturnValue(of({ accessToken: 'fake-token', user: { email: 'admin@prueba.com' } }))
    };

    routerMock = {
      navigateByUrl: vi.fn()
    };

    routeMock = {
      snapshot: { queryParams: {} }
    };

    const injector = createEnvironmentInjector([
      FormBuilder,
      LoginComponent,
      { provide: AuthService, useValue: authServiceMock },
      { provide: Router, useValue: routerMock },
      { provide: ActivatedRoute, useValue: routeMock }
    ], null as any);

    component = injector.get(LoginComponent);
  });

  it('should restore remembered email on ngOnInit if present', () => {
    localStorageMock['sgi_remembered_email'] = 'recordado@empresa.com';
    component.ngOnInit();

    expect(component.loginForm.get('email')?.value).toBe('recordado@empresa.com');
    expect(component.loginForm.get('rememberMe')?.value).toBe(true);
  });

  it('should keep email empty and rememberMe false if not in storage', () => {
    component.ngOnInit();
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('rememberMe')?.value).toBe(false);
  });

  it('should save email to localStorage when rememberMe is true on successful login', () => {
    component.loginForm.setValue({
      email: 'usuario@gmail.com',
      password: 'Password123*',
      rememberMe: true
    });

    component.onSubmit();

    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'usuario@gmail.com',
      password: 'Password123*'
    });
    expect(localStorageMock['sgi_remembered_email']).toBe('usuario@gmail.com');
    // Ensure password is never saved
    expect(localStorageMock['password']).toBeUndefined();
    expect(localStorageMock['sgi_password']).toBeUndefined();
  });

  it('should remove remembered email from localStorage when rememberMe is false', () => {
    localStorageMock['sgi_remembered_email'] = 'previo@empresa.com';

    component.loginForm.setValue({
      email: 'usuario@gmail.com',
      password: 'Password123*',
      rememberMe: false
    });

    component.onSubmit();

    expect(localStorageMock['sgi_remembered_email']).toBeUndefined();
  });

  it('should validate email format strictly', () => {
    const emailControl = component.loginForm.get('email');

    emailControl?.setValue('usuario');
    expect(emailControl?.valid).toBe(false);

    emailControl?.setValue('usuario@dominio');
    expect(emailControl?.valid).toBe(false);

    emailControl?.setValue('usuario@gmail.com');
    expect(emailControl?.valid).toBe(true);
  });
});
