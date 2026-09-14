import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, retry, throwError, timer } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { NotificationService } from '../services/notification.service';

export const resilienceInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    retry({
      count: 2,
      delay: (error: any, retryCount: number) => {
        // Solo reintentar en fallos transitorios de red o servidor no disponible
        if (error instanceof HttpErrorResponse && (error.status === 0 || error.status === 503 || error.status === 504)) {
          return timer(retryCount * 400);
        }
        return throwError(() => error);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      // Manejo centralizado de expiración de sesión
      if (error.status === 401 && !req.url.includes('/api/v1/auth/login')) {
        notificationService.warning('Tu sesión ha expirado. Por favor inicia sesión nuevamente.', 'Sesión Expirada');
        authService.logout();
        router.navigate(['/login']);
      } else if (error.status === 0) {
        notificationService.error('No se pudo establecer comunicación con el servidor.', 'Error de Red');
      }
      return throwError(() => error);
    })
  );
};
