import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResult } from '../models/product.model';
import { Sale, SaleFilterParams, CreateSaleRequest } from '../models/sale.model';

@Injectable({
  providedIn: 'root'
})
export class SaleService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/sales';

  getSales(params: SaleFilterParams): Observable<PagedResult<Sale>> {
    let httpParams = new HttpParams();

    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.paymentMethod && params.paymentMethod !== 'all') {
      httpParams = httpParams.set('paymentMethod', params.paymentMethod);
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

    return this.http.get<PagedResult<Sale>>(this.baseUrl, { params: httpParams });
  }

  getSaleById(id: number): Observable<Sale> {
    return this.http.get<Sale>(`${this.baseUrl}/${id}`);
  }

  createSale(request: CreateSaleRequest): Observable<Sale> {
    return this.http.post<Sale>(this.baseUrl, request);
  }

  cancelSale(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/cancel`, {});
  }
}
