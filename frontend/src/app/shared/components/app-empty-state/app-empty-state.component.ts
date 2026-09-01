import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text-center py-12 px-4 flex flex-col items-center justify-center">
      <div class="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
        </svg>
      </div>
      <h4 class="text-base font-semibold text-white mb-1">{{ title() }}</h4>
      <p class="text-xs text-slate-400 max-w-sm mb-6">{{ description() }}</p>
      <div class="flex items-center space-x-3">
        <ng-content select="[action]"></ng-content>
      </div>
    </div>
  `
})
export class AppEmptyStateComponent {
  title = input<string>('No se encontraron registros');
  description = input<string>('No hay datos disponibles para mostrar en esta sección.');
}
