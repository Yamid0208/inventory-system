import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResult } from '../models/product.model';
import {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerFilterParams,
  CustomerSummary
} from '../models/customer.model';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/customers';

  getCustomers(params: CustomerFilterParams): Observable<PagedResult<Customer>> {
    let httpParams = new HttpParams();

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.isActive !== undefined) {
      httpParams = httpParams.set('isActive', params.isActive.toString());
    }
    if (params.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }

    return this.http.get<PagedResult<Customer>>(this.baseUrl, { params: httpParams });
  }

  getSummary(): Observable<CustomerSummary> {
    return this.http.get<CustomerSummary>(`${this.baseUrl}/summary`);
  }

  getCustomerById(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.baseUrl}/${id}`);
  }

  createCustomer(request: CreateCustomerRequest): Observable<Customer> {
    return this.http.post<Customer>(this.baseUrl, request);
  }

  updateCustomer(id: number, request: UpdateCustomerRequest): Observable<Customer> {
    return this.http.put<Customer>(`${this.baseUrl}/${id}`, request);
  }

  toggleStatus(id: number): Observable<Customer> {
    return this.http.patch<Customer>(`${this.baseUrl}/${id}/toggle-status`, {});
  }

  deleteCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
