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
    await expect(metricTotal).toContainText('119');

    const metricCount = page.locator('[data-testid="metric-sales-count"]');
    await expect(metricCount).toBeVisible();
    await expect(metricCount).toHaveText('1');

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
    await expect(tableCash.locator('text=Balanced')).toBeVisible();
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
});
