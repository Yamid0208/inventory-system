import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResult } from '../models/product.model';
import {
  UserDetail,
  CreateUserAdminRequest,
  UpdateUserAdminRequest,
  ResetUserPasswordRequest,
  UserAdminFilterParams
} from '../models/user-admin.model';

@Injectable({
  providedIn: 'root'
})
export class UserAdminService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/users';

  getUsers(params: UserAdminFilterParams): Observable<PagedResult<UserDetail>> {
    let httpParams = new HttpParams();

    if (params.role && params.role !== 'all') {
      httpParams = httpParams.set('role', params.role);
    }
    if (params.isActive !== undefined && params.isActive !== null) {
      httpParams = httpParams.set('isActive', params.isActive.toString());
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

    return this.http.get<PagedResult<UserDetail>>(this.baseUrl, { params: httpParams });
  }

  getUserById(id: number): Observable<UserDetail> {
    return this.http.get<UserDetail>(`${this.baseUrl}/${id}`);
  }

  createUser(req: CreateUserAdminRequest): Observable<UserDetail> {
    return this.http.post<UserDetail>(this.baseUrl, req);
  }

  updateUser(id: number, req: UpdateUserAdminRequest): Observable<UserDetail> {
    return this.http.put<UserDetail>(`${this.baseUrl}/${id}`, req);
  }

  toggleStatus(id: number): Observable<UserDetail> {
    return this.http.patch<UserDetail>(`${this.baseUrl}/${id}/status`, {});
  }

  resetPassword(id: number, req: ResetUserPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/reset-password`, req);
  }
}
