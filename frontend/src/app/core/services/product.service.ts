import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Product,
  ProductFilterParams,
  PagedResult,
  CreateProductRequest,
  UpdateProductRequest,
  UpdateProductStatusRequest
} from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/products';

  getProducts(filters?: ProductFilterParams): Observable<PagedResult<Product>> {
    let params = new HttpParams();

    if (filters) {
      if (filters.search && filters.search.trim()) {
        params = params.set('search', filters.search.trim());
      }
      if (filters.categoryId && filters.categoryId > 0) {
        params = params.set('categoryId', filters.categoryId.toString());
      }
      if (filters.supplierId && filters.supplierId > 0) {
        params = params.set('supplierId', filters.supplierId.toString());
      }
      if (filters.warehouseId && filters.warehouseId > 0) {
        params = params.set('warehouseId', filters.warehouseId.toString());
      }
      if (filters.stockStatus && filters.stockStatus !== 'all') {
        params = params.set('stockStatus', filters.stockStatus);
      }
      if (filters.isActive !== undefined && filters.isActive !== null) {
        params = params.set('isActive', filters.isActive.toString());
      }
      if (filters.pageNumber) {
        params = params.set('pageNumber', filters.pageNumber.toString());
      }
      if (filters.pageSize) {
        params = params.set('pageSize', filters.pageSize.toString());
      }
    }

    return this.http.get<PagedResult<Product>>(this.apiUrl, { params });
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  getProductBySku(sku: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/sku/${encodeURIComponent(sku)}`);
  }

  createProduct(request: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, request);
  }

  updateProduct(id: number, request: UpdateProductRequest): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, request);
  }

  toggleStatus(id: number, isActive: boolean): Observable<Product> {
    const payload: UpdateProductStatusRequest = { isActive };
    return this.http.patch<Product>(`${this.apiUrl}/${id}/status`, payload);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadImage(id: number, file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imageUrl: string }>(`${this.apiUrl}/${id}/image`, formData);
  }
}
