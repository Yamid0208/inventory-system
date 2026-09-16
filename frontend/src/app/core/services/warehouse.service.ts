import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { CreateClientAdminRequest, CreateWarehouseRequest, UpdateWarehouseRequest, Warehouse } from '../models/warehouse.model';

@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/warehouses';

  private readonly _warehousesChanged = new Subject<Warehouse | null>();
  readonly warehousesChanged$ = this._warehousesChanged.asObservable();

  notifyWarehousesChanged(warehouse?: Warehouse): void {
    this._warehousesChanged.next(warehouse ?? null);
  }

  getWarehouses(): Observable<Warehouse[]> {
    return this.http.get<Warehouse[]>(this.baseUrl);
  }

  getWarehouseById(id: number): Observable<Warehouse> {
    return this.http.get<Warehouse>(`${this.baseUrl}/${id}`);
  }

  createWarehouse(request: CreateWarehouseRequest): Observable<Warehouse> {
    return this.http.post<Warehouse>(this.baseUrl, request).pipe(
      tap(created => this._warehousesChanged.next(created))
    );
  }

  createClientAdmin(request: CreateClientAdminRequest): Observable<Warehouse> {
    return this.http.post<Warehouse>(`${this.baseUrl}/client-admin`, request).pipe(
      tap(created => this._warehousesChanged.next(created))
    );
  }

  updateWarehouse(id: number, request: UpdateWarehouseRequest): Observable<Warehouse> {
    return this.http.put<Warehouse>(`${this.baseUrl}/${id}`, request).pipe(
      tap(updated => this._warehousesChanged.next(updated))
    );
  }

  toggleStatus(id: number): Observable<Warehouse> {
    return this.http.patch<Warehouse>(`${this.baseUrl}/${id}/toggle-status`, {}).pipe(
      tap(updated => this._warehousesChanged.next(updated))
    );
  }
}
