import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { AppConfirmDialogComponent } from './app-confirm-dialog.component';
import { ConfirmationService } from '../../../core/services/confirmation.service';

describe('AppConfirmDialogComponent (Unit Tests)', () => {
  const confirmationServiceMock = {
    state: vi.fn().mockReturnValue({
      isOpen: true,
      options: {
        title: '¿Confirmar Acción?',
        message: 'Esta operación modificará los registros.',
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        variant: 'danger'
      }
    }),
    handleConfirm: vi.fn(),
    handleCancel: vi.fn()
  };

  const injector = createEnvironmentInjector([
    AppConfirmDialogComponent,
    { provide: ConfirmationService, useValue: confirmationServiceMock }
  ], null as any);

  const component = injector.get(AppConfirmDialogComponent);

  it('should instantiate and return danger button classes for danger variant', () => {
    expect(component).toBeTruthy();
    expect(component.getConfirmButtonClasses()).toContain('bg-rose-600');
  });

  it('should cancel on escape key when open', () => {
    component.onEscape();
    expect(confirmationServiceMock.handleCancel).toHaveBeenCalled();
  });
});
