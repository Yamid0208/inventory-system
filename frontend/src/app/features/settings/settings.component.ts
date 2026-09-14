import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';
import { CompanySettings, UpdateCompanySettingsRequest } from '../../core/models/settings.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html'
})
export class SettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);

  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  companyName = '';
  taxId = '';
  email = '';
  phone = '';
  address = '';
  city = '';
  website = '';
  defaultTaxRate = 19.00;
  currencyCode = 'COP';
  currencySymbol = '$';
  lowStockThresholdDefault = 10;
  allowNegativeStock = false;
  enableAuditNotifications = true;
  updatedAt: string | null = null;

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading.set(true);
    this.settingsService.getSettings().subscribe({
      next: (s) => {
        this.companyName = s.companyName;
        this.taxId = s.taxId;
        this.email = s.email;
        this.phone = s.phone;
        this.address = s.address;
        this.city = s.city;
        this.website = s.website || '';
        this.defaultTaxRate = s.defaultTaxRate;
        this.currencyCode = s.currencyCode;
        this.currencySymbol = s.currencySymbol;
        this.lowStockThresholdDefault = s.lowStockThresholdDefault;
        this.allowNegativeStock = s.allowNegativeStock;
        this.enableAuditNotifications = s.enableAuditNotifications;
        this.updatedAt = s.updatedAt || null;
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  save(): void {
    this.saving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const req: UpdateCompanySettingsRequest = {
      companyName: this.companyName.trim(),
      taxId: this.taxId.trim(),
      email: this.email.trim(),
      phone: this.phone.trim(),
      address: this.address.trim(),
      city: this.city.trim(),
      defaultTaxRate: Number(this.defaultTaxRate),
      currencyCode: this.currencyCode.trim(),
      currencySymbol: this.currencySymbol.trim(),
      lowStockThresholdDefault: Number(this.lowStockThresholdDefault),
      allowNegativeStock: this.allowNegativeStock,
      enableAuditNotifications: this.enableAuditNotifications,
      website: this.website.trim() || undefined
    };

    this.settingsService.updateSettings(req).subscribe({
      next: (s) => {
        this.saving.set(false);
        this.updatedAt = s.updatedAt || new Date().toISOString();
        this.successMessage.set('Configuración de empresa guardada con éxito.');
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message || 'Error al guardar los parámetros de empresa.');
      }
    });
  }
}
