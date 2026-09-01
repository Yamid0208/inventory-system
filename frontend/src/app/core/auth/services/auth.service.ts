import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { AuthResponse, LoginCredentials, User, UserRole } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Estado reactivo con Signals
  private currentUserSignal = signal<User | null>(null);
  private accessTokenSignal = signal<string | null>(null);
  private isCheckingAuthSignal = signal<boolean>(true);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly isCheckingAuth = this.isCheckingAuthSignal.asReadonly();

  readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  readonly userRole = computed(() => this.currentUserSignal()?.role ?? null);
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'Admin');
  readonly isWarehouse = computed(() => this.currentUserSignal()?.role === 'Warehouse' || this.isAdmin());
  readonly isSeller = computed(() => this.currentUserSignal()?.role === 'Seller' || this.isAdmin());

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
    return this.http.post<AuthResponse>('/api/v1/auth/refresh', {}, { withCredentials: true }).pipe(
      tap((res) => {
        this.setSession(res);
      }),
      catchError((err) => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post('/api/v1/auth/logout', {}, { withCredentials: true }).pipe(
      tap(() => {
        this.clearSession();
        this.router.navigate(['/login']);
      }),
      catchError(() => {
        this.clearSession();
        this.router.navigate(['/login']);
        return of(null);
      })
    );
  }

  hasRole(allowedRoles: UserRole[]): boolean {
    const role = this.userRole();
    if (!role) return false;
    return allowedRoles.includes(role);
  }

  setAccessToken(token: string | null): void {
    this.accessTokenSignal.set(token);
  }

  private setSession(authResponse: AuthResponse): void {
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
      }
    } catch {
      this.clearSession();
    } finally {
      this.isCheckingAuthSignal.set(false);
    }
  }
}
