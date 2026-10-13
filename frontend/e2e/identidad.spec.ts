import { expect, test } from '@playwright/test';
import { join } from 'node:path';

const correo =
  process.env['E2E_CORREO'] ?? process.env['DEMO_SOLICITANTE_CORREO'] ?? 'solicitante@demo.invalid';
const nombre =
  process.env['E2E_NOMBRE'] ??
  process.env['DEMO_SOLICITANTE_NOMBRE'] ??
  'Solicitante de demostración';
const clave =
  process.env['E2E_CLAVE'] ??
  process.env['DEMO_SOLICITANTE_CLAVE'] ??
  'Ejemplo local solicitante 2026';

test('acceso, identidad, restauración, cierre y guard con backend real', async ({
  page,
  context,
}) => {
  let csrfVisto = false;
  let loginConXsrf = false;
  let authSinBearer = true;
  let renovaciones = 0;
  let identidadConBearer = false;
  page.on('request', (peticion) => {
    const ruta = new URL(peticion.url()).pathname;
    if (ruta === '/api/autenticacion/csrf') csrfVisto = true;
    if (ruta.startsWith('/api/autenticacion/')) {
      authSinBearer &&= !('authorization' in peticion.headers());
    }
    if (ruta === '/api/autenticacion/iniciar-sesion') {
      loginConXsrf = Boolean(peticion.headers()['x-xsrf-token']);
    }
    if (ruta === '/api/autenticacion/renovar') renovaciones++;
    if (ruta === '/api/identidad/yo') {
      identidadConBearer = Boolean(peticion.headers()['authorization']?.startsWith('Bearer '));
    }
  });
  await page.goto('/acceso');
  await expect(page.getByRole('heading', { name: 'Acceso', exact: true })).toBeVisible();
  await page.screenshot({
    path: join(
      process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
      'frontend-acceso-escritorio.png',
    ),
    fullPage: true,
  });
  await page.getByLabel('Correo electrónico', { exact: true }).fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/mi-cuenta$/);
  await expect(page.getByRole('heading', { name: 'Mi cuenta', exact: true })).toBeFocused();
  await expect(page.locator('dd')).toContainText([nombre, correo]);
  await expect(page.getByRole('listitem')).toHaveText(['SOLICITANTE']);
  await page.screenshot({
    path: join(
      process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
      'frontend-mi-cuenta-escritorio.png',
    ),
    fullPage: true,
  });
  expect(csrfVisto && loginConXsrf && identidadConBearer && authSinBearer).toBe(true);
  const cookies = await context.cookies();
  const refresh = cookies.find((cookie) => cookie.name === 'REFRESH-TOKEN');
  expect(Boolean(refresh)).toBe(true);
  expect(refresh?.httpOnly).toBe(true);
  expect(refresh?.sameSite).toBe('Strict');
  expect(refresh?.path).toBe('/api/autenticacion');
  expect(refresh?.secure).toBe(false); // Compose local de loopback HTTP.
  const almacenamientoLimpio = await page.evaluate(
    () =>
      localStorage.length === 0 &&
      sessionStorage.length === 0 &&
      !document.cookie.includes('REFRESH-TOKEN') &&
      location.search === '' &&
      location.hash === '',
  );
  expect(almacenamientoLimpio).toBe(true);
  const anteriores = renovaciones;
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mi cuenta', exact: true })).toBeFocused();
  await expect(page.locator('dd')).toContainText([nombre, correo]);
  expect(renovaciones - anteriores).toBe(1);
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/acceso$/);
  expect((await context.cookies()).some((cookie) => cookie.name === 'REFRESH-TOKEN')).toBe(false);
  await page.goto('/mi-cuenta');
  await expect(page).toHaveURL(/\/acceso$/);
  expect(await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0)).toBe(
    true,
  );
});

test('formulario por teclado, error genérico, foco y validación nativa', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/acceso');
  const campoCorreo = page.getByLabel('Correo electrónico', { exact: true });
  const campoClave = page.getByLabel('Contraseña', { exact: true });
  await expect(campoCorreo).toHaveAttribute('autocomplete', 'username');
  await expect(campoClave).toHaveAttribute('autocomplete', 'current-password');
  await page.screenshot({
    path: join(process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results', 'frontend-acceso-movil.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(campoCorreo).toBeFocused();
  await campoCorreo.fill('cuenta-inexistente@demo.invalid');
  await page.keyboard.press('Tab');
  await expect(campoClave).toBeFocused();
  await campoClave.fill('Contraseña ficticia incorrecta 2026');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toHaveText(
    'No se ha podido iniciar sesión. Comprueba los datos e inténtalo de nuevo.',
  );
  await expect(page.getByRole('alert')).toBeFocused();
  expect(await campoClave.evaluate((campo: HTMLInputElement) => campo.value.length === 0)).toBe(
    true,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page).toHaveURL(/\/acceso$/);
});

test('CSRF obligatorio, restauración anónima y recursos públicos disponibles', async ({
  request,
  page,
}) => {
  const csrf = await request.get('/api/autenticacion/csrf');
  expect(csrf.status()).toBe(204);
  expect(csrf.headers()['cache-control']).toContain('no-store');
  expect(csrf.headers()['pragma']).toBe('no-cache');
  for (const ruta of ['iniciar-sesion', 'renovar', 'cerrar-sesion']) {
    const respuesta = await request.post(`/api/autenticacion/${ruta}`);
    expect(respuesta.status()).toBe(403);
    expect(await respuesta.json()).toEqual({ error: 'ACCESO_NO_PERMITIDO' });
  }
  const yo = await request.get('/api/identidad/yo');
  expect(yo.status()).toBe(401);
  expect(await yo.json()).toEqual({ error: 'NO_AUTENTICADO' });
  await page.goto('/inicio');
  await expect(page.getByRole('status')).toContainText('Sistema disponible');
  await page.getByRole('link', { name: 'Acceso', exact: true }).click();
  await expect(page).toHaveURL(/\/acceso$/);
  await expect(page.getByRole('navigation')).toHaveAttribute('aria-label', 'Navegación principal');
});
