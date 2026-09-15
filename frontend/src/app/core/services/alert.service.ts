import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { StockAlert, StockAlertSummary, StockAlertFilterParams } from '../models/alert.model';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/alerts';

  hasUnreadAlerts = signal<boolean>(false);

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

    return this.http.get<StockAlert[]>(`${this.baseUrl}/stock`, { params: httpParams });
  }

  private getStoredSeenCount(): string | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('stockflow_alerts_seen_count');
    }
    return null;
  }

  private setStoredSeenCount(count: number): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('stockflow_alerts_seen_count', count.toString());
    }
  }

  getSummary(): Observable<StockAlertSummary> {
    return this.http.get<StockAlertSummary>(`${this.baseUrl}/summary`).pipe(
      tap(summary => {
        const storedSeenCount = this.getStoredSeenCount();
        const currentCount = summary.totalAlerts;
        if (currentCount > 0) {
          if (storedSeenCount === null || parseInt(storedSeenCount, 10) < currentCount) {
            this.hasUnreadAlerts.set(true);
          } else {
            this.hasUnreadAlerts.set(false);
          }
        } else {
          this.hasUnreadAlerts.set(false);
        }
      })
    );
  }

  checkUnreadStatus(): void {
    this.getSummary().subscribe();
  }

  markAsSeen(count?: number): void {
    if (count !== undefined) {
      this.setStoredSeenCount(count);
      this.hasUnreadAlerts.set(false);
    } else {
      this.getSummary().subscribe({
        next: (summary) => {
          this.setStoredSeenCount(summary.totalAlerts);
          this.hasUnreadAlerts.set(false);
        }
      });
    }
  }
}

