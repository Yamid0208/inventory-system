import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of, shareReplay, finalize } from 'rxjs';
import { AuthResponse, LoginCredentials, User, UserRole } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Control de concurrencia para rotación atómica de Refresh Token
  private refreshInProgress$: Observable<AuthResponse> | null = null;

  // Estado reactivo con Signals
  private currentUserSignal = signal<User | null>(null);
  private accessTokenSignal = signal<string | null>(null);
  private isCheckingAuthSignal = signal<boolean>(true);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly isCheckingAuth = this.isCheckingAuthSignal.asReadonly();

  readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  readonly userRole = computed(() => this.currentUserSignal()?.role ?? null);
  readonly isSuperAdmin = computed(() => this.currentUserSignal()?.role === 'SuperAdmin');
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'Admin');
  readonly isWarehouse = computed(() => this.currentUserSignal()?.role === 'Warehouse' || this.isAdmin());
  readonly isSeller = computed(() => this.currentUserSignal()?.role === 'Seller' || this.isAdmin());

  getDefaultRouteForRole(role?: UserRole | null): string {
    const userRole = role ?? this.userRole();
    return userRole === 'SuperAdmin' ? '/users' : '/dashboard';
  }

  constructor() {
    this.restoreUserFromStorage();
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/v1/auth/login', credentials, { withCredentials: true }).pipe(
      tap((res) => {
        this.setSession(res);
      })
    );
  }

  refresh(): Observable<AuthResponse> {
    if (this.refreshInProgress$) {
      return this.refreshInProgress$;
    }

    this.refreshInProgress$ = this.http.post<AuthResponse>('/api/v1/auth/refresh', {}, { withCredentials: true }).pipe(
      tap((res) => {
        this.setSession(res);
      }),
      catchError((err) => {
        // Si el refresco falla y no disponemos de un token vigente en memoria, limpiar sesión local
        if (!this.accessTokenSignal()) {
          this.clearSession();
        }
        return throwError(() => err);
      }),
      finalize(() => {
        this.refreshInProgress$ = null;
      }),
      shareReplay(1)
    );

    return this.refreshInProgress$;
  }

  logout(): Observable<any> {
    // Limpieza síncrona e inequívoca del estado local
    this.clearSession();
    this.router.navigate(['/login']);

    // Notificación en segundo plano al backend para revocar token en base de datos
    return this.http.post('/api/v1/auth/logout', {}, { withCredentials: true }).pipe(
      catchError(() => of(null)),
      shareReplay(1)
    );
  }

  hasRole(allowedRoles: UserRole[]): boolean {
    const role = this.userRole();
    if (!role) return false;
    return allowedRoles.includes(role);
  }

  hasPermission(permission: string): boolean {
    const role = this.userRole();
    if (!role) return false;
    if (role === 'Admin') return true;

    const warehousePermissions = [
      'Products:Read', 'Products:Write',
      'Inventory:Read', 'Inventory:Adjust',
      'Purchases:Read', 'Purchases:Create', 'Purchases:Receive', 'Purchases:Cancel',
      'Dashboard:Read', 'Reports:Export'
    ];

    const sellerPermissions = [
      'Products:Read',
      'Sales:Read', 'Sales:Create', 'Sales:Cancel',
      'Dashboard:Read', 'Reports:Export'
    ];

    if (role === 'Warehouse') {
      return warehousePermissions.includes(permission);
    }

    if (role === 'Seller') {
      return sellerPermissions.includes(permission);
    }

    return false;
  }

  setAccessToken(token: string | null): void {
    this.accessTokenSignal.set(token);
  }

  updateTermsAccepted(hasAccepted: boolean = true): void {
    this.currentUserSignal.update((user) => {
      if (!user) return null;
      const updated = { ...user, hasAcceptedTerms: hasAccepted };
      try {
        localStorage.setItem('sgi_user', JSON.stringify(updated));
      } catch {
        // Ignorar
      }
      return updated;
    });
  }

  private setSession(authResponse: AuthResponse): void {
    // SEC-004: El access token reside exclusivamente en memoria (Signals reactivos)
    this.accessTokenSignal.set(authResponse.accessToken);
    this.currentUserSignal.set(authResponse.user);
    try {
      localStorage.setItem('sgi_user', JSON.stringify(authResponse.user));
    } catch {
      // Ignorar fallo de almacenamiento en modo incógnito/privado
    }
  }

  private clearSession(): void {
    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);
    try {
      localStorage.removeItem('sgi_user');
    } catch {
      // Ignorar
    }
  }

  private restoreUserFromStorage(): void {
    try {
      const savedUser = localStorage.getItem('sgi_user');
      if (savedUser) {
        this.currentUserSignal.set(JSON.parse(savedUser));
        // Renovar silenciosamente el access token en memoria mediante la cookie HttpOnly
        this.refresh().subscribe({
          next: () => {
            this.isCheckingAuthSignal.set(false);
          },
          error: () => {
            this.clearSession();
            this.isCheckingAuthSignal.set(false);
          }
        });
        return;
      }
    } catch {
      this.clearSession();
    }
    this.isCheckingAuthSignal.set(false);
  }
}
