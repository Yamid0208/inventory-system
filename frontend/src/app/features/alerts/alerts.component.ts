import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AlertService } from '../../core/services/alert.service';
import { StockAlert, StockAlertSummary, StockAlertFilterParams } from '../../core/models/alert.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyFormatPipe, AppButtonComponent],
  templateUrl: './alerts.component.html'
})
export class AlertsComponent implements OnInit {
  private alertService = inject(AlertService);
  private router = inject(Router);

  alerts = signal<StockAlert[]>([]);
  summary = signal<StockAlertSummary | null>(null);
  loading = signal<boolean>(false);

  severityFilter = signal<string>('all');
  searchQuery = signal<string>('');

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    const params: StockAlertFilterParams = {
      severity: this.severityFilter(),
      search: this.searchQuery()
    };

    this.alertService.getStockAlerts(params).subscribe({
      next: (data) => {
        this.alerts.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    this.alertService.getSummary().subscribe({
      next: (sum) => this.summary.set(sum)
    });
  }

  setSeverityFilter(sev: string): void {
    this.severityFilter.set(sev);
    this.loadData();
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.loadData();
  }

  goToOrders(): void {
    this.router.navigate(['/orders']);
  }

  goToProducts(): void {
    this.router.navigate(['/products']);
  }

  getStockBarPercentage(current: number, min: number): number {
    if (min <= 0) return current > 0 ? 100 : 0;
    const pct = Math.round((current / min) * 100);
    return Math.min(100, Math.max(0, pct));
  }
}
