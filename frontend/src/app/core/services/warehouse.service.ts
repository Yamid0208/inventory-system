import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateClientAdminRequest, UpdateWarehouseRequest, Warehouse } from '../models/warehouse.model';

@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/warehouses';

  getWarehouses(): Observable<Warehouse[]> {
    return this.http.get<Warehouse[]>(this.baseUrl);
  }

  getWarehouseById(id: number): Observable<Warehouse> {
    return this.http.get<Warehouse>(`${this.baseUrl}/${id}`);
  }

  createClientAdmin(request: CreateClientAdminRequest): Observable<Warehouse> {
    return this.http.post<Warehouse>(`${this.baseUrl}/client-admin`, request);
  }

  updateWarehouse(id: number, request: UpdateWarehouseRequest): Observable<Warehouse> {
    return this.http.put<Warehouse>(`${this.baseUrl}/${id}`, request);
  }
}
