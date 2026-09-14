import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class SessionTimeoutService {
  private authService = inject(AuthService);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private notificationService = inject(NotificationService);

  // Umbral de inactividad: 15 minutos (900s) para advertencia, 60s adicionales para cierre
  private readonly INACTIVITY_TIME_MS = 15 * 60 * 1000;
  private readonly COUNTDOWN_SECONDS = 60;

  showWarning = signal<boolean>(false);
  remainingSeconds = signal<number>(this.COUNTDOWN_SECONDS);

  private activitySubscription?: Subscription;
  private warningTimer?: any;
  private countdownTimer?: any;

  init(): void {
    // Escuchar el estado de autenticación para iniciar o detener el monitoreo
    if (this.authService.isAuthenticated()) {
      this.startMonitoring();
    }
  }

  startMonitoring(): void {
    this.stopMonitoring();

    if (typeof window === 'undefined') return;

    // Ejecutar fuera de Angular zone para no disparar ciclos de ChangeDetection innecesarios
    this.ngZone.runOutsideAngular(() => {
      const mouseMove$ = fromEvent(document, 'mousemove');
      const keyDown$ = fromEvent(document, 'keydown');
      const click$ = fromEvent(document, 'click');
      const scroll$ = fromEvent(document, 'scroll');
      const touch$ = fromEvent(document, 'touchstart');

      this.activitySubscription = merge(mouseMove$, keyDown$, click$, scroll$, touch$)
        .pipe(throttleTime(1000))
        .subscribe(() => {
          if (!this.showWarning()) {
            this.resetInactivityTimer();
          }
        });
    });

    this.resetInactivityTimer();
  }

  stopMonitoring(): void {
    this.activitySubscription?.unsubscribe();
    this.activitySubscription = undefined;
    this.clearAllTimers();
    this.showWarning.set(false);
  }

  private resetInactivityTimer(): void {
    this.clearAllTimers();

    this.warningTimer = setTimeout(() => {
      this.triggerWarning();
    }, this.INACTIVITY_TIME_MS);
  }

  private triggerWarning(): void {
    this.ngZone.run(() => {
      if (!this.authService.isAuthenticated()) return;

      this.showWarning.set(true);
      this.remainingSeconds.set(this.COUNTDOWN_SECONDS);

      this.countdownTimer = setInterval(() => {
        const next = this.remainingSeconds() - 1;
        if (next <= 0) {
          this.autoLogout();
        } else {
          this.remainingSeconds.set(next);
        }
      }, 1000);
    });
  }

  extendSession(): void {
    this.clearAllTimers();
    this.showWarning.set(false);

    // Intentar refresco silencioso del token para renovar vigencia
    this.authService.refresh().subscribe({
      next: () => {
        this.notificationService.info('Tu sesión ha sido extendida exitosamente.', 'Sesión Activa');
        this.startMonitoring();
      },
      error: () => {
        this.autoLogout();
      }
    });
  }

  autoLogout(): void {
    this.stopMonitoring();
    this.authService.logout();
    this.router.navigate(['/login']);
    this.notificationService.warning('Tu sesión ha expirado por inactividad para proteger tus datos.', 'Sesión Finalizada');
  }

  private clearAllTimers(): void {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = undefined;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
  }
}
