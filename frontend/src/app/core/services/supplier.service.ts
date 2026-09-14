import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  UpdateSupplierStatusRequest
} from '../models/supplier.model';

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/suppliers';

  getSuppliers(search?: string, isActive?: boolean): Observable<Supplier[]> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    if (isActive !== undefined && isActive !== null) {
      params = params.set('isActive', isActive.toString());
    }

    return this.http.get<Supplier[]>(this.apiUrl, { params });
  }

  getSupplier(id: number): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.apiUrl}/${id}`);
  }

  createSupplier(request: CreateSupplierRequest): Observable<Supplier> {
    return this.http.post<Supplier>(this.apiUrl, request);
  }

  updateSupplier(id: number, request: UpdateSupplierRequest): Observable<Supplier> {
    return this.http.put<Supplier>(`${this.apiUrl}/${id}`, request);
  }

  toggleStatus(id: number, isActive: boolean): Observable<Supplier> {
    const payload: UpdateSupplierStatusRequest = { isActive };
    return this.http.patch<Supplier>(`${this.apiUrl}/${id}/status`, payload);
  }

  deleteSupplier(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
