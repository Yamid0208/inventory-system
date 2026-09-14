import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductBatch, CreateProductBatchRequest } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class BatchService {
  private http = inject(HttpClient);

  getBatches(productId: number): Observable<ProductBatch[]> {
    return this.http.get<ProductBatch[]>(`/api/v1/products/${productId}/batches`);
  }

  createBatch(productId: number, request: CreateProductBatchRequest): Observable<ProductBatch> {
    return this.http.post<ProductBatch>(`/api/v1/products/${productId}/batches`, request);
  }
}
