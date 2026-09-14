import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResult } from '../models/product.model';
import { AuditLog, AuditSummary, AuditLogFilterParams } from '../models/audit.model';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/audit';

  getLogs(params: AuditLogFilterParams): Observable<PagedResult<AuditLog>> {
    let httpParams = new HttpParams();

    if (params.entityName && params.entityName !== 'all') {
      httpParams = httpParams.set('entityName', params.entityName);
    }
    if (params.action && params.action !== 'all') {
      httpParams = httpParams.set('action', params.action);
    }
    if (params.userId) {
      httpParams = httpParams.set('userId', params.userId.toString());
    }
    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }

    return this.http.get<PagedResult<AuditLog>>(`${this.baseUrl}/logs`, { params: httpParams });
  }

  getSummary(): Observable<AuditSummary> {
    return this.http.get<AuditSummary>(`${this.baseUrl}/summary`);
  }
}
