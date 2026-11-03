import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ReportsCatalogSummary,
  PagedReportResult,
  ProductReportItem,
  InventoryKardexReportItem,
  SalesReportItem,
  PurchasesReportItem,
  LowStockReportItem,
  SalesSummaryMetrics,
  TopProductReportItem,
  ProfitabilitySummary,
  CashRegisterReconciliationSummary,
  AuditActivityReportItem
} from '../models/report.model';

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

  getProductsData(
    warehouseId?: number | null,
    searchTerm?: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedReportResult<ProductReportItem>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }
    return this.http.get<PagedReportResult<ProductReportItem>>(`${this.baseUrl}/products/data`, { params });
  }

  getInventoryKardexData(
    startDate?: string,
    endDate?: string,
    warehouseId?: number | null,
    searchTerm?: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedReportResult<InventoryKardexReportItem>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    if (searchTerm) params = params.set('searchTerm', searchTerm);
    return this.http.get<PagedReportResult<InventoryKardexReportItem>>(`${this.baseUrl}/inventory/data`, { params });
  }

  getSalesData(
    startDate?: string,
    endDate?: string,
    warehouseId?: number | null,
    searchTerm?: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedReportResult<SalesReportItem>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    if (searchTerm) params = params.set('searchTerm', searchTerm);
    return this.http.get<PagedReportResult<SalesReportItem>>(`${this.baseUrl}/sales/data`, { params });
  }

  getSalesSummaryMetrics(
    startDate?: string,
    endDate?: string,
    warehouseId?: number | null
  ): Observable<SalesSummaryMetrics> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    return this.http.get<SalesSummaryMetrics>(`${this.baseUrl}/sales/summary-metrics`, { params });
  }

  getTopProducts(
    startDate?: string,
    endDate?: string,
    warehouseId?: number | null,
    searchTerm?: string,
    top: number = 10,
    ascending: boolean = false
  ): Observable<TopProductReportItem[]> {
    let params = new HttpParams()
      .set('top', top.toString())
      .set('ascending', ascending.toString());

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    if (searchTerm) params = params.set('searchTerm', searchTerm);
    return this.http.get<TopProductReportItem[]>(`${this.baseUrl}/sales/top-products`, { params });
  }

  getProfitability(
    startDate?: string,
    endDate?: string,
    warehouseId?: number | null,
    searchTerm?: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<ProfitabilitySummary> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    if (searchTerm) params = params.set('searchTerm', searchTerm);
    return this.http.get<ProfitabilitySummary>(`${this.baseUrl}/finance/profitability`, { params });
  }

  getCashRegisterReconciliation(
    startDate?: string,
    endDate?: string,
    warehouseId?: number | null,
    searchTerm?: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<CashRegisterReconciliationSummary> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    if (searchTerm) params = params.set('searchTerm', searchTerm);
    return this.http.get<CashRegisterReconciliationSummary>(`${this.baseUrl}/cash-register/reconciliation`, { params });
  }

  getPurchasesData(
    startDate?: string,
    endDate?: string,
    warehouseId?: number | null,
    searchTerm?: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedReportResult<PurchasesReportItem>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    if (searchTerm) params = params.set('searchTerm', searchTerm);
    return this.http.get<PagedReportResult<PurchasesReportItem>>(`${this.baseUrl}/purchases/data`, { params });
  }

  getLowStockData(
    warehouseId?: number | null,
    searchTerm?: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedReportResult<LowStockReportItem>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    if (searchTerm) params = params.set('searchTerm', searchTerm);
    return this.http.get<PagedReportResult<LowStockReportItem>>(`${this.baseUrl}/low-stock/data`, { params });
  }

  getAuditActivity(
    startDate?: string,
    endDate?: string,
    entityName?: string,
    searchTerm?: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedReportResult<AuditActivityReportItem>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (entityName) params = params.set('entityName', entityName);
    if (searchTerm) params = params.set('searchTerm', searchTerm);
    return this.http.get<PagedReportResult<AuditActivityReportItem>>(`${this.baseUrl}/audit/activity`, { params });
  }

  downloadReport(reportKey: string, startDate?: string, endDate?: string, warehouseId?: number | null): Observable<Blob> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }

    let url = `${this.baseUrl}/${reportKey}/csv`;
    if (reportKey === 'finance') {
      url = `${this.baseUrl}/finance/profitability/csv`;
    } else if (reportKey === 'cash-reconciliation') {
      url = `${this.baseUrl}/cash-register/reconciliation/csv`;
    }

    return this.http.get(url, {
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
