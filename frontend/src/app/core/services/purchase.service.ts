import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResult } from '../models/product.model';
import { Purchase, PurchaseFilterParams, CreatePurchaseRequest, ReturnPurchaseRequest } from '../models/purchase.model';

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/purchases';

  getPurchases(params: PurchaseFilterParams): Observable<PagedResult<Purchase>> {
    let httpParams = new HttpParams();

    if (params.supplierId) {
      httpParams = httpParams.set('supplierId', params.supplierId.toString());
    }
    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
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

    return this.http.get<PagedResult<Purchase>>(this.baseUrl, { params: httpParams });
  }

  getPurchaseById(id: number): Observable<Purchase> {
    return this.http.get<Purchase>(`${this.baseUrl}/${id}`);
  }

  createPurchase(request: CreatePurchaseRequest): Observable<Purchase> {
    return this.http.post<Purchase>(this.baseUrl, request);
  }

  receivePurchase(id: number): Observable<Purchase> {
    return this.http.patch<Purchase>(`${this.baseUrl}/${id}/receive`, {});
  }

  returnPurchase(id: number, request: ReturnPurchaseRequest): Observable<Purchase> {
    return this.http.post<Purchase>(`${this.baseUrl}/${id}/return`, request);
  }

  cancelPurchase(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/cancel`, {});
  }
}
