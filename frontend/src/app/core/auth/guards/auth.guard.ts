import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, catchError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si ya disponemos de access token y usuario en memoria, permitir navegación de inmediato
  if (authService.isAuthenticated() && authService.accessToken()) {
    return true;
  }

  let hasStoredRefreshToken = false;
  try {
    hasStoredRefreshToken = !!localStorage.getItem('sgi_refresh_token');
  } catch {
    // Ignorar fallo de lectura en navegadores restringidos
  }

  // Si no hay sesión previa guardada ni refresh token en el cliente, redirigir limpiamente al login
  if (!authService.isAuthenticated() && !hasStoredRefreshToken) {
    return router.createUrlTree(['/login']);
  }

  // Caso: Recarga de página (F5) con sesión o token guardado en cliente
  // Esperar la renovación silenciosa del token en memoria antes de permitir la navegación y montaje de componentes
  return authService.refresh().pipe(
    map(() => true),
    catchError((err) => {
      console.warn('[AuthGuard] Falló la renovación silenciosa de token en recarga F5:', err);
      authService.logout();
      return of(router.createUrlTree(['/login']));
    })
  );
};
