import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/services/report.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ReportsCatalogSummary, ReportMetadata } from '../../core/models/report.model';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFormatPipe],
  templateUrl: './reports.component.html'
})
export class ReportsComponent implements OnInit {
  private reportService = inject(ReportService);
  private dashboardService = inject(DashboardService);

  summary = signal<ReportsCatalogSummary | null>(null);
  dashboardData = signal<DashboardSummary | null>(null);
  loading = signal<boolean>(false);
  downloadingKey = signal<string | null>(null);

  startDate = signal<string>('');
  endDate = signal<string>('');
  activePreset = signal<string>('all');

  profitMargin = computed(() => {
    const d = this.dashboardData();
    if (!d || d.kpis.totalSalesAmount <= 0) return 0;
    const margin = ((d.kpis.totalSalesAmount - d.kpis.totalPurchasesAmount) / d.kpis.totalSalesAmount) * 100;
    return Math.round(margin * 10) / 10;
  });

  ngOnInit(): void {
    this.loadSummary();
    this.loadAnalytics();
  }

  loadSummary(): void {
    this.loading.set(true);
    this.reportService.getSummary().subscribe({
      next: (res) => {
        this.summary.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadAnalytics(): void {
    this.dashboardService.getSummary().subscribe({
      next: (data) => this.dashboardData.set(data),
      error: () => { }
    });
  }

  setDatePreset(preset: 'all' | '7days' | '30days'): void {
    this.activePreset.set(preset);
    const now = new Date();

    if (preset === 'all') {
      this.startDate.set('');
      this.endDate.set('');
      return;
    }

    this.endDate.set(now.toISOString().split('T')[0]);

    if (preset === '7days') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      this.startDate.set(past.toISOString().split('T')[0]);
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      this.startDate.set(past.toISOString().split('T')[0]);
    }
  }

  downloadCsv(report: ReportMetadata): void {
    this.downloadingKey.set(report.key);

    this.reportService.downloadReport(
      report.key,
      this.startDate() || undefined,
      this.endDate() || undefined
    ).subscribe({
      next: (blob) => {
        this.reportService.triggerBrowserDownload(
          blob,
          `${report.key}_${new Date().toISOString().split('T')[0]}.csv`
        );
        this.downloadingKey.set(null);
      },
      error: () => {
        this.downloadingKey.set(null);
      }
    });
  }

}
