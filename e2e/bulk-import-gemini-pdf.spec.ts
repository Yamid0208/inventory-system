import { test, expect } from '@playwright/test';

test.describe('E2E Bulk Import with Gemini Multimodal: Photos and PDF Support', () => {

  const loginAsAdmin = async (page: any) => {
    await page.goto('/login');
    if (page.url().includes('/dashboard')) return;

    const emailInput = page.locator('input[type="email"], input[formcontrolname="email"], #email').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const passwordInput = page.locator('input[type="password"], input[formcontrolname="password"], #password').first();
      const submitBtn = page.locator('button[type="submit"]').first();

      await emailInput.fill('admin@sgi.local');
      await passwordInput.fill('Admin123*');
      await submitBtn.click();
      await page.waitForURL('**/dashboard', { timeout: 15000 });
    }
  };

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-IMPORT-01: Verificación de soporte para PDF y Fotos en Carga Masiva desde Productos', async ({ page }) => {
    // 1. Simular la respuesta del backend para un documento PDF procesado por Gemini
    await page.route('**/api/v1/products/import/preview-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            rowNumber: 1,
            sku: 'PDF-GEMINI-001',
            name: 'Impresora Térmica POS PDF',
            categoryName: 'Hardware',
            supplierName: 'Distribuidora Tech',
            purchasePrice: 120.0,
            salePrice: 180.0,
            initialStock: 25,
            minimumStock: 5,
            description: 'Extraído de factura PDF con Gemini IA',
            isValid: true,
            isExisting: false,
            validationErrors: []
          },
          {
            rowNumber: 2,
            sku: 'PDF-GEMINI-002',
            name: 'Lector Código de Barras Láser',
            categoryName: 'Periféricos',
            supplierName: 'Distribuidora Tech',
            purchasePrice: 45.0,
            salePrice: 75.0,
            initialStock: 40,
            minimumStock: 10,
            description: 'Escáner USB de alta velocidad',
            isValid: true,
            isExisting: false,
            validationErrors: []
          }
        ])
      });
    });

    // 2. Navegar a Productos
    await page.goto('/products');
    await page.waitForURL('**/products', { timeout: 10000 });

    // 3. Abrir modal de Carga Masiva
    const bulkImportBtn = page.getByRole('button', { name: /Carga Masiva/i });
    await expect(bulkImportBtn).toBeVisible({ timeout: 5000 });
    await bulkImportBtn.click();

    // 4. Validar encabezado del modal con insignia de Fotos y PDF
    await expect(page.getByText('Carga Masiva de Inventario')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Excel, Fotos & PDF/i)).toBeVisible();

    // 5. Cambiar a la pestaña de IA (Foto o PDF)
    const aiTabBtn = page.getByRole('button', { name: /Foto o PDF con IA/i });
    await expect(aiTabBtn).toBeVisible();
    await aiTabBtn.click();

    // 6. Validar guía contextual sobre extracción multimodal de PDFs y Fotos con Google Gemini
    await expect(page.getByText(/Extracción Inteligente Multimodal con Google Gemini/i)).toBeVisible();
    await expect(page.getByText(/formato PDF/i).first()).toBeVisible();

    // 7. Validar que el input acepte archivos PDF además de imágenes
    const fileInput = page.locator('input[type="file"]').first();
    const acceptAttr = await fileInput.getAttribute('accept');
    expect(acceptAttr).toContain('.pdf');
    expect(acceptAttr).toContain('application/pdf');

    // 8. Cargar un archivo PDF simulado en el dropzone
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\nxref\n0 1\n0000000000 65535 f \ntrailer<</Size 1/Root 1 0 R>>\nstartxref\n50\n%%EOF');
    await fileInput.setInputFiles({
      name: 'factura_compra_noviembre.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBuffer
    });

    // 9. Verificar transición al paso de previsualización (preview)
    await expect(page.getByText('Documento PDF')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('factura_compra_noviembre.pdf')).toBeVisible();

    // 10. Validar valores en los inputs de la tabla editable del modal
    const textInputs = page.locator('app-bulk-import-modal table tbody input[type="text"]');
    await expect(textInputs.nth(0)).toHaveValue('PDF-GEMINI-001');
    await expect(textInputs.nth(1)).toHaveValue('Impresora Térmica POS PDF');
    await expect(textInputs.nth(2)).toHaveValue('Hardware');

    await expect(textInputs.nth(3)).toHaveValue('PDF-GEMINI-002');
    await expect(textInputs.nth(4)).toHaveValue('Lector Código de Barras Láser');

    await expect(page.getByText('Todos (2)')).toBeVisible();
    await expect(page.getByText('Nuevos Válidos (2)')).toBeVisible();

    // 11. Cerrar el modal
    const closeBtn = page.locator('button[type="button"]').filter({ has: page.locator('svg path[d*="M6 18L18 6"]') }).first();
    await closeBtn.click();
    await expect(page.getByText('Carga Masiva de Inventario')).not.toBeVisible();
  });

  test('TC-IMPORT-02: Verificación de Carga Masiva con soporte PDF desde módulo Kardex/Inventario', async ({ page }) => {
    // 1. Navegar a Kardex / Inventario
    await page.goto('/inventory');
    await page.waitForURL('**/inventory', { timeout: 10000 });

    // 2. Localizar y abrir botón de Carga Masiva
    const bulkImportBtn = page.getByRole('button', { name: /Carga Masiva/i });
    await expect(bulkImportBtn).toBeVisible({ timeout: 5000 });
    await bulkImportBtn.click();

    // 3. Validar presencia del modal y conmutación a pestaña IA
    await expect(page.getByText('Carga Masiva de Inventario')).toBeVisible({ timeout: 5000 });
    const aiTabBtn = page.getByRole('button', { name: /Foto o PDF con IA/i });
    await aiTabBtn.click();

    // 4. Validar que la interfaz indique soporte de PDF en el dropzone
    await expect(page.getByText(/fotografía o documento PDF con productos/i)).toBeVisible();
    await expect(page.getByText(/\.pdf/i).first()).toBeVisible();

    // 5. Cerrar modal
    const closeBtn = page.locator('button[type="button"]').filter({ has: page.locator('svg path[d*="M6 18L18 6"]') }).first();
    await closeBtn.click();
    await expect(page.getByText('Carga Masiva de Inventario')).not.toBeVisible();
  });

});
