import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data?.['roles'] as string[] | undefined;

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const user = authService.currentUser();
  if (user && allowedRoles.includes(user.role)) {
    return true;
  }

  // Si el usuario no tiene los roles requeridos para la ruta, redirigir a su ruta por defecto
  const fallbackRoute = authService.getDefaultRouteForRole(user?.role);
  router.navigate([fallbackRoute]);
  return false;
};
