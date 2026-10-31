import { test, expect } from '@playwright/test';

test.describe('E2E Pre-Production Verification Suite', () => {

  test('TC-01: Health check del backend y validación de cabeceras de seguridad', async ({ request }) => {
    const response = await request.get('http://localhost:5001/healthz');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toBe('Healthy');

    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('TC-02: Flujo de Login y navegación protegida al Dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Sistema de Gestión de Inventario|Inventory/i);

    // Intentar login con credenciales de administrador
    const emailInput = page.locator('input[type="email"], input[formcontrolname="email"], #email').first();
    const passwordInput = page.locator('input[type="password"], input[formcontrolname="password"], #password').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill('admin@sgi.local');
    await passwordInput.fill('Admin123*');
    await submitBtn.click();

    // Debe ingresar al dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('TC-03: Navegación al catálogo de productos y verificación del módulo de importación masiva', async ({ page }) => {
    // Login
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[formcontrolname="email"], #email').first();
    const passwordInput = page.locator('input[type="password"], input[formcontrolname="password"], #password').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill('admin@sgi.local');
    await passwordInput.fill('Admin123*');
    await submitBtn.click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navegar a Productos mediante el menú lateral de la SPA
    const productsLink = page.locator('a[href="/products"]').first();
    if (await productsLink.isVisible()) {
      await productsLink.click();
    } else {
      await page.goto('/products');
    }
    await page.waitForURL('**/products', { timeout: 10000 });

    // Verificar botón de Carga Masiva
    const bulkImportBtn = page.getByRole('button', { name: /Carga Masiva/i });
    await expect(bulkImportBtn).toBeVisible({ timeout: 5000 });
    await bulkImportBtn.click();

    // El modal de importación masiva debe abrirse con su título
    await expect(page.getByText('Carga Masiva de Inventario')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Excel & IA Vision')).toBeVisible({ timeout: 5000 });
  });

  test('TC-04: Protección contra accesos no autenticados (Guard)', async ({ page }) => {
    // Intentar acceder a /users directamente sin sesión
    await page.goto('/users');
    // Debe redirigir a /login
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('TC-05: Recarga de página (F5) en ruta autenticada NO redirige al login y preserva la sesión activa', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[formcontrolname="email"], #email').first();
    const passwordInput = page.locator('input[type="password"], input[formcontrolname="password"], #password').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill('admin@sgi.local');
    await passwordInput.fill('Admin123*');
    await submitBtn.click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Ejecutar recarga de página (F5)
    await page.reload();

    // Validar que NO redirija a /login y se mantenga en /dashboard
    await page.waitForTimeout(1500);
    expect(page.url()).not.toContain('/login');
    expect(page.url()).toContain('/dashboard');
    await expect(page.locator('body')).not.toBeEmpty();
  });

});
