import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastNotification } from '../../../core/models/notification.model';

@Component({
  selector: 'app-toaster',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full px-4 sm:px-0 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      @for (toast of notificationService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 animate-slide-in"
          [ngClass]="getToastStyles(toast)"
          role="alert"
        >
          <!-- ICONO TEMÁTICO -->
          <div class="flex-shrink-0 mt-0.5">
            @switch (toast.type) {
              @case ('success') {
                <div class="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center font-bold text-sm shadow-sm">
                  ✓
                </div>
              }
              @case ('error') {
                <div class="w-8 h-8 rounded-xl bg-rose-100/80 text-rose-600 flex items-center justify-center font-bold text-sm shadow-sm">
                  ✕
                </div>
              }
              @case ('warning') {
                <div class="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-600 flex items-center justify-center font-bold text-sm shadow-sm">
                  ⚠️
                </div>
              }
              @case ('info') {
                <div class="w-8 h-8 rounded-xl bg-sky-100/80 text-sky-600 flex items-center justify-center font-bold text-sm shadow-sm">
                  ℹ️
                </div>
              }
            }
          </div>

          <!-- CONTENIDO -->
          <div class="flex-1 min-w-0 pr-1">
            @if (toast.title) {
              <h4 class="text-xs font-bold text-slate-900 leading-tight mb-0.5">{{ toast.title }}</h4>
            }
            <p class="text-xs text-slate-600 leading-relaxed break-words">{{ toast.message }}</p>
          </div>

          <!-- BOTÓN CERRAR -->
          <button
            type="button"
            (click)="dismiss(toast.id)"
            class="flex-shrink-0 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="Cerrar notificación"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .animate-slide-in {
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class AppToasterComponent {
  notificationService = inject(NotificationService);

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }

  getToastStyles(toast: ToastNotification): string {
    switch (toast.type) {
      case 'success':
        return 'bg-white/95 border-emerald-200/90 text-slate-900 border-l-4 border-l-emerald-500';
      case 'error':
        return 'bg-white/95 border-rose-200/90 text-slate-900 border-l-4 border-l-rose-500';
      case 'warning':
        return 'bg-white/95 border-amber-200/90 text-slate-900 border-l-4 border-l-amber-500';
      case 'info':
        return 'bg-white/95 border-sky-200/90 text-slate-900 border-l-4 border-l-sky-500';
    }
  }
}
