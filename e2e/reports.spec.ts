import { test, expect } from '@playwright/test';

test.describe('E2E Reports Module - Interactive Tables & Date Filters Suite', () => {

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

    // Mock de Ventas
    await page.route('**/api/v1/reports/sales/data*', async (route) => {
      const url = new URL(route.request().url());
      const startDate = url.searchParams.get('startDate');

      // Si es filtro "Hoy", devolver ventas de hoy; si es "Mes Actual", devolver un conjunto mayor
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
            },
            {
              id: 202,
              movementNumber: 'MOV-2026-0002',
              createdAt: new Date().toISOString(),
              type: 'Salida',
              productId: 2,
              productSku: 'SKU-PINTURA-02',
              productName: 'Pintura Vinilo Blanco 1 Galón',
              quantityDelta: -2,
              previousStock: 20,
              newStock: 18,
              unitPrice: 45000,
              operatorName: 'Carlos Gómez',
              reference: 'VTA-2026-0001',
              notes: 'Despacho cliente mostrador'
            }
          ],
          totalCount: 2,
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

  test('TC-REP-01: Inicialización con preset "Hoy" por defecto y renderizado de tabla', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForURL('**/reports', { timeout: 10000 });

    // 1. Verificar encabezado del centro de reportes
    await expect(page.getByRole('heading', { name: /Centro de Reportes y Datos Operativos/i })).toBeVisible({ timeout: 5000 });

    // 2. Verificar que el preset "Hoy" está activo por defecto
    const todayPresetBtn = page.locator('[data-testid="preset-today"]');
    await expect(todayPresetBtn).toBeVisible();
    await expect(todayPresetBtn).toHaveClass(/bg-primary-600/);

    // 3. Verificar que los inputs de fecha tienen la fecha actual
    const startDateInput = page.locator('[data-testid="input-start-date"]');
    const endDateInput = page.locator('[data-testid="input-end-date"]');
    await expect(startDateInput).toHaveValue(todayStr);
    await expect(endDateInput).toHaveValue(todayStr);

    // 4. Verificar que la tabla de ventas se renderiza con el registro de hoy
    const tableSales = page.locator('[data-testid="table-sales"]');
    await expect(tableSales).toBeVisible({ timeout: 5000 });
    await expect(tableSales.locator('text=VTA-2026-0001')).toBeVisible();
    await expect(tableSales.locator('text=Comercializadora Andina S.A.S.')).toBeVisible();

    // 5. Verificar sumatorias en tarjetas de KPI
    await expect(page.locator('[data-testid="total-records-count"]')).toHaveText('1');
    await expect(page.locator('[data-testid="total-amount-sum"]')).toContainText('119');
  });

  test('TC-REP-02: Cambio interactivo al preset "Mes Actual" actualiza fechas y tabla', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForURL('**/reports', { timeout: 10000 });

    // Hacer clic en el preset "Mes Actual"
    const monthPresetBtn = page.locator('[data-testid="preset-this-month"]');
    await expect(monthPresetBtn).toBeVisible();
    await monthPresetBtn.click();

    // 1. El botón de Mes Actual debe tener la clase activa
    await expect(monthPresetBtn).toHaveClass(/bg-primary-600/);

    // 2. El input startDate debe haber cambiado al día 1 del mes en curso
    const startDateInput = page.locator('[data-testid="input-start-date"]');
    await expect(startDateInput).toHaveValue(firstDayOfMonthStr);

    // 3. La tabla debe reflejar los registros acumulados del mes (2 facturas)
    const tableSales = page.locator('[data-testid="table-sales"]');
    await expect(tableSales.locator('text=VTA-2026-0002')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="total-records-count"]')).toHaveText('2');
  });

  test('TC-REP-03: Navegación entre pestañas de reportes (Kardex, Catálogo y Bajo Stock)', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForURL('**/reports', { timeout: 10000 });

    // 1. Cambiar a Kardex
    const tabInventory = page.locator('[data-testid="tab-inventory"]');
    await tabInventory.click();

    const tableInventory = page.locator('[data-testid="table-inventory"]');
    await expect(tableInventory).toBeVisible({ timeout: 5000 });
    await expect(tableInventory.locator('text=MOV-2026-0001')).toBeVisible();
    await expect(tableInventory.locator('text=Taladro Percutor Bosch 1/2')).toBeVisible();
    await expect(tableInventory.locator('text=+10')).toBeVisible();

    // 2. Cambiar a Catálogo
    const tabProducts = page.locator('[data-testid="tab-products"]');
    await tabProducts.click();

    const tableProducts = page.locator('[data-testid="table-products"]');
    await expect(tableProducts).toBeVisible({ timeout: 5000 });
    await expect(tableProducts.locator('text=SKU-TALADRO-01')).toBeVisible();
    await expect(tableProducts.locator('text=Herramientas Eléctricas')).toBeVisible();

    // 3. Cambiar a Bajo Stock
    const tabLowStock = page.locator('[data-testid="tab-low-stock"]');
    await tabLowStock.click();

    const tableLowStock = page.locator('[data-testid="table-low-stock"]');
    await expect(tableLowStock).toBeVisible({ timeout: 5000 });
    await expect(tableLowStock.locator('text=SKU-CINTA-CRITICA')).toBeVisible();
    await expect(tableLowStock.locator('text=-9')).toBeVisible();
  });

  test('TC-REP-04: Botón de Exportación CSV ejecuta la descarga con los filtros seleccionados', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForURL('**/reports', { timeout: 10000 });

    // Localizar botón de exportar
    const exportBtn = page.locator('[data-testid="btn-export-csv"]');
    await expect(exportBtn).toBeVisible();

    // Esperar a que se inicie la descarga al pulsar el botón
    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;

    // Verificar nombre del archivo generado con formato CSV
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/reporte_sales_.*\.csv/);
  });
});
