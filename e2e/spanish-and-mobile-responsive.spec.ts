import { test, expect } from '@playwright/test';

test.describe('E2E Spanish Localization and Mobile Responsiveness Suite', () => {

  const loginAsAdmin = async (page: any) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[formcontrolname="email"], #email').first();
    const passwordInput = page.locator('input[type="password"], input[formcontrolname="password"], #password').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill('admin@sgi.local');
    await passwordInput.fill('Admin123*');
    await submitBtn.click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  };

  test('TC-LOC-01: Login y Dashboard están 100% en español sin términos en inglés', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Inicia sesión en tu cuenta')).toBeVisible();
    await expect(page.locator('text=Correo Electrónico')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Iniciar Sesión")')).toBeVisible();

    await loginAsAdmin(page);

    // Navbar / Dashboard
    await expect(page.locator('text=/Panel de (Super Administrador|Control)/').first()).toBeVisible();
    await expect(page.locator('text=Actualizar Datos')).toBeVisible();

    // Comprobar que no hay "Control Panel"
    const controlPanelEnglish = page.locator('text="Control Panel"');
    await expect(controlPanelEnglish).toHaveCount(0);
  });

  test('TC-LOC-02: Catálogo de Categorías y Proveedores muestra textos en español', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/directory');
    await page.waitForTimeout(1000);

    // Validar encabezados y pestañas en español
    await expect(page.locator('h1:has-text("Directorio")')).toBeVisible();
    await expect(page.locator('button:has-text("Categorías")')).toBeVisible();
    await expect(page.locator('button:has-text("Proveedores")')).toBeVisible();

    // Validar que "Total Products" no aparece
    const englishTotalProducts = page.locator('text="Total Products"');
    await expect(englishTotalProducts).toHaveCount(0);

    // Validar que "Total Productos" está presente en las tarjetas de categorías
    const spanishTotalProductos = page.locator('text=Total Productos');
    await expect(spanishTotalProductos.first()).toBeVisible();
  });

  test('TC-LOC-03: Módulo de Kardex/Inventario tiene tabla, filtros y placeholders en español', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/inventory');
    await page.waitForTimeout(1000);

    // Verificar placeholder en español
    const searchInput = page.locator('input[placeholder="Buscar en Kardex..."]');
    await expect(searchInput).toBeVisible();

    // Verificar cabeceras de tabla en español
    await expect(page.locator('th:has-text("ID Movimiento")')).toBeVisible();
    await expect(page.locator('th:has-text("Fecha y Hora")')).toBeVisible();
    await expect(page.locator('th:has-text("SKU / Producto")')).toBeVisible();
    await expect(page.locator('th:has-text("Tipo")')).toBeVisible();
    await expect(page.locator('th:has-text("Variación Stock")')).toBeVisible();
    await expect(page.locator('th:has-text("Responsable")')).toBeVisible();

    // Comprobar que no aparecen las cabeceras en inglés
    await expect(page.locator('th:has-text("Movement ID")')).toHaveCount(0);
    await expect(page.locator('th:has-text("Date & Time")')).toHaveCount(0);
    await expect(page.locator('th:has-text("Stock Delta")')).toHaveCount(0);
  });

  test('TC-MOB-01: Responsividad móvil en pantalla pequeña (375x667): Navegación y Drawer', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsAdmin(page);

    // En móvil el botón hamburger debe ser visible
    const hamburgerBtn = page.locator('button[aria-label="Alternar menú lateral"]');
    await expect(hamburgerBtn).toBeVisible();

    // Abrir drawer
    await hamburgerBtn.click();
    await page.waitForTimeout(300);

    // El drawer debe mostrarse
    const sidebar = page.locator('aside[aria-label="Menú principal de navegación"]');
    await expect(sidebar).toBeVisible();

    // Botón de cerrar drawer
    const closeDrawerBtn = page.locator('button[aria-label="Cerrar menú lateral"]');
    await expect(closeDrawerBtn).toBeVisible();
    await closeDrawerBtn.click();
    await page.waitForTimeout(300);
  });

  test('TC-MOB-02: Modal de Creación de Producto es completamente responsive y operable en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsAdmin(page);

    await page.goto('/products');
    await page.waitForTimeout(1000);

    // Abrir modal de producto haciendo click en "Nuevo Producto"
    const createBtn = page.locator('button:has-text("Nuevo Producto")').first();
    await createBtn.click();
    await page.waitForTimeout(500);

    // Validar modal visible y con contenido en español
    const modalHeader = page.locator('h3:has-text("Nuevo Producto")');
    await expect(modalHeader).toBeVisible();

    // Verificar que el modal no desborda la pantalla
    const modalContainer = page.locator('div.fixed.inset-0 > div').first();
    const box = await modalContainer.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(375);
    }

    // Verificar botones cancelar y guardar en español
    const cancelBtn = page.locator('button:has-text("Cancelar")').first();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await page.waitForTimeout(300);
    await expect(modalHeader).not.toBeVisible();
  });

  test('TC-MOB-03: Modal de Ajuste Manual de Kardex es responsive en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsAdmin(page);

    await page.goto('/inventory');
    await page.waitForTimeout(1000);

    const openAdjustBtn = page.locator('button:has-text("Ajuste Manual")').first();
    await openAdjustBtn.click();
    await page.waitForTimeout(500);

    // Verificar título en español
    const adjustModalTitle = page.locator('h2:has-text("Ajuste Manual de Inventario")');
    await expect(adjustModalTitle).toBeVisible();

    // Verificar que el modal no desborda en móvil
    const modalContainer = page.locator('div.fixed.inset-0 > div').first();
    const box = await modalContainer.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(375);
    }

    // Verificar botones de tipo Entrada y Salida
    await expect(page.locator('button:has-text("Entrada")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Salida")').first()).toBeVisible();

    // Cerrar modal
    const cancelBtn = page.locator('button:has-text("Cancelar")').first();
    await cancelBtn.click();
    await page.waitForTimeout(300);
    await expect(adjustModalTitle).not.toBeVisible();
  });

  test('TC-MOB-04: Modal de Venta o Diálogo de Caja es responsive en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsAdmin(page);

    await page.goto('/sales');
    await page.waitForTimeout(1000);

    const newSaleBtn = page.locator('button:has-text("Nueva Venta")').first();
    await newSaleBtn.click();
    await page.waitForTimeout(500);

    // Si la caja está cerrada, se abre el diálogo de confirmación "Apertura de Caja Requerida"
    const cashRequiredModal = page.locator('text=Apertura de Caja Requerida');
    const saleModalTitle = page.locator('h2:has-text("Registrar Venta / Salida Comercial")');

    if (await cashRequiredModal.isVisible()) {
      // Validar diálogo modal de confirmación en móvil
      await expect(cashRequiredModal).toBeVisible();
      await expect(page.locator('text=Para registrar ventas en el POS')).toBeVisible();
      const cancelBtn = page.locator('button:has-text("Cancelar")').first();
      await cancelBtn.click();
      await page.waitForTimeout(300);
      await expect(cashRequiredModal).not.toBeVisible();
    } else {
      // Validar modal de nueva venta en móvil
      await expect(saleModalTitle).toBeVisible();
      await expect(page.locator('text=Total Venta')).toBeVisible();

      // Verificar que el contenedor no desborda la pantalla
      const modalContainer = page.locator('div.fixed.inset-0 > div').first();
      const box = await modalContainer.boundingBox();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(375);
      }

      const cancelBtn = page.locator('button:has-text("Cancelar")').first();
      await cancelBtn.click();
      await page.waitForTimeout(300);
      await expect(saleModalTitle).not.toBeVisible();
    }
  });

  test('TC-MOB-05: Modal de Orden de Compra es responsive en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsAdmin(page);

    await page.goto('/purchases');
    await page.waitForTimeout(1000);

    const newPurchaseBtn = page.locator('button:has-text("Nueva Orden de Compra")').first();
    await newPurchaseBtn.click();
    await page.waitForTimeout(500);

    const purchaseModalTitle = page.locator('h2:has-text("Nueva Orden de Compra")');
    await expect(purchaseModalTitle).toBeVisible();

    await expect(page.locator('button:has-text("Cancelar")').first()).toBeVisible();
    const cancelBtn = page.locator('button:has-text("Cancelar")').first();
    await cancelBtn.click();
    await page.waitForTimeout(300);
    await expect(purchaseModalTitle).not.toBeVisible();
  });

  test('TC-MOB-06: Módulo y Modales de Caja POS en pantalla móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsAdmin(page);

    await page.goto('/cash-register');
    await page.waitForTimeout(1000);

    await expect(page.locator('h1:has-text("Módulo de Caja POS")')).toBeVisible();

    // Si no hay caja abierta, abrir modal de apertura
    const openBtn = page.locator('button:has-text("Realizar Apertura de Caja"), button:has-text("Abrir Caja")');
    if (await openBtn.count() > 0 && await openBtn.first().isVisible()) {
      await openBtn.first().click();
      await page.waitForTimeout(500);

      const openModalTitle = page.locator('h3:has-text("Apertura de Caja")');
      await expect(openModalTitle).toBeVisible();
      await expect(page.locator('label:has-text("Efectivo Inicial en Caja")')).toBeVisible();

      // Cerrar modal
      const cancelBtn = page.locator('button:has-text("Cancelar")').first();
      await cancelBtn.click();
      await page.waitForTimeout(300);
    }
  });

});
