import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanySettings, UpdateCompanySettingsRequest } from '../models/settings.model';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/settings';

  getSettings(): Observable<CompanySettings> {
    return this.http.get<CompanySettings>(this.baseUrl);
  }

  updateSettings(request: UpdateCompanySettingsRequest): Observable<CompanySettings> {
    return this.http.put<CompanySettings>(this.baseUrl, request);
  }
}
