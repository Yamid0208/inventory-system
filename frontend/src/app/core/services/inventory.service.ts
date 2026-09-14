import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResult } from '../models/product.model';
import { InventoryMovement, KardexFilterParams, CreateStockAdjustmentRequest, ProcessReturnRequest } from '../models/inventory.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/inventory';

  getKardex(params: KardexFilterParams): Observable<PagedResult<InventoryMovement>> {
    let httpParams = new HttpParams();

    if (params.productId) {
      httpParams = httpParams.set('productId', params.productId.toString());
    }
    if (params.movementType && params.movementType !== 'all') {
      httpParams = httpParams.set('movementType', params.movementType);
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

    return this.http.get<PagedResult<InventoryMovement>>(`${this.baseUrl}/kardex`, { params: httpParams });
  }

  createAdjustment(request: CreateStockAdjustmentRequest): Observable<InventoryMovement> {
    return this.http.post<InventoryMovement>(`${this.baseUrl}/adjustments`, request);
  }

  processReturn(request: ProcessReturnRequest): Observable<InventoryMovement> {
    return this.http.post<InventoryMovement>(`${this.baseUrl}/returns`, request);
  }

  exportCsv(params: KardexFilterParams): Observable<Blob> {
    let httpParams = new HttpParams();

    if (params.productId) {
      httpParams = httpParams.set('productId', params.productId.toString());
    }
    if (params.movementType && params.movementType !== 'all') {
      httpParams = httpParams.set('movementType', params.movementType);
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

    return this.http.get(`${this.baseUrl}/export-kardex`, {
      params: httpParams,
      responseType: 'blob'
    });
  }
}
