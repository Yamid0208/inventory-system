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
  AuditActivityReportItem,
  SalesAnalyticsSummary,
  SalesByCategoryItem,
  HourlyActivityItem,
  SalesByEmployeeItem,
  SalesTrendItem,
  InventoryValuationSummary,
  InventoryValuationByCategory,
  InventoryValuationItem
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

  getSalesAnalyticsSummary(
    startDate?: string,
    endDate?: string,
    warehouseId?: number | null
  ): Observable<SalesAnalyticsSummary> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    return this.http.get<SalesAnalyticsSummary>(`${this.baseUrl}/sales/analytics-summary`, { params });
  }

  getSalesByCategory(
    startDate?: string,
    endDate?: string,
    warehouseId?: number | null,
    searchTerm?: string
  ): Observable<SalesByCategoryItem[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    if (searchTerm) params = params.set('searchTerm', searchTerm);
    return this.http.get<SalesByCategoryItem[]>(`${this.baseUrl}/sales/by-category`, { params });
  }

  getSalesHourlyActivity(
    startDate?: string,
    endDate?: string,
    warehouseId?: number | null
  ): Observable<HourlyActivityItem[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    return this.http.get<HourlyActivityItem[]>(`${this.baseUrl}/sales/hourly-activity`, { params });
  }

  getSalesByEmployee(
    startDate?: string,
    endDate?: string,
    warehouseId?: number | null,
    searchTerm?: string
  ): Observable<SalesByEmployeeItem[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    if (searchTerm) params = params.set('searchTerm', searchTerm);
    return this.http.get<SalesByEmployeeItem[]>(`${this.baseUrl}/sales/by-employee`, { params });
  }

  getSalesTrends(
    startDate?: string,
    endDate?: string,
    warehouseId?: number | null
  ): Observable<SalesTrendItem[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    return this.http.get<SalesTrendItem[]>(`${this.baseUrl}/sales/trends`, { params });
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

  // =========================================================================
  // 6. SUITE DE VALORACIÓN FINANCIERA Y PATRIMONIAL DE INVENTARIO
  // =========================================================================

  getInventoryValuationSummary(warehouseId?: number | null): Observable<InventoryValuationSummary> {
    let params = new HttpParams();
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    return this.http.get<InventoryValuationSummary>(`${this.baseUrl}/inventory/valuation-summary`, { params });
  }

  getInventoryValuationByCategory(warehouseId?: number | null): Observable<InventoryValuationByCategory[]> {
    let params = new HttpParams();
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    return this.http.get<InventoryValuationByCategory[]>(`${this.baseUrl}/inventory/valuation-by-category`, { params });
  }

  getInventoryValuationDetails(
    warehouseId?: number | null,
    categoryId?: number | null,
    abcClass?: string | null,
    stagnantOnly?: boolean,
    searchTerm?: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedReportResult<InventoryValuationItem>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    if (categoryId !== undefined && categoryId !== null && categoryId > 0) {
      params = params.set('categoryId', categoryId.toString());
    }
    if (abcClass) {
      params = params.set('abcClass', abcClass);
    }
    if (stagnantOnly) {
      params = params.set('stagnantOnly', 'true');
    }
    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }

    return this.http.get<PagedReportResult<InventoryValuationItem>>(`${this.baseUrl}/inventory/valuation-details`, { params });
  }

  exportInventoryValuationCsv(
    warehouseId?: number | null,
    categoryId?: number | null,
    abcClass?: string | null,
    stagnantOnly?: boolean,
    searchTerm?: string
  ): Observable<Blob> {
    let params = new HttpParams();
    if (warehouseId !== undefined && warehouseId !== null && warehouseId > 0) {
      params = params.set('warehouseId', warehouseId.toString());
    }
    if (categoryId !== undefined && categoryId !== null && categoryId > 0) {
      params = params.set('categoryId', categoryId.toString());
    }
    if (abcClass) {
      params = params.set('abcClass', abcClass);
    }
    if (stagnantOnly) {
      params = params.set('stagnantOnly', 'true');
    }
    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }

    return this.http.get(`${this.baseUrl}/inventory/valuation/csv`, {
      params,
      responseType: 'blob'
    });
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
    } else if (reportKey === 'sales-categories') {
      url = `${this.baseUrl}/sales/by-category/csv`;
    } else if (reportKey === 'sales-hourly') {
      url = `${this.baseUrl}/sales/hourly-activity/csv`;
    } else if (reportKey === 'sales-employees') {
      url = `${this.baseUrl}/sales/by-employee/csv`;
    } else if (reportKey === 'inventory-valuation') {
      url = `${this.baseUrl}/inventory/valuation/csv`;
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
