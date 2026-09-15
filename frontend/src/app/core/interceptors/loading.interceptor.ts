import { HttpInterceptorFn, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

/**
 * Token de contexto HTTP para omitir el spinner de carga en peticiones específicas
 * (por ejemplo: sondeos en segundo plano, refresco silencioso de token, etc.).
 *
 * Uso:
 * http.get('/api/silencioso', { context: new HttpContext().set(BYPASS_LOADING, true) });
 */
export const BYPASS_LOADING = new HttpContextToken<boolean>(() => false);

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // Peticiones en segundo plano explícitamente marcadas para omitir
  const shouldBypass = req.context.get(BYPASS_LOADING) || req.url.includes('/api/v1/auth/refresh');

  if (shouldBypass) {
    return next(req);
  }

  const loadingService = inject(LoadingService);
  const contextualMessage = loadingService.getMessageForUrl(req.url);

  loadingService.show(contextualMessage);

  return next(req).pipe(
    finalize(() => {
      loadingService.hide();
    })
  );
};
