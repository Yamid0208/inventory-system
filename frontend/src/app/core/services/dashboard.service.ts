import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardSummary } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/dashboard/summary';

  getSummary(warehouseId?: number | null): Observable<DashboardSummary> {
    const params: Record<string, string> = {};
    if (warehouseId !== undefined && warehouseId !== null) {
      params['warehouseId'] = warehouseId.toString();
    }
    return this.http.get<DashboardSummary>(this.apiUrl, { params });
  }
}
