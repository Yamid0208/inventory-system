import { Injectable, signal } from '@angular/core';

export type ConfirmVariant = 'danger' | 'warning' | 'primary';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: 'trash' | 'warning' | 'question' | 'ban';
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  state = signal<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve?: (value: boolean) => void;
  }>({
    isOpen: false,
    options: {
      title: '',
      message: '',
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      variant: 'primary',
      icon: 'question'
    }
  });

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.state.set({
        isOpen: true,
        options: {
          confirmText: 'Confirmar',
          cancelText: 'Cancelar',
          variant: 'primary',
          icon: options.variant === 'danger' ? 'trash' : 'question',
          ...options
        },
        resolve
      });
    });
  }

  handleConfirm(): void {
    const current = this.state();
    if (current.resolve) {
      current.resolve(true);
    }
    this.close();
  }

  handleCancel(): void {
    const current = this.state();
    if (current.resolve) {
      current.resolve(false);
    }
    this.close();
  }

  private close(): void {
    this.state.update((prev) => ({
      ...prev,
      isOpen: false,
      resolve: undefined
    }));
  }
}
