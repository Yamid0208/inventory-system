import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockAlert, StockAlertSummary, StockAlertFilterParams } from '../models/alert.model';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/alerts';

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

  getSummary(): Observable<StockAlertSummary> {
    return this.http.get<StockAlertSummary>(`${this.baseUrl}/summary`);
  }
}
