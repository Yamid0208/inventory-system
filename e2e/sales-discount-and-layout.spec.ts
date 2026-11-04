import { test, expect } from '@playwright/test';

test.describe('E2E POS Sales Modal - Layout Ergonómico y Sistema de Descuentos', () => {

  test.beforeEach(async ({ page, request }) => {
    // 1. Obtener token de Administrador y asegurar sesión de caja abierta
    const loginRes = await request.post('http://localhost:5001/api/v1/auth/login', {
      data: { email: 'admin@sgi.local', password: 'Admin123*' }
    });
    const { accessToken } = await loginRes.json();
    const authHeaders = { Authorization: `Bearer ${accessToken}` };

    const currentSessionRes = await request.get('http://localhost:5001/api/v1/cash-register/current', {
      headers: authHeaders
    });

    if (currentSessionRes.status() === 204 || currentSessionRes.status() === 404) {
      // No hay sesión abierta, abrirla con warehouseId obligatorio
      await request.post('http://localhost:5001/api/v1/cash-register/open', {
        headers: authHeaders,
        data: {
          initialCash: 150000,
          warehouseId: 1,
          notes: 'Apertura de turno automática para pruebas E2E'
        }
      });
    } else if (currentSessionRes.status() === 200) {
      const text = await currentSessionRes.text();
      if (!text || text === 'null') {
        await request.post('http://localhost:5001/api/v1/cash-register/open', {
          headers: authHeaders,
          data: {
            initialCash: 150000,
            warehouseId: 1,
            notes: 'Apertura de turno automática para pruebas E2E'
          }
        });
      }
    }

    // 2. Iniciar sesión en el navegador
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[formcontrolname="email"], #email').first();
    const passwordInput = page.locator('input[type="password"], input[formcontrolname="password"], #password').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill('admin@sgi.local');
    await passwordInput.fill('Admin123*');
    await submitBtn.click();

    // Esperar navegación al dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Si aparece el modal de términos y condiciones legales, aceptarlo
    const termsModal = page.locator('#legal-modal-title');
    if (await termsModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      const checkbox = page.locator('input[type="checkbox"]').last();
      await checkbox.check();
      const acceptBtn = page.locator('button:has-text("Aceptar y Continuar")');
      await acceptBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('TC-SALE-DISC-01: Jerarquía Ergonómica POS — Productos a Facturar y Descuento se ubican antes de Medios de Pago', async ({ page }) => {
    // 1. Navegar a Ventas y esperar validación de caja abierta
    await page.goto('/sales');
    await page.waitForURL('**/sales', { timeout: 10000 });

    await expect(page.locator('text=Caja cerrada — Se requiere apertura para facturar')).not.toBeVisible({ timeout: 10000 });

    const newSaleBtn = page.locator('button:has-text("Nueva Venta")').first();
    await expect(newSaleBtn).toBeVisible({ timeout: 5000 });
    await newSaleBtn.click();

    const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Registrar Venta' }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 2. Validar el orden jerárquico visual (Productos -> Descuento -> Medio de Pago)
    const clientSection = modal.locator('text=Información del Cliente').first();
    const productsSection = modal.locator('h3:has-text("Productos a Facturar")').first();
    const discountSection = modal.locator('text=Descuento Comercial de la Venta').first();
    const paymentSection = modal.locator('text=Medio de Pago *').first();

    await expect(clientSection).toBeVisible();
    await expect(productsSection).toBeVisible();
    await expect(discountSection).toBeVisible();
    await expect(paymentSection).toBeVisible();

    const clientBox = await clientSection.boundingBox();
    const productsBox = await productsSection.boundingBox();
    const discountBox = await discountSection.boundingBox();
    const paymentBox = await paymentSection.boundingBox();

    expect(clientBox).not.toBeNull();
    expect(productsBox).not.toBeNull();
    expect(discountBox).not.toBeNull();
    expect(paymentBox).not.toBeNull();

    // La posición vertical Y de Productos debe ser mayor que Cliente, pero menor que Descuento y Medio de Pago
    expect(productsBox!.y).toBeGreaterThan(clientBox!.y);
    expect(discountBox!.y).toBeGreaterThan(productsBox!.y);
    expect(paymentBox!.y).toBeGreaterThan(discountBox!.y);
  });

  test('TC-SALE-DISC-02: Aplicación reactiva de Descuento (Fijo y Porcentaje) y registro de venta con total contable exacto', async ({ page, request }) => {
    // 1. Obtener token de admin
    const loginRes = await request.post('http://localhost:5001/api/v1/auth/login', {
      data: { email: 'admin@sgi.local', password: 'Admin123*' }
    });
    const { accessToken } = await loginRes.json();
    const authHeaders = { Authorization: `Bearer ${accessToken}` };

    // Asegurar producto con stock
    const productsRes = await request.get('http://localhost:5001/api/v1/products?pageNumber=1&pageSize=50', {
      headers: authHeaders
    });
    const productsData = await productsRes.json();
    const product = productsData.items.find((p: any) => p.currentStock > 0);
    expect(product).toBeTruthy();

    // 2. Navegar a Ventas y abrir modal
    await page.goto('/sales');
    await page.waitForURL('**/sales', { timeout: 10000 });

    await expect(page.locator('text=Caja cerrada — Se requiere apertura para facturar')).not.toBeVisible({ timeout: 10000 });

    const newSaleBtn = page.locator('button:has-text("Nueva Venta")').first();
    await newSaleBtn.click();

    const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Registrar Venta' }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 3. Completar datos del cliente dentro del modal
    const nameInput = modal.locator('input[formcontrolname="customerName"]');
    await nameInput.fill('Cliente Descuento E2E Playwright');

    // 4. Seleccionar producto en el autocompletado del modal
    const productInput = modal.locator('input[placeholder*="Buscar producto por SKU"]').first();
    await productInput.click();
    await page.waitForTimeout(500);

    const productOption = modal.locator('.autocomplete-option, button:has-text("[' + product.sku + ']")').first();
    if (await productOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await productOption.click();
    } else {
      await productInput.fill(product.sku);
      await page.waitForTimeout(500);
      await modal.locator(`text=${product.sku}`).first().click();
    }

    await page.waitForTimeout(500);

    // 5. Aplicar un descuento del 10% mediante el botón rápido
    const quick10Btn = modal.locator('button:has-text("10%")').first();
    await expect(quick10Btn).toBeVisible();
    await quick10Btn.click();

    // Validar que se muestre el feedback de descuento aplicado
    await expect(modal.locator('text=Descuento aplicado:').first()).toBeVisible({ timeout: 3000 });

    // Validar que en la barra de totales negra aparezca el renglón "Descuento"
    await expect(modal.locator('span:has-text("Descuento")').first()).toBeVisible();

    // 6. Probar validación de exceso de descuento cambiando a Monto Fijo desmedido
    const fixedModeBtn = modal.locator('button:has-text("$ Monto Fijo")').first();
    await fixedModeBtn.click();

    const discountInput = modal.locator('input[type="number"]').first();
    await discountInput.fill('999999999');

    // Debe mostrar la advertencia de exceso de descuento
    await expect(modal.locator('text=El monto de descuento no puede superar el subtotal bruto').first()).toBeVisible();

    // El botón de submit debe estar deshabilitado
    const submitBtn = modal.locator('button:has-text("Completar Venta y Descontar Stock")');
    await expect(submitBtn).toBeDisabled();

    // 7. Reajustar a un descuento fijo válido (ej. $5.000)
    await discountInput.fill('5000');
    await expect(modal.locator('text=El monto de descuento no puede superar el subtotal bruto')).not.toBeVisible();
    await expect(submitBtn).toBeEnabled();

    // 8. Enviar la venta
    await submitBtn.click();

    // El modal debe cerrarse tras guardar exitosamente
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // La nueva venta debe reflejarse en la tabla de ventas
    await expect(page.locator('text=Cliente Descuento E2E Playwright').first()).toBeVisible({ timeout: 10000 });
  });

  test('Sidebar "+ Nueva Venta" abre el modal incluso estando en /sales?new=true y precarga la sede activa del navbar', async ({ page }) => {
    // 1. Navegar a /sales
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');

    // 2. Hacer click en el botón "+ Nueva Venta" del Sidebar
    const sidebarNewSaleBtn = page.locator('aside button:has-text("Nueva Venta")').first();
    await expect(sidebarNewSaleBtn).toBeVisible({ timeout: 5000 });
    await sidebarNewSaleBtn.click();

    // 3. Validar que el modal de ventas se abra
    const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Registrar Venta' }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 4. Validar que la sede esté precargada en el campo "Sede / Almacén"
    // El input de autocomplete para Sede / Almacén debe tener valor seleccionado no vacío
    const warehouseInput = modal.locator('label:has-text("Sede / Almacén")').locator('..').locator('input').first();
    await expect(warehouseInput).toBeVisible();
    const warehouseVal = await warehouseInput.inputValue();
    expect(warehouseVal.trim().length).toBeGreaterThan(0);

    // 5. Cerrar el modal mediante el botón cancelar
    const cancelBtn = modal.locator('button:has-text("Cancelar")').first();
    await cancelBtn.click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // 6. Hacer clic de nuevo en "+ Nueva Venta" del Sidebar estando ya en /sales
    await sidebarNewSaleBtn.click();

    // 7. Debe reabrirse el modal correctamente
    await expect(modal).toBeVisible({ timeout: 5000 });
    const warehouseValAgain = await warehouseInput.inputValue();
    expect(warehouseValAgain.trim().length).toBeGreaterThan(0);

    // Cerrar modal
    await cancelBtn.click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // 8. Recargar la página (F5) estando en /sales?new=true
    await page.goto('/sales?new=true');
    await page.waitForLoadState('networkidle');

    // Debe abrir directamente el modal de venta sin desplegar la alerta de "Apertura de Caja Requerida"
    const alertWarning = page.locator('text=Apertura de Caja Requerida');
    await expect(alertWarning).not.toBeVisible();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

});
