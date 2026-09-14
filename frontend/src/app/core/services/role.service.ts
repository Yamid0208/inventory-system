import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RolePermissionMatrixItem } from '../models/role.model';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/roles';

  getMatrix(): Observable<RolePermissionMatrixItem[]> {
    return this.http.get<RolePermissionMatrixItem[]>(`${this.baseUrl}/matrix`);
  }

  getMyPermissions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/my-permissions`);
  }
}
