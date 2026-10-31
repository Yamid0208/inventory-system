import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../../services/notification.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);
  const token = authService.accessToken();

  let modifiedReq = req.clone({
    withCredentials: true
  });

  const isAuthEndpoint = req.url.includes('/api/v1/auth/login') ||
                         req.url.includes('/api/v1/auth/refresh') ||
                         req.url.includes('/api/v1/auth/logout');

  // Si no hay token en memoria pero hay sesión guardada (recarga F5 en llamada previa), esperar refresco silencioso
  if (!token && authService.currentUser() && !isAuthEndpoint) {
    return authService.refresh().pipe(
      switchMap((authResponse) => {
        const authedReq = req.clone({
          withCredentials: true,
          setHeaders: {
            Authorization: `Bearer ${authResponse.accessToken}`
          }
        });
        return next(authedReq);
      }),
      catchError((refreshErr) => {
        notificationService.warning('Tu sesión ha expirado. Por favor inicia sesión nuevamente.', 'Sesión Expirada');
        authService.logout();
        return throwError(() => refreshErr);
      })
    );
  }

  if (token && !req.headers.has('Authorization')) {
    modifiedReq = modifiedReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si recibimos 401 durante el uso activo (token expiró), intentar refresco silencioso
      if (error.status === 401 && !isAuthEndpoint && authService.currentUser()) {
        return authService.refresh().pipe(
          switchMap((authResponse) => {
            const retryReq = req.clone({
              withCredentials: true,
              setHeaders: {
                Authorization: `Bearer ${authResponse.accessToken}`
              }
            });
            return next(retryReq);
          }),
          catchError((refreshErr) => {
            notificationService.warning('Tu sesión ha expirado. Por favor inicia sesión nuevamente.', 'Sesión Expirada');
            authService.logout();
            return throwError(() => refreshErr);
          })
        );
      }

      return throwError(() => error);
    })
  );
};
