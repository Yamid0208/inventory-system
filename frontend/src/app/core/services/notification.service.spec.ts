import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService } from './notification.service';

describe('NotificationService (Unit Tests)', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new NotificationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with empty toast list', () => {
    expect(service.toasts().length).toBe(0);
  });

  it('should add a success toast correctly', () => {
    const id = service.success('Registro completado', 'Éxito');
    const toasts = service.toasts();

    expect(toasts.length).toBe(1);
    expect(toasts[0].id).toBe(id);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].message).toBe('Registro completado');
    expect(toasts[0].title).toBe('Éxito');
  });

  it('should add an error toast correctly', () => {
    service.error('Falló la conexión');
    const toasts = service.toasts();

    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toBe('Falló la conexión');
  });

  it('should dismiss a toast by id', () => {
    const id1 = service.success('Mensaje 1');
    const id2 = service.info('Mensaje 2');
    expect(service.toasts().length).toBe(2);

    service.dismiss(id1);
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].id).toBe(id2);
  });

  it('should clear all toasts', () => {
    service.success('1');
    service.warning('2');
    expect(service.toasts().length).toBe(2);

    service.clearAll();
    expect(service.toasts().length).toBe(0);
  });

  it('should automatically dismiss toast after duration', () => {
    service.show('info', 'Auto dismiss test', undefined, 2000);
    expect(service.toasts().length).toBe(1);

    vi.advanceTimersByTime(2000);
    expect(service.toasts().length).toBe(0);
  });
});
