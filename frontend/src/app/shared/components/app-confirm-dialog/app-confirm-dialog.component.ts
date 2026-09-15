import { Component, ChangeDetectionStrategy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationService } from '../../../core/services/confirmation.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-confirm-dialog.component.html'
})
export class AppConfirmDialogComponent {
  confirmationService = inject(ConfirmationService);

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.confirmationService.state().isOpen) {
      this.confirmationService.handleCancel();
    }
  }

  getConfirmButtonClasses(): string {
    const variant = this.confirmationService.state().options.variant;
    const base = 'px-4 py-2 rounded-xl text-white text-xs font-bold transition-all cursor-pointer shadow-sm';
    switch (variant) {
      case 'danger':
        return `${base} bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-500/20`;
      case 'warning':
        return `${base} bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-500/20`;
      default:
        return `${base} bg-primary-600 hover:bg-primary-700 active:bg-primary-800 shadow-primary-500/20`;
    }
  }
}
