import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, timer, filter, fromEvent, catchError, of } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { StockAlert, StockAlertSummary, StockAlertFilterParams } from '../models/alert.model';
import { AuthService } from '../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private http = inject(HttpClient);
  private router = inject(Router, { optional: true });
  private authService = inject(AuthService, { optional: true });
  private destroyRef = inject(DestroyRef, { optional: true });
  private baseUrl = '/api/v1/alerts';

  private readonly STORAGE_SEEN_ALERTS_KEY = 'stockflow_seen_alerts';

  hasUnreadAlerts = signal<boolean>(false);
  unreadCount = signal<number>(0);
  totalAlerts = signal<number>(0);
  criticalCount = signal<number>(0);
  warningCount = signal<number>(0);
  latestAlerts = signal<StockAlert[]>([]);
  latestSummary = signal<StockAlertSummary | null>(null);

  constructor() {
    this.setupAutoRefresh();
  }

  private setupAutoRefresh(): void {
    // 1. Verificación periódica cada 30 segundos
    timer(1000, 30000)
      .pipe(
        filter(() => !this.authService || this.authService.isAuthenticated()),
        catchError(() => of(null))
      )
      .subscribe(() => {
        this.checkUnreadStatus();
      });

    // 2. Verificación al navegar entre pantallas de la aplicación
    if (this.router) {
      this.router.events
        .pipe(
          filter(event => event instanceof NavigationEnd),
          catchError(() => of(null))
        )
        .subscribe((event: any) => {
          if (event?.urlAfterRedirects?.includes('/alerts') || event?.url?.includes('/alerts')) {
            this.markAsSeen();
          } else if (!this.authService || this.authService.isAuthenticated()) {
            this.checkUnreadStatus();
          }
        });
    }

    // 3. Verificación al enfocar la pestaña del navegador
    if (typeof window !== 'undefined') {
      fromEvent(window, 'focus')
        .pipe(
          filter(() => !this.authService || this.authService.isAuthenticated()),
          catchError(() => of(null))
        )
        .subscribe(() => {
          this.checkUnreadStatus();
        });
    }
  }

  getStockAlerts(params?: StockAlertFilterParams): Observable<StockAlert[]> {
    let httpParams = new HttpParams();

    if (params?.severity && params.severity !== 'all') {
      httpParams = httpParams.set('severity', params.severity);
    }
    if (params?.categoryId) {
      httpParams = httpParams.set('categoryId', params.categoryId.toString());
    }
    if (params?.supplierId) {
      httpParams = httpParams.set('supplierId', params.supplierId.toString());
    }
    if (params?.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    const isGlobalQuery = !params || Object.keys(params).length === 0 ||
      (params.severity === 'all' && !params.categoryId && !params.supplierId && !params.search);

    return this.http.get<StockAlert[]>(`${this.baseUrl}/stock`, { params: httpParams }).pipe(
      tap(alerts => {
        if (isGlobalQuery) {
          this.latestAlerts.set(alerts || []);
          this.evaluateUnreadStatus(alerts || []);
        }
      })
    );
  }

  getSummary(): Observable<StockAlertSummary> {
    return this.http.get<StockAlertSummary>(`${this.baseUrl}/summary`).pipe(
      tap(summary => {
        if (summary) {
          this.latestSummary.set(summary);
          this.totalAlerts.set(summary.totalAlerts);
          this.criticalCount.set(summary.criticalCount);
          this.warningCount.set(summary.warningCount);
        }
      })
    );
  }

  private getSeenSignatures(): Set<string> {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.STORAGE_SEEN_ALERTS_KEY);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            return new Set<string>(list);
          }
        }
      } catch {
        return new Set<string>();
      }
    }
    return new Set<string>();
  }

  private saveSeenSignatures(signatures: string[]): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_SEEN_ALERTS_KEY, JSON.stringify(signatures));
      } catch (err) {
        console.warn('No se pudo guardar stockflow_seen_alerts en localStorage:', err);
      }
    }
  }

  private buildSignature(alert: StockAlert): string {
    return `${alert.productId}:${alert.severity}`;
  }

  private evaluateUnreadStatus(alerts: StockAlert[]): void {
    if (!alerts || alerts.length === 0) {
      this.hasUnreadAlerts.set(false);
      this.unreadCount.set(0);
      return;
    }

    const seenSet = this.getSeenSignatures();

    // Si nunca se han visto alertas (localStorage limpio) y existen alertas activas
    if (seenSet.size === 0) {
      this.hasUnreadAlerts.set(true);
      this.unreadCount.set(alerts.length);
      return;
    }

    // Comparamos alertas activas contra las vistas. Si un producto cambió a Critical
    // o es nuevo en la lista, su firma ${productId}:${severity} no estará en seenSet
    const unread = alerts.filter(a => !seenSet.has(this.buildSignature(a)));

    if (unread.length > 0) {
      this.hasUnreadAlerts.set(true);
      this.unreadCount.set(unread.length);
    } else {
      this.hasUnreadAlerts.set(false);
      this.unreadCount.set(0);
    }
  }

  checkUnreadStatus(): void {
    this.getStockAlerts().pipe(
      catchError(() => of([]))
    ).subscribe();

    this.getSummary().pipe(
      catchError(() => of(null))
    ).subscribe();
  }

  markAsSeen(target?: StockAlert[] | number): void {
    let listToMark: StockAlert[] = [];

    if (Array.isArray(target)) {
      listToMark = target;
    } else {
      listToMark = this.latestAlerts();
    }

    if (listToMark && listToMark.length > 0) {
      const signatures = listToMark.map(a => this.buildSignature(a));
      this.saveSeenSignatures(signatures);
      this.hasUnreadAlerts.set(false);
      this.unreadCount.set(0);
    } else {
      // Si la lista en memoria estaba vacía, consultamos activas para registrarlas
      this.http.get<StockAlert[]>(`${this.baseUrl}/stock`).pipe(
        catchError(() => of([]))
      ).subscribe(alerts => {
        if (alerts && alerts.length > 0) {
          this.latestAlerts.set(alerts);
          const signatures = alerts.map(a => this.buildSignature(a));
          this.saveSeenSignatures(signatures);
        } else {
          this.saveSeenSignatures([]);
        }
        this.hasUnreadAlerts.set(false);
        this.unreadCount.set(0);
      });
    }
  }
}
