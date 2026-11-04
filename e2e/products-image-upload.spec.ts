import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('E2E Gestión de Productos - Imagen de Referencia Opcional', () => {

  const testImagePath = path.join(__dirname, 'test-product-sample.png');

  test.beforeAll(() => {
    // Generar un PNG mínimo válido de 1x1 pixel si no existe
    if (!fs.existsSync(testImagePath)) {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      fs.writeFileSync(testImagePath, pngBuffer);
    }
  });

  test.afterAll(() => {
    if (fs.existsSync(testImagePath)) {
      try {
        fs.unlinkSync(testImagePath);
      } catch {}
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[formcontrolname="email"], #email').first();
    const passwordInput = page.locator('input[type="password"], input[formcontrolname="password"], #password').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill('admin@sgi.local');
    await passwordInput.fill('Admin123*');
    await submitBtn.click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('TC-PROD-IMG-01: Crear producto con imagen opcional, ver miniatura y modal de detalle', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // 1. Abrir Modal de Creación
    const openCreateBtn = page.locator('button:has-text("Nuevo Producto")').first();
    await expect(openCreateBtn).toBeVisible({ timeout: 5000 });
    await openCreateBtn.click();

    const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Nuevo Producto' }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const uniqueSku = `SKU-IMG-${Date.now().toString().slice(-5)}`;
    const uniqueName = `Producto Foto ${Date.now().toString().slice(-4)}`;

    await modal.locator('input[formcontrolname="sku"]').fill(uniqueSku);
    await modal.locator('input[formcontrolname="name"]').fill(uniqueName);
    await modal.locator('input[formcontrolname="purchasePrice"]').fill('25000');
    await modal.locator('input[formcontrolname="salePrice"]').fill('45000');
    await modal.locator('input[formcontrolname="minimumStock"]').fill('5');

    // 2. Cargar imagen mediante el dropzone/input file
    const fileInput = modal.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImagePath);

    // Validar feedback de imagen cargada
    await expect(modal.locator('text=Nueva imagen lista').first()).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('img[alt="Vista previa del producto"]').first()).toBeVisible();

    // 3. Guardar el producto
    const submitBtn = modal.locator('button:has-text("Crear Producto")').first();
    await submitBtn.click();

    // El modal debe cerrarse
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // 4. Buscar el producto recién creado
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await searchInput.fill(uniqueSku);
    await page.waitForTimeout(600);

    const productRow = page.locator(`tr:has-text("${uniqueSku}")`).first();
    await expect(productRow).toBeVisible({ timeout: 10000 });

    // Validar que la fila contiene una imagen en lugar del icono SVG genérico
    const imgThumb = productRow.locator('img');
    await expect(imgThumb).toBeVisible();

    // 5. Abrir detalle del producto y validar visualización de imagen
    const detailBtn = productRow.locator('button[title="Ver detalle"]').first();
    await detailBtn.click();

    const detailModal = page.locator('div.fixed.inset-0').filter({ hasText: uniqueName }).first();
    await expect(detailModal).toBeVisible({ timeout: 5000 });
    await expect(detailModal.locator('img')).toBeVisible();

    // Cerrar modal de detalle
    await detailModal.locator('button:has-text("Cerrar")').first().click();
    await expect(detailModal).not.toBeVisible({ timeout: 5000 });
  });

  test('TC-PROD-IMG-02: Editar producto existente y remover la imagen asociada', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // 1. Crear producto con imagen primero
    const openCreateBtn = page.locator('button:has-text("Nuevo Producto")').first();
    await openCreateBtn.click();

    const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Nuevo Producto' }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const skuToRemove = `SKU-DEL-${Date.now().toString().slice(-5)}`;
    const nameToRemove = `Producto Remoción ${Date.now().toString().slice(-4)}`;

    await modal.locator('input[formcontrolname="sku"]').fill(skuToRemove);
    await modal.locator('input[formcontrolname="name"]').fill(nameToRemove);
    await modal.locator('input[formcontrolname="purchasePrice"]').fill('12000');
    await modal.locator('input[formcontrolname="salePrice"]').fill('22000');
    await modal.locator('input[formcontrolname="minimumStock"]').fill('5');

    // Adjuntar archivo
    await modal.locator('input[type="file"]').first().setInputFiles(testImagePath);
    await expect(modal.locator('text=Nueva imagen lista').first()).toBeVisible({ timeout: 5000 });

    await modal.locator('button:has-text("Crear Producto")').first().click();
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // 2. Buscar el producto en la tabla
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await searchInput.fill(skuToRemove);
    await page.waitForTimeout(600);

    const productRow = page.locator(`tr:has-text("${skuToRemove}")`).first();
    await expect(productRow).toBeVisible({ timeout: 10000 });
    await expect(productRow.locator('img')).toBeVisible();

    // 3. Abrir edición
    await productRow.locator('button[title="Editar producto"]').first().click();
    const editModal = page.locator('div.fixed.inset-0').filter({ hasText: 'Editar Producto' }).first();
    await expect(editModal).toBeVisible({ timeout: 5000 });

    // Debe mostrar la imagen registrada actualmente
    await expect(editModal.locator('text=Imagen registrada').first()).toBeVisible();

    // 4. Hacer clic en "Quitar" imagen
    const removeBtn = editModal.locator('button:has-text("Quitar")').first();
    await removeBtn.click();

    // Guardar cambios
    await editModal.locator('button:has-text("Guardar Cambios")').first().click();
    await expect(editModal).not.toBeVisible({ timeout: 10000 });

    // 5. Verificar que en la tabla ahora muestre el icono SVG de placeholder
    await page.waitForTimeout(600);
    const updatedRow = page.locator(`tr:has-text("${skuToRemove}")`).first();
    await expect(updatedRow.locator('img')).not.toBeVisible();
    await expect(updatedRow.locator('svg').first()).toBeVisible();
  });

});
