import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReportsCatalogSummary } from '../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/reports';

  getSummary(warehouseId?: number | null): Observable<ReportsCatalogSummary> {
    let params = new HttpParams();
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    return this.http.get<ReportsCatalogSummary>(`${this.baseUrl}/summary`, { params });
  }

  downloadReport(reportKey: string, startDate?: string, endDate?: string, warehouseId?: number | null): Observable<Blob> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }

    return this.http.get(`${this.baseUrl}/${reportKey}/csv`, {
      params,
      responseType: 'blob'
    });
  }

  triggerBrowserDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
