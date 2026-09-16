import { Component, OnInit, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportService } from '../../core/services/report.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { ReportMetadata, ReportSummary } from '../../core/models/report.model';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { CountUpDirective } from '../../shared/directives/count-up.directive';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, CurrencyFormatPipe, AppButtonComponent, CountUpDirective],
  templateUrl: './reports.component.html'
})
export class ReportsComponent implements OnInit {
  private reportService = inject(ReportService);
  private dashboardService = inject(DashboardService);
  branchContextService = inject(BranchContextService);

  summary = signal<ReportSummary | null>(null);
  dashboardData = signal<DashboardSummary | null>(null);
  loading = signal<boolean>(false);
  downloadingKey = signal<string | null>(null);

  startDate = signal<string>('');
  endDate = signal<string>('');
  activePreset = signal<'all' | '7days' | '30days'>('all');

  profitMargin = computed(() => {
    const d = this.dashboardData();
    if (!d || d.kpis.totalSalesAmount <= 0) return 0;
    const margin = ((d.kpis.totalSalesAmount - d.kpis.totalPurchasesAmount) / d.kpis.totalSalesAmount) * 100;
    return Math.round(margin * 10) / 10;
  });

  constructor() {
    try {
      effect(() => {
        const wid = this.branchContextService.selectedWarehouseId();
        untracked(() => {
          this.loadSummary(wid);
          this.loadAnalytics(wid);
        });
      }, { allowSignalWrites: true });
    } catch {}
  }

  ngOnInit(): void {
    this.loadSummary();
    this.loadAnalytics();
  }

  loadSummary(warehouseId?: number | null): void {
    this.loading.set(true);
    const wid = warehouseId !== undefined ? warehouseId : this.branchContextService.selectedWarehouseId();
    this.reportService.getSummary(wid).subscribe({
      next: (res) => {
        this.summary.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadAnalytics(warehouseId?: number | null): void {
    const wid = warehouseId !== undefined ? warehouseId : this.branchContextService.selectedWarehouseId();
    this.dashboardService.getSummary(wid).subscribe({
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
    const wid = this.branchContextService.selectedWarehouseId();

    this.reportService.downloadReport(
      report.key,
      this.startDate() || undefined,
      this.endDate() || undefined,
      wid
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
