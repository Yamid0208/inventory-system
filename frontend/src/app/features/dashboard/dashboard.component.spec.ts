import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/auth/services/auth.service';

describe('DashboardComponent (Unit Tests)', () => {
  const mockSummary = {
    kpis: {
      totalInventoryValuation: 12500000,
      totalStockUnits: 3450,
      totalProductsCount: 88,
      totalSalesAmount: 4500000,
      completedSalesCount: 42,
      totalPurchasesAmount: 1800000,
      pendingPurchasesCount: 3,
      lowStockProductsCount: 5,
      outOfStockProductsCount: 2
    },
    categories: [],
    recentMovements: [],
    criticalProducts: []
  };

  const dashboardServiceMock = {
    getSummary: vi.fn().mockReturnValue(of(mockSummary))
  };

  const routerMock = {
    navigate: vi.fn()
  };

  const authServiceMock = {
    currentUser: vi.fn().mockReturnValue({ fullName: 'Carlos Pérez' })
  };

  let component: DashboardComponent;

  beforeEach(() => {
    const injector = createEnvironmentInjector([
      DashboardComponent,
      { provide: DashboardService, useValue: dashboardServiceMock },
      { provide: Router, useValue: routerMock },
      { provide: AuthService, useValue: authServiceMock }
    ], null as any);

    component = injector.get(DashboardComponent);
  });

  it('should instantiate and load dashboard summary incrementing refreshKey', () => {
    expect(component).toBeTruthy();
    expect(component.refreshKey()).toBe(0);

    component.loadDashboardData();

    expect(dashboardServiceMock.getSummary).toHaveBeenCalled();
    expect(component.summary()?.kpis.totalInventoryValuation).toBe(12500000);
    expect(component.refreshKey()).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('should handle error when summary fails to load', () => {
    dashboardServiceMock.getSummary.mockReturnValueOnce(throwError(() => new Error('Server error')));

    component.loadDashboardData();

    expect(component.error()).toBe('No se pudieron cargar las métricas del dashboard.');
    expect(component.loading()).toBe(false);
  });

  it('should compute user initials properly', () => {
    expect(component.getInitials('Carlos Gómez')).toBe('CG');
    expect(component.getInitials('Yam')).toBe('YA');
    expect(component.getInitials('')).toBe('S');
  });

  it('should navigate to target route', () => {
    component.navigateTo('/sales', { new: 'true' });
    expect(routerMock.navigate).toHaveBeenCalledWith(['/sales'], { queryParams: { new: 'true' } });
  });
});
