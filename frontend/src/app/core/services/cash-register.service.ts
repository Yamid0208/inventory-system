import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { PagedResult } from '../models/product.model';
import {
  CashRegisterSession,
  CashRegisterMovement,
  CashRegisterAuditSummary,
  CashRegisterDashboard,
  OpenCashRegisterRequest,
  CreateCashMovementRequest,
  CloseCashRegisterRequest,
  CashRegisterFilterRequest
} from '../models/cash-register.model';

@Injectable({
  providedIn: 'root'
})
export class CashRegisterService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/cash-register';

  // Señal reactiva global para conocer si el usuario actual tiene caja abierta
  readonly activeSession = signal<CashRegisterSession | null>(null);
  readonly isLoading = signal<boolean>(false);

  getCurrentSession(): Observable<CashRegisterSession | null> {
    this.isLoading.set(true);
    return this.http.get<CashRegisterSession | null>(`${this.baseUrl}/current`).pipe(
      tap({
        next: (session) => {
          this.activeSession.set(session);
          this.isLoading.set(false);
        },
        error: () => {
          this.activeSession.set(null);
          this.isLoading.set(false);
        }
      })
    );
  }

  openSession(request: OpenCashRegisterRequest): Observable<CashRegisterSession> {
    return this.http.post<CashRegisterSession>(`${this.baseUrl}/open`, request).pipe(
      tap((session) => this.activeSession.set(session))
    );
  }

  getAuditSummary(id: number): Observable<CashRegisterAuditSummary> {
    return this.http.get<CashRegisterAuditSummary>(`${this.baseUrl}/${id}/audit`);
  }

  closeSession(id: number, request: CloseCashRegisterRequest): Observable<CashRegisterSession> {
    return this.http.post<CashRegisterSession>(`${this.baseUrl}/${id}/close`, request).pipe(
      tap(() => this.activeSession.set(null))
    );
  }

  createMovement(request: CreateCashMovementRequest): Observable<CashRegisterMovement> {
    return this.http.post<CashRegisterMovement>(`${this.baseUrl}/movements`, request);
  }

  getSessions(filter: CashRegisterFilterRequest): Observable<PagedResult<CashRegisterSession>> {
    let params = new HttpParams();

    if (filter.pageNumber) {
      params = params.set('pageNumber', filter.pageNumber.toString());
    }
    if (filter.pageSize) {
      params = params.set('pageSize', filter.pageSize.toString());
    }
    if (filter.startDate) {
      params = params.set('startDate', filter.startDate);
    }
    if (filter.endDate) {
      params = params.set('endDate', filter.endDate);
    }
    if (filter.userId) {
      params = params.set('userId', filter.userId.toString());
    }
    if (filter.status && filter.status !== 'all') {
      params = params.set('status', filter.status);
    }
    if (filter.warehouseId) {
      params = params.set('warehouseId', filter.warehouseId.toString());
    }

    return this.http.get<PagedResult<CashRegisterSession>>(`${this.baseUrl}/sessions`, { params });
  }

  getSessionById(id: number): Observable<CashRegisterSession> {
    return this.http.get<CashRegisterSession>(`${this.baseUrl}/sessions/${id}`);
  }

  getSessionMovements(id: number): Observable<CashRegisterMovement[]> {
    return this.http.get<CashRegisterMovement[]>(`${this.baseUrl}/sessions/${id}/movements`);
  }

  getDashboard(warehouseId?: number): Observable<CashRegisterDashboard> {
    let params = new HttpParams();
    if (warehouseId) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    return this.http.get<CashRegisterDashboard>(`${this.baseUrl}/dashboard`, { params });
  }
}
