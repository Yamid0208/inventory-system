import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text-center py-10 px-4 bg-rose-950/20 border border-rose-900/40 rounded-xl flex flex-col items-center justify-center">
      <div class="w-12 h-12 rounded-full bg-rose-900/30 border border-rose-700/50 flex items-center justify-center text-rose-400 mb-3">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      </div>
      <h4 class="text-base font-semibold text-white mb-1">{{ title() }}</h4>
      <p class="text-xs text-slate-400 max-w-md mb-4">{{ message() }}</p>
      <button
        type="button"
        (click)="retry.emit()"
        class="inline-flex items-center text-xs font-semibold px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-sm">
        Reintentar operación
      </button>
    </div>
  `
})
export class AppErrorStateComponent {
  title = input<string>('Ocurrió un error inesperado');
  message = input<string>('No fue posible cargar la información. Verifique su conexión e intente nuevamente.');
  retry = output<void>();
}
