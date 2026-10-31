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

  // Si no hay sesión previa guardada en el cliente, redirigir al login
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  // Caso: Recarga de página (F5) con sesión guardada en localStorage
  // Esperar la renovación silenciosa del token en memoria antes de permitir la navegación y montaje de componentes
  return authService.refresh().pipe(
    map(() => true),
    catchError(() => {
      authService.logout();
      return of(router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      }));
    })
  );
};
