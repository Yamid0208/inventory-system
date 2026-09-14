import { Injectable, signal } from '@angular/core';
import { ToastNotification, NotificationType } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private _toasts = signal<ToastNotification[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(type: NotificationType, message: string, title?: string, duration = 4000): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastNotification = {
      id,
      type,
      title,
      message,
      duration,
      timestamp: Date.now()
    };

    this._toasts.update(current => [...current, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  success(message: string, title = 'Operación Exitosa', duration = 4000): string {
    return this.show('success', message, title, duration);
  }

  error(message: string, title = 'Error del Sistema', duration = 6000): string {
    return this.show('error', message, title, duration);
  }

  warning(message: string, title = 'Advertencia', duration = 5000): string {
    return this.show('warning', message, title, duration);
  }

  info(message: string, title = 'Información', duration = 4000): string {
    return this.show('info', message, title, duration);
  }

  dismiss(id: string): void {
    this._toasts.update(current => current.filter(t => t.id !== id));
  }

  clearAll(): void {
    this._toasts.set([]);
  }
}
