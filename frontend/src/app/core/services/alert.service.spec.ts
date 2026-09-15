import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AlertService } from './alert.service';
import { StockAlert, StockAlertSummary } from '../models/alert.model';
import { of } from 'rxjs';

describe('AlertService (Unit Tests)', () => {
  let httpClientMock: any;
  let service: AlertService;
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const localStorageMock = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; })
    };
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });

    httpClientMock = {
      get: vi.fn().mockReturnValue(of([]))
    };

    const injector = createEnvironmentInjector([
      AlertService,
      { provide: HttpClient, useValue: httpClientMock }
    ], null as any);

    service = injector.get(AlertService);
  });

  it('should call get on /api/v1/alerts/stock with params', () => {
    service.getStockAlerts({ severity: 'critical', search: 'cable' }).subscribe();
    expect(httpClientMock.get).toHaveBeenCalled();
  });

  it('should call get on /api/v1/alerts/summary', () => {
    const mockSummary: StockAlertSummary = {
      totalAlerts: 3,
      criticalCount: 1,
      warningCount: 2,
      estimatedTotalReplenishmentCost: 150.50
    };
    httpClientMock.get.mockReturnValue(of(mockSummary));

    service.getSummary().subscribe();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/v1/alerts/summary');
    expect(service.totalAlerts()).toBe(3);
    expect(service.criticalCount()).toBe(1);
    expect(service.warningCount()).toBe(2);
  });

  it('should detect new alerts and set hasUnreadAlerts to true', () => {
    const mockAlerts: StockAlert[] = [
      {
        productId: 10,
        sku: 'SKU-01',
        name: 'Producto 1',
        currentStock: 2,
        minimumStock: 5,
        deficit: 3,
        suggestedQuantity: 8,
        unitPurchasePrice: 10,
        estimatedTotalCost: 80,
        severity: 'Warning',
        categoryName: 'General',
        supplierId: 1,
        supplierName: 'Proveedor'
      }
    ];

    httpClientMock.get.mockReturnValue(of(mockAlerts));
    service.getStockAlerts().subscribe();

    expect(service.hasUnreadAlerts()).toBe(true);
    expect(service.unreadCount()).toBe(1);
  });

  it('should detect severity escalation to Critical (sin stock) even if count does not change', () => {
    const mockAlertsWarning: StockAlert[] = [
      {
        productId: 10,
        sku: 'SKU-01',
        name: 'Producto 1',
        currentStock: 2,
        minimumStock: 5,
        deficit: 3,
        suggestedQuantity: 8,
        unitPurchasePrice: 10,
        estimatedTotalCost: 80,
        severity: 'Warning',
        categoryName: 'General',
        supplierId: 1,
        supplierName: 'Proveedor'
      }
    ];

    httpClientMock.get.mockReturnValue(of(mockAlertsWarning));
    service.getStockAlerts().subscribe();
    expect(service.hasUnreadAlerts()).toBe(true);

    // Usuario ve la alerta de stock bajo
    service.markAsSeen(mockAlertsWarning);
    expect(service.hasUnreadAlerts()).toBe(false);

    // Ahora el producto se queda sin stock (Critical)
    const mockAlertsCritical: StockAlert[] = [
      {
        ...mockAlertsWarning[0],
        currentStock: 0,
        severity: 'Critical'
      }
    ];

    httpClientMock.get.mockReturnValue(of(mockAlertsCritical));
    service.getStockAlerts().subscribe();

    // Debe detectar la nueva notificación crítica sin stock
    expect(service.hasUnreadAlerts()).toBe(true);
    expect(service.unreadCount()).toBe(1);
  });
});
