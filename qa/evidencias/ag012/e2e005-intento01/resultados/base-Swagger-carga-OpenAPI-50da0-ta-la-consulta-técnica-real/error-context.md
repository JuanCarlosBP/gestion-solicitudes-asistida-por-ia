# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: base.spec.ts >> Swagger carga OpenAPI 3.1 y ejecuta la consulta técnica real
- Location: e2e\base.spec.ts:64:5

# Error details

```
Error: expect(received).toHaveProperty(path)

Expected path: "200"
Received path: []

Received value: {"400": {"content": {"*/*": {"schema": {"$ref": "#/components/schemas/ErrorPublico"}}}, "description": "SOLICITUD_INVALIDA"}, "401": {"content": {"*/*": {"schema": {"$ref": "#/components/schemas/ResultadoDecision"}}}, "description": "NO_AUTENTICADO"}, "403": {"content": {"*/*": {"schema": {"$ref": "#/components/schemas/ErrorPublico"}}}, "description": "ACCESO_NO_PERMITIDO o CSRF ausente"}, "404": {"content": {"*/*": {"schema": {"$ref": "#/components/schemas/ResultadoDecision"}}}, "description": "SOLICITUD_NO_ENCONTRADA: inexistente o no visible"}, "409": {"content": {"*/*": {"schema": {"$ref": "#/components/schemas/ResultadoDecision"}}}, "description": "VERSION_OBSOLETA, SOLICITUD_NO_EDITABLE, SOLICITUD_NO_DECIDIBLE, PROVEEDOR_INACTIVO, SUPERVISOR_INVALIDO o CLAVE_IDEMPOTENCIA_REUTILIZADA"}, "500": {"content": {"*/*": {"schema": {"$ref": "#/components/schemas/ErrorPublico"}}}, "description": "ERROR_INTERNO"}, "503": {"content": {"*/*": {"schema": {"$ref": "#/components/schemas/ErrorPublico"}}}, "description": "DEPENDENCIA_NO_DISPONIBLE o NUMERACION_AGOTADA"}}
```

# Test source

```ts
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
  69  |   expect(Object.keys(contrato.paths).sort()).toEqual([
  70  |     '/api/autenticacion/cerrar-sesion',
  71  |     '/api/autenticacion/csrf',
  72  |     '/api/autenticacion/iniciar-sesion',
  73  |     '/api/autenticacion/renovar',
  74  |     '/api/identidad/supervisores',
  75  |     '/api/identidad/yo',
  76  |     '/api/proveedores',
  77  |     '/api/proveedores/{id}',
  78  |     '/api/proveedores/{id}/desactivar',
  79  |     '/api/proveedores/{id}/reactivar',
  80  |     '/api/salud',
  81  |     '/api/solicitudes',
  82  |     '/api/solicitudes/{id}',
  83  |     '/api/solicitudes/{id}/aprobar',
  84  |     '/api/solicitudes/{id}/presentar',
  85  |     '/api/solicitudes/{id}/rechazar',
  86  |   ]);
  87  |   expect(contrato.paths['/api/salud'].get.responses).toHaveProperty('200');
  88  |   expect(contrato.paths['/api/salud'].get.responses).toHaveProperty('503');
  89  |   expect(contrato.paths['/api/proveedores'].post.responses).toHaveProperty('201');
  90  |   expect(contrato.paths['/api/proveedores/{id}'].put.responses).toHaveProperty('409');
  91  |   expect(contrato.paths['/api/solicitudes'].post.responses).toHaveProperty('201');
  92  |   expect(contrato.paths['/api/solicitudes/{id}'].put.responses).toHaveProperty('409');
  93  |   expect(contrato.paths['/api/solicitudes/{id}/presentar'].post.parameters).toEqual(
  94  |     expect.arrayContaining([expect.objectContaining({ name: 'Idempotency-Key', required: true })]),
  95  |   );
  96  |   for (const accion of ['aprobar', 'rechazar']) {
  97  |     const operacion = contrato.paths[`/api/solicitudes/{id}/${accion}`].post;
  98  |     expect(operacion.parameters).toEqual(
  99  |       expect.arrayContaining([
  100 |         expect.objectContaining({ name: 'Idempotency-Key', required: true }),
  101 |       ]),
  102 |     );
  103 |     for (const estado of ['200', '400', '401', '403', '404', '409']) {
> 104 |       expect(operacion.responses).toHaveProperty(estado);
      |                                   ^ Error: expect(received).toHaveProperty(path)
  105 |     }
  106 |   }
  107 |   await page.goto('/swagger-ui/index.html');
  108 |   await page.locator('.opblock-summary').filter({ hasText: '/api/salud' }).click();
  109 |   await page.getByRole('button', { name: 'Try it out' }).click();
  110 |   await page.getByRole('button', { name: 'Execute', exact: true }).click();
  111 |   await expect(page.locator('.responses-wrapper')).toContainText('DISPONIBLE');
  112 | });
  113 | 
  114 | test('cabeceras, mínimo contrato y denegación por el backend', async ({ request }) => {
  115 |   const salud = await request.get('/api/salud');
  116 |   expect(salud.status()).toBe(200);
  117 |   expect(await salud.json()).toEqual({ estado: 'DISPONIBLE' });
  118 |   expect(salud.headers()['x-content-type-options']).toContain('nosniff');
  119 |   const inicio = await request.get('/inicio');
  120 |   expect(inicio.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  121 |   expect(inicio.headers()['x-frame-options']).toBe('DENY');
  122 |   const prohibida = await request.get('/api/no-autorizada');
  123 |   expect(prohibida.status()).toBe(401);
  124 |   expect(await prohibida.json()).toEqual({ error: 'NO_AUTENTICADO' });
  125 |   expect((await request.post('/api/salud')).status()).toBe(403);
  126 | });
  127 | 
```