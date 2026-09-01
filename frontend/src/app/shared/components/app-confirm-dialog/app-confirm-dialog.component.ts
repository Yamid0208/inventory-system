import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../app-button/app-button.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, AppButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="'dialog-title'">
        <div class="relative bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
          <div class="flex items-start space-x-3">
            <div [class]="iconBgClasses">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <h3 id="dialog-title" class="text-base font-semibold text-white">{{ title() }}</h3>
              <p class="text-xs text-slate-400 mt-1">{{ message() }}</p>
            </div>
          </div>

          <footer class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
            <app-button
              variant="outline"
              size="sm"
              [disabled]="loading()"
              (clicked)="cancelled.emit()">
              {{ cancelText() }}
            </app-button>
            <app-button
              [variant]="isDanger() ? 'danger' : 'primary'"
              size="sm"
              [loading]="loading()"
              (clicked)="confirmed.emit()">
              {{ confirmText() }}
            </app-button>
          </footer>
        </div>
      </div>
    }
  `
})
export class AppConfirmDialogComponent {
  isOpen = input<boolean>(false);
  title = input<string>('¿Está seguro de continuar?');
  message = input<string>('Esta acción modificará los datos del sistema.');
  confirmText = input<string>('Confirmar');
  cancelText = input<string>('Cancelar');
  isDanger = input<boolean>(false);
  loading = input<boolean>(false);

  confirmed = output<void>();
  cancelled = output<void>();

  get iconBgClasses(): string {
    if (this.isDanger()) {
      return 'w-10 h-10 rounded-full bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 shrink-0';
    }
    return 'w-10 h-10 rounded-full bg-amber-950/60 border border-amber-800/80 flex items-center justify-center text-amber-400 shrink-0';
  }
}
