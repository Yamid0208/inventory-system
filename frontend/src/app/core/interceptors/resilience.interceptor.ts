import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, retry, throwError, timer } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const resilienceInterceptor: HttpInterceptorFn = (req, next) => {
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
      // Notificar errores de conectividad de red con el backend (status 0)
      if (error.status === 0) {
        notificationService.error('No se pudo establecer comunicación con el servidor.', 'Error de Red');
      }
      return throwError(() => error);
    })
  );
};
