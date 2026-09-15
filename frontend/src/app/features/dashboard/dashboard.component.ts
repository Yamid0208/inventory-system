import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { CountUpDirective } from '../../shared/directives/count-up.directive';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyFormatPipe, AppButtonComponent, CountUpDirective],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private router = inject(Router);
  authService = inject(AuthService);

  summary = signal<DashboardSummary | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  greeting = signal<string>('Buenos días');
  refreshKey = signal<number>(0);

  ngOnInit(): void {
    this.updateGreeting();
    this.loadDashboardData();
  }

  updateGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) {
      this.greeting.set('Buenos días');
    } else if (hour < 18) {
      this.greeting.set('Buenas tardes');
    } else {
      this.greeting.set('Buenas noches');
    }
  }

  loadDashboardData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.refreshKey.update((k) => k + 1);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las métricas del dashboard.');
        this.loading.set(false);
      }
    });
  }

  navigateTo(route: string, queryParams?: Record<string, string>): void {
    this.router.navigate([route], { queryParams });
  }

  getInitials(name: string): string {
    if (!name) return 'S';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
}
