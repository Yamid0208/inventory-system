import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { AppToasterComponent } from './app-toaster.component';
import { NotificationService } from '../../../core/services/notification.service';

describe('AppToasterComponent (Unit Tests)', () => {
  const notificationService = new NotificationService();
  const injector = createEnvironmentInjector([
    AppToasterComponent,
    { provide: NotificationService, useValue: notificationService }
  ], null as any);

  const component = injector.get(AppToasterComponent);

  it('should create toaster component instance', () => {
    expect(component).toBeTruthy();
    expect(component.notificationService).toBe(notificationService);
  });

  it('should return appropriate CSS classes by notification type', () => {
    const successClass = component.getToastStyles({
      id: '1',
      type: 'success',
      message: 'Ok',
      timestamp: Date.now()
    });
    expect(successClass).toContain('border-l-emerald-500');

    const errorClass = component.getToastStyles({
      id: '2',
      type: 'error',
      message: 'Err',
      timestamp: Date.now()
    });
    expect(errorClass).toContain('border-l-rose-500');

    const warningClass = component.getToastStyles({
      id: '3',
      type: 'warning',
      message: 'Warn',
      timestamp: Date.now()
    });
    expect(warningClass).toContain('border-l-amber-500');

    const infoClass = component.getToastStyles({
      id: '4',
      type: 'info',
      message: 'Inf',
      timestamp: Date.now()
    });
    expect(infoClass).toContain('border-l-sky-500');
  });

  it('should call dismiss on notificationService when dismiss is triggered', () => {
    const id = notificationService.info('Toast para eliminar');
    expect(notificationService.toasts().length).toBe(1);

    component.dismiss(id);
    expect(notificationService.toasts().length).toBe(0);
  });
});
