import { test, expect } from '@playwright/test';

test.describe('E2E Reports Module - INSINCRO POS Operational, Financial & Audit Suite', () => {

  const todayStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const firstDayOfMonthStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  })();

  test.beforeEach(async ({ page }) => {
    // Escuchar consola para depuración
    page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    page.on('response', res => { if (res.status() >= 400) console.log('RES ERROR:', res.status(), res.url()); });

    // Mock de endpoint de login y refresh
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-access-token-12345',
          refreshToken: 'mock-refresh-token-67890',
          user: {
            id: 1,
            email: 'admin@sgi.local',
            fullName: 'Administrador Demo',
            role: 'Admin',
            warehouseId: 1,
            hasAcceptedTerms: true
          }
        })
      });
    });

    await page.route('**/api/v1/auth/refresh*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-access-token-12345',
          refreshToken: 'mock-refresh-token-67890',
          user: {
            id: 1,
            email: 'admin@sgi.local',
            fullName: 'Administrador Demo',
            role: 'Admin',
            warehouseId: 1,
            hasAcceptedTerms: true
          }
        })
      });
    });

    await page.route('**/api/v1/alerts/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/v1/warehouses*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Sede Principal Norte', code: 'WH-01', isActive: true }
        ])
      });
    });

    await page.route('**/api/v1/dashboard/summary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kpis: {
            totalInventoryValuation: 5000000,
            totalStockUnits: 250,
            totalProductsCount: 15,
            totalSalesAmount: 1200000,
            totalPurchasesAmount: 800000
          },
          categories: []
        })
      });
    });

    // Mock de catálogo resumen
    await page.route('**/api/v1/reports/summary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reports: [
            { key: 'products', title: 'Catálogo de Productos', description: 'Inventario físico y valuación', icon: 'box', recordCount: 15, lastUpdated: new Date().toISOString() },
            { key: 'inventory', title: 'Kardex y Trazabilidad', description: 'Historial de movimientos', icon: 'clipboard', recordCount: 42, lastUpdated: new Date().toISOString() },
            { key: 'sales', title: 'Ventas y Facturación', description: 'Facturación detallada', icon: 'credit-card', recordCount: 28, lastUpdated: new Date().toISOString() },
            { key: 'purchases', title: 'Compras y Proveedores', description: 'Órdenes de abastecimiento', icon: 'shopping-bag', recordCount: 10, lastUpdated: new Date().toISOString() }
          ],
          totalExportableRecords: 95
        })
      });
    });

    // Mock de Métricas Ejecutivas de Ventas
    await page.route('**/api/v1/reports/sales/summary-metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalSalesAmount: 119000,
          totalSubtotal: 100000,
          totalTax: 19000,
          totalTransactions: 1,
          averageTicket: 119000,
          cashAmount: 0,
          electronicAmount: 119000,
          paymentMethods: [
            { paymentMethod: 'Transferencia', count: 1, totalAmount: 119000, percentage: 100 }
          ]
        })
      });
    });

    // Mock de Top Productos
    await page.route('**/api/v1/reports/sales/top-products*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            productId: 1,
            sku: 'SKU-TALADRO-01',
            productName: 'Taladro Percutor Bosch 1/2',
            categoryName: 'Herramientas Eléctricas',
            unitsSold: 15,
            totalRevenue: 3300000,
            averageUnitPrice: 220000
          }
        ])
      });
    });

    // Mock de Resumen Analítico con Comparativa vs Período Anterior
    await page.route('**/api/v1/reports/sales/analytics-summary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalRevenue: 28441000,
          netRevenue: 23900000,
          tax: 4541000,
          transactionCount: 9,
          averageTicket: 3160111.11,
          unitsSold: 13,
          prevTotalRevenue: 27370000,
          prevTransactionCount: 3,
          prevAverageTicket: 9123333.33,
          revenueGrowthPct: 3.9,
          transactionsGrowthPct: 200,
          ticketGrowthPct: -65.4,
          paymentMethods: [
            { method: 'Cash', totalAmount: 27370000, transactionCount: 3, percentage: 96.2 },
            { method: 'Mixed', totalAmount: 1071000, transactionCount: 6, percentage: 3.8 }
          ]
        })
      });
    });

    // Mock de Ventas por Categoría
    await page.route('**/api/v1/reports/sales/by-category*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            categoryId: 9,
            categoryName: 'Electrónica',
            unitsSold: 7,
            totalRevenue: 27370000,
            sharePercentage: 96.2,
            transactionCount: 3
          },
          {
            categoryId: 1,
            categoryName: 'Tecnología',
            unitsSold: 6,
            totalRevenue: 1071000,
            sharePercentage: 3.8,
            transactionCount: 6
          }
        ])
      });
    });

    // Mock de Horarios de Mayor Actividad
    await page.route('**/api/v1/reports/sales/hourly-activity*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { hour: 14, hourLabel: '14:00 - 14:59', transactionCount: 15, totalRevenue: 12000000, isPeakHour: true },
          { hour: 15, hourLabel: '15:00 - 15:59', transactionCount: 8, totalRevenue: 5000000, isPeakHour: false }
        ])
      });
    });

    // Mock de Rendimiento por Empleado
    await page.route('**/api/v1/reports/sales/by-employee*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            userId: 1,
            employeeName: 'Administrador del Sistema',
            role: 'Admin',
            transactionCount: 9,
            totalRevenue: 28441000,
            averageTicket: 3160111.11,
            sharePercentage: 100
          }
        ])
      });
    });

    // Mock de Tendencias de Ventas
    await page.route('**/api/v1/reports/sales/trends*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { date: '2026-09-09', label: '09/09', transactionCount: 3, totalRevenue: 27370000 },
          { date: '2026-11-01', label: '01/11', transactionCount: 6, totalRevenue: 1071000 }
        ])
      });
    });

    // Mock de Finanzas y Rentabilidad (CMV Histórico)
    await page.route('**/api/v1/reports/finance/profitability*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalRevenue: 3300000,
          totalCostOfGoodsSold: 2250000,
          grossProfit: 1050000,
          grossMarginPercentage: 31.8,
          totalItemsSold: 15,
          productDetails: {
            items: [
              {
                productId: 1,
                sku: 'SKU-TALADRO-01',
                productName: 'Taladro Percutor Bosch 1/2',
                categoryName: 'Herramientas Eléctricas',
                unitsSold: 15,
                totalRevenue: 3300000,
                costOfGoodsSold: 2250000,
                grossProfit: 1050000,
                grossMarginPercentage: 31.8
              }
            ],
            totalCount: 1,
            pageNumber: 1,
            pageSize: 10,
            totalPages: 1
          }
        })
      });
    });

    // Mock de Caja POS (Arqueo y Conciliación)
    await page.route('**/api/v1/reports/cash-register/reconciliation*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalOpeningBalance: 200000,
          totalExpectedCash: 850000,
          totalActualCash: 850000,
          totalDifference: 0,
          totalElectronicInflow: 540000,
          totalSessionsCount: 1,
          sessions: {
            items: [
              {
                sessionId: 45,
                sessionNumber: 'SES-2026-0001',
                cashierName: 'Carlos Cajero',
                openedAt: new Date().toISOString(),
                closedAt: new Date().toISOString(),
                status: 'Closed',
                initialCash: 200000,
                totalSales: 650000,
                totalCashInflow: 650000,
                totalCashOutflow: 0,
                totalElectronicInflow: 540000,
                expectedCash: 850000,
                actualCash: 850000,
                difference: 0,
                differenceStatus: 'Balanced'
              }
            ],
            totalCount: 1,
            pageNumber: 1,
            pageSize: 10,
            totalPages: 1
          }
        })
      });
    });

    // Mock de Auditoría de Operaciones Sensibles
    await page.route('**/api/v1/reports/audit/activity*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 99,
              createdAt: new Date().toISOString(),
              entityName: 'Inventario',
              action: 'Ajuste de Stock',
              details: 'Ajuste de inventario por merma justificada',
              userName: 'admin@sgi.local',
              ipAddress: '127.0.0.1'
            }
          ],
          totalCount: 1,
          pageNumber: 1,
          pageSize: 10,
          totalPages: 1
        })
      });
    });

    // Mock de Ventas Paginadas
    await page.route('**/api/v1/reports/sales/data*', async (route) => {
      const url = new URL(route.request().url());
      const startDate = url.searchParams.get('startDate');
      const isToday = startDate === todayStr;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 101,
              saleNumber: 'VTA-2026-0001',
              saleDate: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              customerName: 'Comercializadora Andina S.A.S.',
              customerTaxId: '900123456-7',
              paymentMethod: 'Transferencia',
              status: 'Completada',
              subtotal: 100000,
              tax: 19000,
              total: 119000,
              itemsCount: 3
            },
            ...(isToday ? [] : [
              {
                id: 102,
                saleNumber: 'VTA-2026-0002',
                saleDate: new Date(Date.now() - 86400000 * 3).toISOString(),
                createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
                customerName: 'Ferretería El Progreso',
                customerTaxId: '800987654-3',
                paymentMethod: 'Efectivo',
                status: 'Completada',
                subtotal: 250000,
                tax: 47500,
                total: 297500,
                itemsCount: 5
              }
            ])
          ],
          totalCount: isToday ? 1 : 2,
          pageNumber: 1,
          pageSize: 10,
          totalPages: 1,
          totalAmount: isToday ? 119000 : 416500,
          totalQuantity: isToday ? 1 : 2
        })
      });
    });

    // Mock de Kardex / Movimientos
    await page.route('**/api/v1/reports/inventory/data*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 201,
              movementNumber: 'MOV-2026-0001',
              createdAt: new Date().toISOString(),
              type: 'Entrada',
              productId: 1,
              productSku: 'SKU-TALADRO-01',
              productName: 'Taladro Percutor Bosch 1/2',
              quantityDelta: 10,
              previousStock: 5,
              newStock: 15,
              unitPrice: 180000,
              operatorName: 'Carlos Gómez',
              reference: 'OC-1002',
              notes: 'Recepción lote de proveedor'
            }
          ],
          totalCount: 1,
          pageNumber: 1,
          pageSize: 10,
          totalPages: 1
        })
      });
    });

    // Mock de Catálogo de Productos
    await page.route('**/api/v1/reports/products/data*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              sku: 'SKU-TALADRO-01',
              name: 'Taladro Percutor Bosch 1/2',
              categoryName: 'Herramientas Eléctricas',
              supplierName: 'Distribuidora Mayorista S.A.',
              purchasePrice: 150000,
              salePrice: 220000,
              currentStock: 15,
              minimumStock: 5,
              valuation: 2250000,
              status: 'Saludable',
              isActive: true,
              createdAt: new Date().toISOString()
            }
          ],
          totalCount: 1,
          pageNumber: 1,
          pageSize: 10,
          totalPages: 1,
          totalAmount: 2250000
        })
      });
    });

    // Mock de Bajo Stock
    await page.route('**/api/v1/reports/low-stock/data*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 5,
              sku: 'SKU-CINTA-CRITICA',
              name: 'Cinta Aislante Industrial 3M',
              categoryName: 'Insumos Eléctricos',
              supplierName: '3M Colombia',
              currentStock: 1,
              minimumStock: 10,
              deficit: 9,
              purchasePrice: 4000,
              estimatedRestockCost: 36000,
              status: 'Bajo Stock'
            }
          ],
          totalCount: 1,
          pageNumber: 1,
          pageSize: 10,
          totalPages: 1,
          totalAmount: 36000
        })
      });
    });

    // Mock de Compras
    await page.route('**/api/v1/reports/purchases/data*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 301,
              purchaseNumber: 'COM-2026-0001',
              createdAt: new Date().toISOString(),
              supplierName: 'Distribuidora Mayorista S.A.',
              supplierTaxId: '900888777-1',
              status: 'Recibida',
              subtotal: 1500000,
              tax: 285000,
              total: 1785000,
              itemsCount: 10
            }
          ],
          totalCount: 1,
          pageNumber: 1,
          pageSize: 10,
          totalPages: 1,
          totalAmount: 1785000
        })
      });
    });

    // Mock de Valoración de Inventario - KPIs y Resumen
    await page.route('**/api/v1/reports/inventory/valuation-summary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalCostValuation: 85000000,
          totalRetailValuation: 125000000,
          potentialProfit: 40000000,
          profitMarginPercentage: 32.0,
          totalStockUnits: 250,
          totalProductsCount: 20,
          stagnantCapitalAmount: 15000000,
          stagnantProductsCount: 3,
          categoryACount: 4,
          categoryACostAmount: 68000000,
          categoryASharePct: 80.0,
          categoryBCount: 6,
          categoryBCostAmount: 12750000,
          categoryBSharePct: 15.0,
          categoryCCount: 10,
          categoryCCostAmount: 4250000,
          categoryCSharePct: 5.0
        })
      });
    });

    // Mock de Valoración de Inventario - Por Categoría
    await page.route('**/api/v1/reports/inventory/valuation-by-category*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            categoryId: 1,
            categoryName: 'Electrónica y Audio',
            totalUnits: 50,
            totalCostValuation: 60000000,
            totalRetailValuation: 90000000,
            potentialProfit: 30000000,
            profitMarginPercentage: 33.3,
            capitalSharePercentage: 70.6,
            productCount: 2
          },
          {
            categoryId: 2,
            categoryName: 'Herramientas',
            totalUnits: 200,
            totalCostValuation: 25000000,
            totalRetailValuation: 35000000,
            potentialProfit: 10000000,
            profitMarginPercentage: 28.6,
            capitalSharePercentage: 29.4,
            productCount: 1
          }
        ])
      });
    });

    // Mock de Valoración de Inventario - Detalle Tabular con Filtros
    await page.route('**/api/v1/reports/inventory/valuation-details*', async (route) => {
      const url = new URL(route.request().url());
      const abc = url.searchParams.get('abcClass');
      const stagnantOnly = url.searchParams.get('stagnantOnly') === 'true';
      const search = (url.searchParams.get('searchTerm') || '').toLowerCase();

      const allItems = [
        {
          productId: 1,
          sku: 'SKU-JBL-PARTY',
          productName: 'Parlante JBL PartyBox 310',
          categoryId: 1,
          categoryName: 'Electrónica y Audio',
          supplierName: 'Harman Kardon Colombia',
          currentStock: 10,
          minimumStock: 2,
          unitCost: 3000000,
          unitPrice: 4500000,
          totalCostValuation: 30000000,
          totalRetailValuation: 45000000,
          potentialProfit: 15000000,
          profitMarginPercentage: 33.3,
          abcClassification: 'A',
          daysWithoutSales: 5,
          isStagnant: false,
          lastSaleDate: new Date().toISOString()
        },
        {
          productId: 2,
          sku: 'SKU-BOSE-S1',
          productName: 'Sistema Bose S1 Pro+',
          categoryId: 1,
          categoryName: 'Electrónica y Audio',
          supplierName: 'Bose Distribución',
          currentStock: 10,
          minimumStock: 2,
          unitCost: 3000000,
          unitPrice: 4200000,
          totalCostValuation: 30000000,
          totalRetailValuation: 42000000,
          potentialProfit: 12000000,
          profitMarginPercentage: 28.6,
          abcClassification: 'A',
          daysWithoutSales: 45,
          isStagnant: true,
          lastSaleDate: null
        },
        {
          productId: 3,
          sku: 'SKU-TALADRO-BOSCH',
          productName: 'Taladro Percutor Bosch 1/2',
          categoryId: 2,
          categoryName: 'Herramientas',
          supplierName: 'Bosch Colombia',
          currentStock: 20,
          minimumStock: 5,
          unitCost: 600000,
          unitPrice: 900000,
          totalCostValuation: 12000000,
          totalRetailValuation: 18000000,
          potentialProfit: 6000000,
          profitMarginPercentage: 33.3,
          abcClassification: 'B',
          daysWithoutSales: 12,
          isStagnant: false,
          lastSaleDate: new Date().toISOString()
        },
        {
          productId: 4,
          sku: 'SKU-CABLE-HDMI',
          productName: 'Cable HDMI 4K Alta Velocidad',
          categoryId: 1,
          categoryName: 'Electrónica y Audio',
          supplierName: 'Genéricos S.A.',
          currentStock: 50,
          minimumStock: 10,
          unitCost: 85000,
          unitPrice: 140000,
          totalCostValuation: 4250000,
          totalRetailValuation: 7000000,
          potentialProfit: 2750000,
          profitMarginPercentage: 39.3,
          abcClassification: 'C',
          daysWithoutSales: 8,
          isStagnant: false,
          lastSaleDate: new Date().toISOString()
        }
      ];

      let filtered = allItems;
      if (abc) {
        filtered = filtered.filter(i => i.abcClassification.toUpperCase() === abc.toUpperCase());
      }
      if (stagnantOnly) {
        filtered = filtered.filter(i => i.isStagnant);
      }
      if (search) {
        filtered = filtered.filter(i => i.productName.toLowerCase().includes(search) || i.sku.toLowerCase().includes(search));
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: filtered,
          totalCount: filtered.length,
          pageNumber: 1,
          pageSize: 10,
          totalPages: 1,
          totalCostAmount: filtered.reduce((acc, i) => acc + i.totalCostValuation, 0),
          totalQuantity: filtered.reduce((acc, i) => acc + i.currentStock, 0)
        })
      });
    });

    // Mock de descarga CSV Valoración
    await page.route('**/api/v1/reports/inventory/valuation/csv*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: {
          'Content-Disposition': 'attachment; filename="reporte_inventory-valuation_export.csv"'
        },
        body: '\uFEFFClasificación ABC,SKU,Producto,Categoría,Stock Actual,Costo Unitario,Precio Venta,Valoración al Costo,Valoración Comercial,Utilidad Proyectada,Margen Comercial (%),Días sin Ventas,Estado Rotación\nCLASE A,SKU-JBL-PARTY,Parlante JBL,Electrónica,10,$3.000.000,$4.500.000,$30.000.000,$45.000.000,$15.000.000,33.3%,5,Activo'
      });
    });

    // Mock de descarga CSV
    await page.route('**/api/v1/reports/*/csv*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: {
          'Content-Disposition': 'attachment; filename="reporte_export.csv"'
        },
        body: 'ID,Detalle,Total\n1,Prueba CSV,1000\n'
      });
    });

    // Iniciar sesión para obtener tokens válidos y navegar en la SPA
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[formcontrolname="email"], #email').first();
    const passwordInput = page.locator('input[type="password"], input[formcontrolname="password"], #password').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill('admin@sgi.local');
    await passwordInput.fill('Admin123*');
    await submitBtn.click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('TC-REP-01: Carga con preset "Hoy" por defecto, métricas ejecutivas de ventas y tabla transaccional', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForURL('**/reports', { timeout: 10000 });

    // 1. Encabezado principal del Centro de Reportes INSINCRO POS
    await expect(page.getByRole('heading', { name: /Suite de Inteligencia Operativa y Financiera/i })).toBeVisible({ timeout: 5000 });

    // 2. Preset "Hoy" activo por defecto con estilos visibles
    const todayPresetBtn = page.locator('[data-testid="preset-today"]');
    await expect(todayPresetBtn).toBeVisible();
    await expect(todayPresetBtn).toHaveClass(/bg-primary-600/);

    // 3. Inputs de fecha sincronizados con hoy
    const startDateInput = page.locator('[data-testid="input-start-date"]');
    const endDateInput = page.locator('[data-testid="input-end-date"]');
    await expect(startDateInput).toHaveValue(todayStr);
    await expect(endDateInput).toHaveValue(todayStr);

    // 4. Tarjetas Analíticas de Ventas presentes
    const metricTotal = page.locator('[data-testid="metric-sales-total"]');
    await expect(metricTotal).toBeVisible();
    await expect(metricTotal).toContainText('28.441.000');

    const metricCount = page.locator('[data-testid="metric-sales-count"]');
    await expect(metricCount).toBeVisible();
    await expect(metricCount).toHaveText('9');

    // 5. Verificar título de la tabla y estado activo de la sub-pestaña
    const tabSales = page.locator('[data-testid="tab-sales"]');
    await expect(tabSales).toHaveClass(/bg-primary-600/);
    await expect(page.locator('[data-testid="table-title"]')).toContainText(/Historial y Facturación de Ventas/i);

    // 6. Tabla de ventas renderizada
    const tableSales = page.locator('[data-testid="table-sales"]');
    await expect(tableSales).toBeVisible({ timeout: 5000 });
    await expect(tableSales.locator('text=VTA-2026-0001')).toBeVisible();
    await expect(tableSales.locator('text=Comercializadora Andina S.A.S.')).toBeVisible();
  });

  test('TC-REP-02: Filtros rápidos temporales ("Ayer", "Mes Actual") y cambio a sub-tab Top Productos', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForURL('**/reports', { timeout: 10000 });

    // 1. Probar preset "Mes Actual"
    const monthPresetBtn = page.locator('[data-testid="preset-this-month"]');
    await expect(monthPresetBtn).toBeVisible();
    await monthPresetBtn.click();
    await expect(monthPresetBtn).toHaveClass(/bg-primary-600/);

    const startDateInput = page.locator('[data-testid="input-start-date"]');
    await expect(startDateInput).toHaveValue(firstDayOfMonthStr);

    // Con el preset de mes se muestran 2 ventas
    const tableSales = page.locator('[data-testid="table-sales"]');
    await expect(tableSales.locator('text=VTA-2026-0002')).toBeVisible({ timeout: 5000 });

    // 2. Cambiar a sub-tab Top Productos
    const tabTop = page.locator('[data-testid="tab-sales-top"]');
    await expect(tabTop).toBeVisible();
    await tabTop.click();
    await expect(tabTop).toHaveClass(/bg-primary-600/);

    // 3. Verificar título contextual de tabla y renderizado
    await expect(page.locator('[data-testid="table-title"]')).toContainText(/Top Productos Más Vendidos/i);
    const tableTop = page.locator('[data-testid="table-sales-top"]');
    await expect(tableTop).toBeVisible({ timeout: 5000 });
    await expect(tableTop.locator('text=SKU-TALADRO-01')).toBeVisible();
    await expect(tableTop.locator('text=Taladro Percutor Bosch 1/2')).toBeVisible();
  });

  test('TC-REP-03: Categoría Finanzas & Rentabilidad - Margen de utilidad con CMV histórico', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForURL('**/reports', { timeout: 10000 });

    // 1. Cambiar a la categoría de Finanzas
    const tabCategoryFinance = page.locator('[data-testid="tab-category-finance"]');
    await expect(tabCategoryFinance).toBeVisible();
    await tabCategoryFinance.click();

    // 2. Verificar KPI Cards de Rentabilidad
    const metricCogs = page.locator('[data-testid="metric-finance-cogs"]');
    await expect(metricCogs).toBeVisible({ timeout: 5000 });
    await expect(metricCogs).toContainText('2.250.000');

    const metricProfit = page.locator('[data-testid="metric-finance-profit"]');
    await expect(metricProfit).toBeVisible();
    await expect(metricProfit).toContainText('1.050.000');

    const metricMargin = page.locator('[data-testid="metric-finance-margin"]');
    await expect(metricMargin).toBeVisible();
    await expect(metricMargin).toContainText('31.8%');

    // 3. Verificar tabla de Rentabilidad por Producto
    const tableFinance = page.locator('[data-testid="table-finance"]');
    await expect(tableFinance).toBeVisible();
    await expect(tableFinance.locator('text=SKU-TALADRO-01')).toBeVisible();
    await expect(tableFinance.locator('text=Herramientas Eléctricas')).toBeVisible();
  });

  test('TC-REP-04: Categoría Caja POS - Conciliación de Arqueos y separación de Efectivo vs Electrónico', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForURL('**/reports', { timeout: 10000 });

    // 1. Cambiar a la categoría de Caja POS
    const tabCategoryCash = page.locator('[data-testid="tab-category-cash"]');
    await expect(tabCategoryCash).toBeVisible();
    await tabCategoryCash.click();

    // 2. Verificar KPI Cards de Conciliación
    const metricExpected = page.locator('[data-testid="metric-cash-expected"]');
    await expect(metricExpected).toBeVisible({ timeout: 5000 });
    await expect(metricExpected).toContainText('850.000');

    const metricDifference = page.locator('[data-testid="metric-cash-difference"]');
    await expect(metricDifference).toBeVisible();
    await expect(metricDifference).toContainText('$0');

    // 3. Verificar tabla de Arqueos y Sesiones
    const tableCash = page.locator('[data-testid="table-cash-reconciliation"]');
    await expect(tableCash).toBeVisible();
    await expect(tableCash.locator('text=SES-2026-0001')).toBeVisible();
    await expect(tableCash.locator('text=Carlos Cajero')).toBeVisible();
    await expect(tableCash.locator('text=/Balanced|Cuadrada/')).toBeVisible();
  });

  test('TC-REP-05: Categoría Auditoría, Kardex y Exportación CSV contextual', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForURL('**/reports', { timeout: 10000 });

    // 1. Probar categoría Auditoría
    const tabCategoryAudit = page.locator('[data-testid="tab-category-audit"]');
    await expect(tabCategoryAudit).toBeVisible();
    await tabCategoryAudit.click();

    const tableAudit = page.locator('[data-testid="table-audit"]');
    await expect(tableAudit).toBeVisible({ timeout: 5000 });
    await expect(tableAudit.locator('text=Ajuste de Stock')).toBeVisible();
    await expect(tableAudit.locator('text=admin@sgi.local')).toBeVisible();

    // 2. Probar categoría Inventario
    const tabCategoryInventory = page.locator('[data-testid="tab-category-inventory"]');
    await tabCategoryInventory.click();

    const tableInventory = page.locator('[data-testid="table-inventory"]');
    await expect(tableInventory).toBeVisible({ timeout: 5000 });
    await expect(tableInventory.locator('text=MOV-2026-0001')).toBeVisible();

    // 3. Probar Exportación CSV
    const exportBtn = page.locator('[data-testid="btn-export-csv"]');
    await expect(exportBtn).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/reporte_.*\.csv/);
  });

  test('TC-REP-06: Suite de Análisis Empresarial - Ventas por Categoría, Horarios Pico y Rendimiento por Empleado', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForURL('**/reports', { timeout: 10000 });

    // 1. Verificar sub-pestaña Por Categoría
    const tabCategories = page.locator('[data-testid="tab-sales-categories"]');
    await expect(tabCategories).toBeVisible({ timeout: 5000 });
    await tabCategories.click();

    const tableCategories = page.locator('[data-testid="table-sales-categories"]');
    await expect(tableCategories).toBeVisible({ timeout: 5000 });
    await expect(tableCategories.locator('text=Electrónica')).toBeVisible();
    await expect(tableCategories.locator('text=96.2%')).toBeVisible();

    // 2. Verificar sub-pestaña Horarios Pico (Heatmap)
    const tabHourly = page.locator('[data-testid="tab-sales-hourly"]');
    await expect(tabHourly).toBeVisible({ timeout: 5000 });
    await tabHourly.click();

    const tableHourly = page.locator('[data-testid="table-sales-hourly"]');
    await expect(tableHourly).toBeVisible({ timeout: 5000 });
    await expect(tableHourly.locator('text=14:00 - 14:59')).toBeVisible();
    await expect(tableHourly.locator('text=HORA PICO')).toBeVisible();

    // 3. Verificar sub-pestaña Por Vendedor / Empleado
    const tabEmployees = page.locator('[data-testid="tab-sales-employees"]');
    await expect(tabEmployees).toBeVisible({ timeout: 5000 });
    await tabEmployees.click();

    const tableEmployees = page.locator('[data-testid="table-sales-employees"]');
    await expect(tableEmployees).toBeVisible({ timeout: 5000 });
    await expect(tableEmployees.locator('text=Administrador del Sistema')).toBeVisible();
    await expect(tableEmployees.locator('text=/Admin|Administrador/').first()).toBeVisible();
  });

  test('TC-REP-07: Suite de Valoración de Inventario - KPIs de Existencias, Concentración por Categoría y Clasificación ABC Pareto', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForURL('**/reports', { timeout: 10000 });

    // 1. Navegar a categoría Inventario
    const tabCategoryInventory = page.locator('[data-testid="tab-category-inventory"]');
    await expect(tabCategoryInventory).toBeVisible({ timeout: 5000 });
    await tabCategoryInventory.click();

    // 2. Hacer click en la sub-pestaña "Valoración de Inventario"
    const tabValuation = page.locator('[data-testid="tab-inventory-valuation"]');
    await expect(tabValuation).toBeVisible({ timeout: 5000 });
    await tabValuation.click();

    // 3. Validar los 4 KPIs Financieros de Existencias
    const metricCost = page.locator('[data-testid="metric-valuation-cost"]');
    await expect(metricCost).toBeVisible({ timeout: 5000 });
    await expect(metricCost).toHaveText(/\$85\.000\.000/);

    const metricRetail = page.locator('[data-testid="metric-valuation-retail"]');
    await expect(metricRetail).toBeVisible();
    await expect(metricRetail).toHaveText(/\$125\.000\.000/);

    const metricProfit = page.locator('[data-testid="metric-valuation-profit"]');
    await expect(metricProfit).toBeVisible();
    await expect(metricProfit).toHaveText(/\$40\.000\.000/);

    const metricUnits = page.locator('[data-testid="metric-valuation-units"]');
    await expect(metricUnits).toBeVisible();
    await expect(metricUnits).toHaveText(/250/);

    // 4. Validar Concentración Patrimonial y Clasificación ABC
    await expect(page.locator('text=Concentración Patrimonial por Categoría')).toBeVisible();
    await expect(page.locator('text=Clasificación ABC (Pareto 80/20)')).toBeVisible();

    // 5. Validar Tabla de Valoración Detallada
    const tableValuation = page.locator('[data-testid="table-inventory-valuation"]');
    await expect(tableValuation).toBeVisible({ timeout: 5000 });

    // Verificar filas de productos con sus badges ABC
    await expect(tableValuation.locator('text=SKU-JBL-PARTY')).toBeVisible();
    await expect(tableValuation.locator('text=Parlante JBL PartyBox 310')).toBeVisible();
    await expect(tableValuation.locator('text=CLASE A').first()).toBeVisible();
    await expect(tableValuation.locator('text=CLASE B').first()).toBeVisible();
    await expect(tableValuation.locator('text=CLASE C').first()).toBeVisible();

    // 6. Probar Exportación CSV de Valoración
    const exportBtn = page.locator('[data-testid="btn-export-csv"]');
    await expect(exportBtn).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/reporte_inventory-valuation_.*\.csv/);
  });

  test('TC-REP-08: Suite de Valoración de Inventario - Filtros de Clase ABC, Alerta de Capital Estancado y Búsqueda', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForURL('**/reports', { timeout: 10000 });

    // 1. Navegar a categoría Inventario y sub-pestaña Valoración
    await page.locator('[data-testid="tab-category-inventory"]').click();
    await page.locator('[data-testid="tab-inventory-valuation"]').click();

    // 2. Verificar banner de alerta de Capital Estancado
    const stagnantCost = page.locator('[data-testid="metric-stagnant-cost"]');
    await expect(stagnantCost).toBeVisible({ timeout: 5000 });
    await expect(stagnantCost).toHaveText(/\$15\.000\.000/);

    // 3. Filtrar por Clase A haciendo click en la tarjeta de Clase A
    const filterClassA = page.locator('[data-testid="btn-filter-abc-a"]');
    await expect(filterClassA).toBeVisible();
    await filterClassA.click();

    // Verificar que la tabla se actualice y sólo muestre ítems de Clase A
    const tableValuation = page.locator('[data-testid="table-inventory-valuation"]');
    await expect(tableValuation.locator('text=SKU-JBL-PARTY')).toBeVisible();
    await expect(tableValuation.locator('text=SKU-BOSE-S1')).toBeVisible();
    await expect(tableValuation.locator('text=SKU-TALADRO-BOSCH')).not.toBeVisible();
    await expect(tableValuation.locator('text=SKU-CABLE-HDMI')).not.toBeVisible();

    // 4. Filtrar por Solo Capital Estancado
    const toggleStagnant = page.locator('[data-testid="btn-toggle-stagnant"]');
    await expect(toggleStagnant).toBeVisible();
    await toggleStagnant.click();

    // Ahora sólo debe mostrar el producto estancado (Bose S1)
    await expect(tableValuation.locator('text=SKU-BOSE-S1')).toBeVisible();
    await expect(tableValuation.locator('text=45d sin venta')).toBeVisible();
    await expect(tableValuation.locator('text=SKU-JBL-PARTY')).not.toBeVisible();
  });
});
