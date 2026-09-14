import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { ConfirmationService } from './confirmation.service';

describe('ConfirmationService (Unit Tests)', () => {
  it('should initialize with isOpen = false', () => {
    const service = new ConfirmationService();
    expect(service.state().isOpen).toBe(false);
  });

  it('should resolve true when handleConfirm() is called', async () => {
    const service = new ConfirmationService();
    const promise = service.confirm({
      title: '¿Eliminar?',
      message: '¿Está seguro de eliminar este registro?',
      variant: 'danger'
    });

    expect(service.state().isOpen).toBe(true);
    expect(service.state().options.title).toBe('¿Eliminar?');

    service.handleConfirm();
    const result = await promise;

    expect(result).toBe(true);
    expect(service.state().isOpen).toBe(false);
  });

  it('should resolve false when handleCancel() is called', async () => {
    const service = new ConfirmationService();
    const promise = service.confirm({
      title: '¿Descartar?',
      message: 'Los cambios no guardados se perderán.'
    });

    expect(service.state().isOpen).toBe(true);

    service.handleCancel();
    const result = await promise;

    expect(result).toBe(false);
    expect(service.state().isOpen).toBe(false);
  });
});
