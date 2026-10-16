import { expect, test } from '@playwright/test';

test('inicio, recarga, raíz y ruta desconocida con API real', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (error) => errores.push(error.message));
  await page.goto('/inicio');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Gestión de Solicitudes');
  await expect(page.getByRole('status')).toContainText('Sistema disponible');
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Sistema disponible');
  await page.goto('/');
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.getByRole('status')).toContainText('Sistema disponible');
  await page.goto('/no-existe');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página no encontrada');
  await page.getByRole('link', { name: 'Volver al inicio' }).click();
  await expect(page.getByRole('status')).toContainText('Sistema disponible');
  expect(errores).toEqual([]);
});

test('carga y error visible sin información interna, con recuperación', async ({ page }) => {
  let responder!: () => void;
  const espera = new Promise<void>((resolve) => {
    responder = resolve;
  });
  await page.route('**/api/salud', async (ruta) => {
    await espera;
    await ruta.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"estado":"NO_DISPONIBLE","detalle":"dato interno ficticio"}',
    });
  });
  await page.goto('/inicio');
  await expect(page.getByRole('status')).toContainText('Comprobando conexión');
  await expect(page.getByRole('button')).toBeDisabled();
  responder();
  await expect(page.getByRole('status')).toContainText('Servicio no disponible');
  await expect(page.locator('body')).not.toContainText('dato interno');
  await page.unroute('**/api/salud');
  await page.getByRole('button', { name: 'Volver a comprobar' }).click();
  await expect(page.getByRole('status')).toContainText('Sistema disponible');
});

test('teclado, foco, idioma y ancho móvil', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/inicio');
  await expect(page.getByRole('status')).toContainText('Sistema disponible');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Volver a comprobar' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Sistema disponible');
  const desbordamiento = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(desbordamiento).toBe(false);
});

test('Swagger carga OpenAPI 3.1 y ejecuta la consulta técnica real', async ({ page, request }) => {
  const respuesta = await request.get('/v3/api-docs');
  expect(respuesta.status()).toBe(200);
  const contrato = await respuesta.json();
  expect(contrato.openapi).toMatch(/^3\.1\./);
  expect(Object.keys(contrato.paths).sort()).toEqual([
    '/api/autenticacion/cerrar-sesion',
    '/api/autenticacion/csrf',
    '/api/autenticacion/iniciar-sesion',
    '/api/autenticacion/renovar',
    '/api/identidad/yo',
    '/api/salud',
  ]);
  expect(contrato.paths['/api/salud'].get.responses).toHaveProperty('200');
  expect(contrato.paths['/api/salud'].get.responses).toHaveProperty('503');
  await page.goto('/swagger-ui/index.html');
  await page.locator('.opblock-summary').filter({ hasText: '/api/salud' }).click();
  await page.getByRole('button', { name: 'Try it out' }).click();
  await page.getByRole('button', { name: 'Execute', exact: true }).click();
  await expect(page.locator('.responses-wrapper')).toContainText('DISPONIBLE');
});

test('cabeceras, mínimo contrato y denegación por el backend', async ({ request }) => {
  const salud = await request.get('/api/salud');
  expect(salud.status()).toBe(200);
  expect(await salud.json()).toEqual({ estado: 'DISPONIBLE' });
  expect(salud.headers()['x-content-type-options']).toContain('nosniff');
  const inicio = await request.get('/inicio');
  expect(inicio.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(inicio.headers()['x-frame-options']).toBe('DENY');
  const prohibida = await request.get('/api/no-autorizada');
  expect(prohibida.status()).toBe(401);
  expect(await prohibida.json()).toEqual({ error: 'NO_AUTENTICADO' });
  expect((await request.post('/api/salud')).status()).toBe(403);
});
