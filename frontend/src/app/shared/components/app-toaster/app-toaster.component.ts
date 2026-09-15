import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastNotification } from '../../../core/models/notification.model';

@Component({
  selector: 'app-toaster',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-toaster.component.html',
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
