# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: base.spec.ts >> Swagger carga OpenAPI 3.1 y ejecuta la consulta técnica real
- Location: e2e\base.spec.ts:64:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 0
+ Received  + 4

  Array [
    "/api/autenticacion/cerrar-sesion",
    "/api/autenticacion/csrf",
    "/api/autenticacion/iniciar-sesion",
    "/api/autenticacion/renovar",
+   "/api/identidad/supervisores",
    "/api/identidad/yo",
    "/api/proveedores",
    "/api/proveedores/{id}",
    "/api/proveedores/{id}/desactivar",
    "/api/proveedores/{id}/reactivar",
    "/api/salud",
+   "/api/solicitudes",
+   "/api/solicitudes/{id}",
+   "/api/solicitudes/{id}/presentar",
  ]
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | test('inicio, recarga, raíz y ruta desconocida con API real', async ({ page }) => {
  4   |   const errores: string[] = [];
  5   |   page.on('pageerror', (error) => errores.push(error.message));
  6   |   await page.goto('/inicio');
  7   |   await expect(page.getByRole('heading', { level: 1 })).toHaveText('Gestión de Solicitudes');
  8   |   await expect(page.getByRole('status')).toContainText('Sistema disponible');
  9   |   await page.reload();
  10  |   await expect(page.getByRole('status')).toContainText('Sistema disponible');
  11  |   await page.goto('/');
  12  |   await expect(page).toHaveURL(/\/inicio$/);
  13  |   await expect(page.getByRole('status')).toContainText('Sistema disponible');
  14  |   await page.goto('/no-existe');
  15  |   await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página no encontrada');
  16  |   await page.getByRole('link', { name: 'Volver al inicio' }).click();
  17  |   await expect(page.getByRole('status')).toContainText('Sistema disponible');
  18  |   expect(errores).toEqual([]);
  19  | });
  20  | 
  21  | test('carga y error visible sin información interna, con recuperación', async ({ page }) => {
  22  |   let responder!: () => void;
  23  |   const espera = new Promise<void>((resolve) => {
  24  |     responder = resolve;
  25  |   });
  26  |   await page.route('**/api/salud', async (ruta) => {
  27  |     await espera;
  28  |     await ruta.fulfill({
  29  |       status: 503,
  30  |       contentType: 'application/json',
  31  |       body: '{"estado":"NO_DISPONIBLE","detalle":"dato interno ficticio"}',
  32  |     });
  33  |   });
  34  |   await page.goto('/inicio');
  35  |   await expect(page.getByRole('status')).toContainText('Comprobando conexión');
  36  |   await expect(page.getByRole('button')).toBeDisabled();
  37  |   responder();
  38  |   await expect(page.getByRole('status')).toContainText('Servicio no disponible');
  39  |   await expect(page.locator('body')).not.toContainText('dato interno');
  40  |   await page.unroute('**/api/salud');
  41  |   await page.getByRole('button', { name: 'Volver a comprobar' }).click();
  42  |   await expect(page.getByRole('status')).toContainText('Sistema disponible');
  43  | });
  44  | 
  45  | test('teclado, foco, idioma y ancho móvil', async ({ page }) => {
  46  |   await page.setViewportSize({ width: 375, height: 812 });
  47  |   await page.goto('/inicio');
  48  |   await expect(page.getByRole('status')).toContainText('Sistema disponible');
  49  |   await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  50  |   await page.keyboard.press('Tab');
  51  |   await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
  52  |   await page.keyboard.press('Enter');
  53  |   await expect(page.locator('main')).toBeFocused();
  54  |   await page.keyboard.press('Tab');
  55  |   await expect(page.getByRole('button', { name: 'Volver a comprobar' })).toBeFocused();
  56  |   await page.keyboard.press('Enter');
  57  |   await expect(page.getByRole('status')).toContainText('Sistema disponible');
  58  |   const desbordamiento = await page.evaluate(
  59  |     () => document.documentElement.scrollWidth > window.innerWidth,
  60  |   );
  61  |   expect(desbordamiento).toBe(false);
  62  | });
  63  | 
  64  | test('Swagger carga OpenAPI 3.1 y ejecuta la consulta técnica real', async ({ page, request }) => {
  65  |   const respuesta = await request.get('/v3/api-docs');
  66  |   expect(respuesta.status()).toBe(200);
  67  |   const contrato = await respuesta.json();
  68  |   expect(contrato.openapi).toMatch(/^3\.1\./);
> 69  |   expect(Object.keys(contrato.paths).sort()).toEqual([
      |                                              ^ Error: expect(received).toEqual(expected) // deep equality
  70  |     '/api/autenticacion/cerrar-sesion',
  71  |     '/api/autenticacion/csrf',
  72  |     '/api/autenticacion/iniciar-sesion',
  73  |     '/api/autenticacion/renovar',
  74  |     '/api/identidad/yo',
  75  |     '/api/proveedores',
  76  |     '/api/proveedores/{id}',
  77  |     '/api/proveedores/{id}/desactivar',
  78  |     '/api/proveedores/{id}/reactivar',
  79  |     '/api/salud',
  80  |   ]);
  81  |   expect(contrato.paths['/api/salud'].get.responses).toHaveProperty('200');
  82  |   expect(contrato.paths['/api/salud'].get.responses).toHaveProperty('503');
  83  |   expect(contrato.paths['/api/proveedores'].post.responses).toHaveProperty('201');
  84  |   expect(contrato.paths['/api/proveedores/{id}'].put.responses).toHaveProperty('409');
  85  |   await page.goto('/swagger-ui/index.html');
  86  |   await page.locator('.opblock-summary').filter({ hasText: '/api/salud' }).click();
  87  |   await page.getByRole('button', { name: 'Try it out' }).click();
  88  |   await page.getByRole('button', { name: 'Execute', exact: true }).click();
  89  |   await expect(page.locator('.responses-wrapper')).toContainText('DISPONIBLE');
  90  | });
  91  | 
  92  | test('cabeceras, mínimo contrato y denegación por el backend', async ({ request }) => {
  93  |   const salud = await request.get('/api/salud');
  94  |   expect(salud.status()).toBe(200);
  95  |   expect(await salud.json()).toEqual({ estado: 'DISPONIBLE' });
  96  |   expect(salud.headers()['x-content-type-options']).toContain('nosniff');
  97  |   const inicio = await request.get('/inicio');
  98  |   expect(inicio.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  99  |   expect(inicio.headers()['x-frame-options']).toBe('DENY');
  100 |   const prohibida = await request.get('/api/no-autorizada');
  101 |   expect(prohibida.status()).toBe(401);
  102 |   expect(await prohibida.json()).toEqual({ error: 'NO_AUTENTICADO' });
  103 |   expect((await request.post('/api/salud')).status()).toBe(403);
  104 | });
  105 | 
```