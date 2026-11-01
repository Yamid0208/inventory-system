import { test, expect } from '@playwright/test';

test.describe('E2E POS Cash Register Module Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Iniciar sesión con credenciales de Administrador
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[formcontrolname="email"], #email').first();
    const passwordInput = page.locator('input[type="password"], input[formcontrolname="password"], #password').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill('admin@sgi.local');
    await passwordInput.fill('Admin123*');
    await submitBtn.click();

    // Esperar redirección al dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Si aparece el modal de términos y condiciones (bloqueante por ley), aceptarlo
    const termsModal = page.locator('#legal-modal-title');
    if (await termsModal.isVisible({ timeout: 2000 })) {
      const checkbox = page.locator('input[type="checkbox"]').last();
      await checkbox.check();
      const acceptBtn = page.locator('button:has-text("Aceptar y Continuar")');
      await acceptBtn.click();
      await page.waitForTimeout(1500);
    }
  });

  test('TC-CR-01: Navegación al Módulo de Caja desde el menú lateral', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // Localizar el enlace de Caja POS en el menú lateral
    const cashMenuLink = page.locator('a[href="/cash-register"]').first();
    await expect(cashMenuLink).toBeVisible({ timeout: 5000 });
    await cashMenuLink.click();

    await page.waitForTimeout(3000);
    console.log('CURRENT URL AFTER CLICK:', page.url());

    await page.waitForURL('**/cash-register', { timeout: 10000 });
    expect(page.url()).toContain('/cash-register');

    // Verificar el título y elementos principales
    await expect(page.getByRole('heading', { name: /Módulo de Caja POS/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Operación en Vivo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Historial de Cajas/i })).toBeVisible();
  });

  test('TC-CR-02: Ciclo de Vida de Caja — Apertura, Movimientos Manuales, Arqueo y Cierre Definitivo', async ({ page }) => {
    await page.goto('/cash-register');
    await page.waitForURL('**/cash-register', { timeout: 10000 });

    // Si ya existe una caja abierta de una prueba previa, realizar su cierre para partir de estado limpio
    const closeExistingBtn = page.locator('button:has-text("Arqueo y Cerrar Caja")');
    if (await closeExistingBtn.isVisible({ timeout: 2000 })) {
      await closeExistingBtn.click();
      await page.waitForSelector('text=Confirmar Cierre Definitivo', { timeout: 5000 });
      const submitClose = page.locator('button:has-text("Confirmar Cierre Definitivo")');
      await submitClose.click();
      await page.waitForTimeout(2000);
      // Volver a la pestaña de Operación en Vivo
      await page.getByRole('button', { name: /Operación en Vivo/i }).click();
    }

    // 1. Apertura de Caja
    const openBtn = page.locator('button:has-text("Realizar Apertura de Caja"), button:has-text("Abrir Caja")').first();
    await expect(openBtn).toBeVisible({ timeout: 5000 });
    await openBtn.click();

    // Modal de apertura visible
    await expect(page.getByText('Apertura de Caja')).toBeVisible({ timeout: 5000 });
    const initialCashInput = page.locator('#initialCash');
    await initialCashInput.fill('150000');
    const notesInput = page.locator('#notes');
    await notesInput.fill('Apertura de turno automatizada Playwright E2E');

    const confirmOpenBtn = page.locator('button:has-text("Confirmar y Abrir Caja")');
    await confirmOpenBtn.click();

    // Verificar que la caja pasó a estado ABIERTA
    await expect(page.locator('text=ABIERTA').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('150.000').first()).toBeVisible();

    // 2. Registrar Ingreso Manual (Inyección de efectivo)
    const manualInflowBtn = page.locator('button:has-text("Ingreso Manual")').first();
    await manualInflowBtn.click();

    await expect(page.getByText('Registrar Movimiento de Caja')).toBeVisible({ timeout: 5000 });
    await page.locator('#amount').fill('50000');
    await page.locator('#concept').fill('Inyección de sencillo para caja');
    const saveMovementBtn = page.locator('button:has-text("Guardar Movimiento")');
    await saveMovementBtn.click();

    // Verificar que el movimiento se listó y el efectivo esperado subió a 200.000
    await expect(page.getByText('Inyección de sencillo para caja').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('200.000').first()).toBeVisible();

    // 3. Registrar Gasto Operativo
    const expenseBtn = page.locator('button:has-text("Gasto Operativo")').first();
    await expenseBtn.click();

    await expect(page.getByText('Registrar Movimiento de Caja')).toBeVisible({ timeout: 5000 });
    await page.locator('#amount').fill('20000');
    await page.locator('#concept').fill('Compra de rollos de papel y café');
    await saveMovementBtn.click();

    // Verificar que el gasto se listó y el efectivo esperado bajó a 180.000
    await expect(page.getByText('Compra de rollos de papel y café').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('180.000').first()).toBeVisible();

    // 4. Registrar Retiro de Efectivo
    const withdrawalBtn = page.locator('button:has-text("Retiro Efectivo")').first();
    await withdrawalBtn.click();

    await expect(page.getByText('Registrar Movimiento de Caja')).toBeVisible({ timeout: 5000 });
    await page.locator('#amount').fill('30000');
    await page.locator('#concept').fill('Retiro parcial para caja fuerte');
    await saveMovementBtn.click();

    // Verificar que el retiro se listó y el efectivo esperado quedó en 150.000
    await expect(page.getByText('Retiro parcial para caja fuerte').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('150.000').first()).toBeVisible();

    // 5. Arqueo y Cierre de Caja
    const closeBtn = page.locator('button:has-text("Arqueo y Cerrar Caja")');
    await closeBtn.click();

    await expect(page.getByText('Arqueo y Cierre de Caja')).toBeVisible({ timeout: 5000 });
    const actualCashInput = page.locator('#actualCash');

    // Probar validación de FALTANTE
    await actualCashInput.fill('140000');
    await expect(page.locator('text=FALTANTE').first()).toBeVisible();

    // Probar validación de SOBRANTE
    await actualCashInput.fill('160000');
    await expect(page.locator('text=SOBRANTE').first()).toBeVisible();

    // Cuadrar caja con conteo exacto ($150.000)
    await actualCashInput.fill('150000');
    await expect(page.locator('text=CUADRADO').first()).toBeVisible();

    // Diligenciar nota de cierre
    const closeNotes = page.locator('#closeNotes');
    await closeNotes.fill('Cierre cuadrado verificado exitosamente por suite E2E Playwright.');

    const confirmCloseBtn = page.locator('button:has-text("Confirmar Cierre Definitivo")');
    await confirmCloseBtn.click();

    // Debe cerrarse el modal y redirigir a Historial de Cajas
    await page.waitForTimeout(2000);
    await expect(page.locator('table').locator('text=CERRADA').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table').locator('text=CUADRADO').first()).toBeVisible();
  });

  test('TC-CR-03: Auditoría y Detalle Histórico de Sesión Cerrada', async ({ page }) => {
    await page.goto('/cash-register');
    await page.getByRole('button', { name: /Historial de Cajas/i }).click();

    // Abrir detalle de la primera sesión en el historial
    const viewDetailBtn = page.locator('button:has-text("Ver Detalle")').first();
    if (await viewDetailBtn.isVisible({ timeout: 5000 })) {
      await viewDetailBtn.click();

      // Modal de auditoría
      await expect(page.getByText('Auditoría de Sesión:')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Detalle de Movimientos Financieros')).toBeVisible();

      // Cerrar modal
      const closeModalBtn = page.locator('button:has-text("Cerrar")').last();
      await closeModalBtn.click();
      await expect(page.getByText('Auditoría de Sesión:')).not.toBeVisible();
    }
  });

  test('TC-CR-04: Integración con POS — Alerta de Caja Cerrada en Ventas', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForURL('**/sales', { timeout: 10000 });

    // Si la caja está cerrada, verificar que el aviso informativo esté presente
    const alertBanner = page.locator('text=Caja cerrada — Se requiere apertura para facturar');
    const openMyCashBtn = page.locator('a:has-text("Abrir Mi Caja")');

    if (await alertBanner.isVisible({ timeout: 3000 })) {
      await expect(openMyCashBtn).toBeVisible();
      await openMyCashBtn.click();
      await page.waitForURL('**/cash-register', { timeout: 10000 });
      expect(page.url()).toContain('/cash-register');
    }
  });

  test('TC-CR-05: Generación Automática de Movimientos por Ventas POS Multimétodo', async ({ page, request }) => {
    // 1. Obtener token JWT de administrador
    const loginRes = await request.post('http://localhost:5001/api/v1/auth/login', {
      data: { email: 'admin@sgi.local', password: 'Admin123*' }
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Asegurar que haya una caja abierta para el administrador
    await page.goto('/cash-register');
    await page.waitForURL('**/cash-register', { timeout: 10000 });

    const openCardPrompt = page.locator('text=No tienes una caja abierta en este momento');
    const activeHeader = page.locator('h2:has-text("Responsable:")');

    // Esperar a que se monte la pantalla en cualquiera de los dos estados posibles
    await expect(openCardPrompt.or(activeHeader)).toBeVisible({ timeout: 10000 });

    if (await openCardPrompt.isVisible()) {
      await page.locator('button:has-text("Realizar Apertura de Caja")').click();
      await page.locator('#initialCash').fill('200000');
      await page.locator('button:has-text("Confirmar y Abrir Caja")').click();
      await expect(activeHeader).toBeVisible({ timeout: 8000 });
    }

    // 3. Obtener almacén autorizado y producto activo del inventario
    const whRes = await request.get('http://localhost:5001/api/v1/warehouses', {
      headers: authHeaders
    });
    const warehouses = await whRes.json();
    const warehouseId = Array.isArray(warehouses) && warehouses.length > 0 ? warehouses[0].id : null;

    const productsRes = await request.get('http://localhost:5001/api/v1/products?pageNumber=1&pageSize=10', {
      headers: authHeaders
    });
    const productsData = await productsRes.json();
    const product = productsData.items.find((p: any) => p.currentStock > 0) || productsData.items[0];

    // 4. Crear una venta con medios de pago múltiples (Efectivo + Transferencia)
    const quantity = 1;
    const unitPrice = product.salePrice || 50000;
    const subtotal = unitPrice * quantity;
    const tax = Math.round(subtotal * 0.19);
    const total = subtotal + tax;
    const cashAmount = Math.round(total / 2);
    const transferAmount = total - cashAmount;

    const saleRes = await request.post('http://localhost:5001/api/v1/sales', {
      headers: authHeaders,
      data: {
        customerName: 'Cliente POS Verificación E2E',
        customerTaxId: '901234567-1',
        customerEmail: 'cliente.pos@prueba.com',
        saleDate: new Date().toISOString(),
        paymentMethod: 'Mixed',
        invoiceType: 'Traditional',
        notes: 'Venta con múltiples medios de pago para prueba de caja',
        warehouseId: warehouseId ?? product.warehouseId,
        items: [
          {
            productId: product.id,
            quantity: quantity,
            unitPrice: unitPrice,
            taxRate: 0.19
          }
        ],
        payments: [
          {
            method: 'Cash',
            amount: cashAmount,
            reference: 'Efectivo en mostrador'
          },
          {
            method: 'Transfer',
            amount: transferAmount,
            reference: 'Comprobante Bancolombia #8821'
          }
        ]
      }
    });

    if (saleRes.status() !== 201) {
      console.log('SALE FAILED WITH STATUS:', saleRes.status(), 'BODY:', await saleRes.text());
    }
    expect(saleRes.status()).toBe(201);
    const saleData = await saleRes.json();

    // 5. Recargar la vista de caja en vivo y verificar la integración
    await page.goto('/cash-register');
    await page.waitForURL('**/cash-register', { timeout: 10000 });

    // Los dos movimientos deben aparecer en la tabla: uno en efectivo y otro en transferencia
    await expect(page.locator(`text=${saleData.saleNumber}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Venta POS').first()).toBeVisible();

    // Validar que ambos medios de pago están representados en los movimientos
    await expect(page.locator('text=Efectivo').first()).toBeVisible();
    await expect(page.locator('text=Transferencia').first()).toBeVisible();

    // 6. Arqueo y cierre limpio de la caja
    const closeBtn = page.locator('button:has-text("Arqueo y Cerrar Caja")');
    await closeBtn.click();
    await expect(page.getByText('Arqueo y Cierre de Caja')).toBeVisible({ timeout: 5000 });

    // Por defecto el conteo inicia igual al efectivo esperado (estado CUADRADO)
    await expect(page.locator('text=CUADRADO').first()).toBeVisible();

    const closeNotes = page.locator('#closeNotes');
    await closeNotes.fill('Cierre de prueba E2E con venta multimétodo.');

    await page.locator('button:has-text("Confirmar Cierre Definitivo")').click();
    await page.waitForTimeout(2000);
    await expect(page.locator('table').locator('text=CERRADA').first()).toBeVisible({ timeout: 10000 });
  });

});
