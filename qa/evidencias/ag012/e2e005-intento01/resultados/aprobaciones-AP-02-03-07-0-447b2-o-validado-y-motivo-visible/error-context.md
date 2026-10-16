# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: aprobaciones.spec.ts >> AP-02/03/07/08: multirrol restringido, rechazo validado y motivo visible
- Location: e2e\aprobaciones.spec.ts:336:5

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByRole('button', { name: 'Aprobar solicitud', exact: true })
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" getByRole('button', { name: 'Aprobar solicitud', exact: true }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'Aprobar solicitud', exact: true })
    14 × locator resolved to <button type="button" _ngcontent-ng-c2819222159=""> Aprobar solicitud</button>
       - unexpected value "inactive"

```

```yaml
- button "Aprobar solicitud"
```

# Test source

```ts
  48  |   expect(respuesta.status()).toBe(200);
  49  |   return (await respuesta.json()) as DetalleSolicitud;
  50  | }
  51  | async function presentada(admin: Sesion, autor: Sesion, supervisor: Sesion, asunto: string) {
  52  |   const proveedor = await admin.api.post('/api/proveedores', {
  53  |     headers: await escritura(admin.api, admin.headers),
  54  |     data: {
  55  |       tipo: 'PROFESIONAL',
  56  |       denominacion: `Proveedor aprobaciones ${randomUUID()}`,
  57  |       paisFiscal: 'ES',
  58  |       identificadorFiscal: `FICTICIO-${randomUUID()}`,
  59  |       correoContacto: null,
  60  |       telefonoContacto: null,
  61  |     },
  62  |   });
  63  |   expect(proveedor.status()).toBe(201);
  64  |   const proveedorId = ((await proveedor.json()) as { id: string }).id;
  65  |   const alta = await autor.api.post('/api/solicitudes', {
  66  |     headers: await escritura(autor.api, autor.headers),
  67  |     data: { asunto },
  68  |   });
  69  |   expect(alta.status()).toBe(201);
  70  |   const borrador = (await alta.json()) as DetalleSolicitud;
  71  |   const ruta = `/api/solicitudes/${borrador.id}`;
  72  |   const guardado = await autor.api.put(ruta, {
  73  |     headers: await escritura(autor.api, autor.headers),
  74  |     data: {
  75  |       asunto,
  76  |       descripcion: 'Solicitud ficticia para verificar decisiones con persistencia real.',
  77  |       proveedorId,
  78  |       supervisorId: supervisor.usuario.id,
  79  |       version: borrador.version,
  80  |       conceptos: [
  81  |         {
  82  |           id: null,
  83  |           descripcion: 'Servicio ficticio',
  84  |           cantidad: '2.500',
  85  |           unidad: 'HORA',
  86  |           precioUnitario: '4.1250',
  87  |           posicion: 1,
  88  |         },
  89  |         {
  90  |           id: null,
  91  |           descripcion: 'Material ficticio',
  92  |           cantidad: '3',
  93  |           unidad: 'UNIDAD',
  94  |           precioUnitario: '0.3350',
  95  |           posicion: 2,
  96  |         },
  97  |       ],
  98  |     },
  99  |   });
  100 |   expect(guardado.status()).toBe(200);
  101 |   const version = ((await guardado.json()) as DetalleSolicitud).version;
  102 |   const envio = await autor.api.post(`${ruta}/presentar`, {
  103 |     headers: await escritura(autor.api, { ...autor.headers, 'Idempotency-Key': randomUUID() }),
  104 |     data: { version },
  105 |   });
  106 |   expect(envio.status()).toBe(200);
  107 |   const detalle = await consultar(autor, borrador.id);
  108 |   expect(detalle.estado).toBe('PRESENTADA');
  109 |   expect(detalle.importeTotal).toBe('11.32');
  110 |   return detalle;
  111 | }
  112 | async function captura(page: Page, nombre: string, ancho: number) {
  113 |   await page.setViewportSize({ width: ancho, height: 900 });
  114 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  115 |   await page.screenshot({
  116 |     path: join(
  117 |       process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  118 |       `frontend005-${nombre}-${ancho}.png`,
  119 |     ),
  120 |     fullPage: true,
  121 |   });
  122 | }
  123 | async function focoVisible(page: Page) {
  124 |   expect(
  125 |     await page.evaluate(() => {
  126 |       const control = document.activeElement as HTMLElement;
  127 |       const rect = control.getBoundingClientRect();
  128 |       const superior = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
  129 |       return !!superior && (control === superior || control.contains(superior));
  130 |     }),
  131 |   ).toBe(true);
  132 | }
  133 | async function tecladoDecision(
  134 |   page: Page,
  135 |   asunto: string,
  136 |   ancho: number,
  137 |   tipo: 'aprobación' | 'rechazo',
  138 | ) {
  139 |   await page.setViewportSize({ width: ancho, height: 900 });
  140 |   await page.getByRole('heading', { name: asunto, exact: true }).focus();
  141 |   for (const control of [
  142 |     page.getByRole('button', { name: 'Aprobar solicitud', exact: true }),
  143 |     page.getByRole('button', { name: 'Rechazar solicitud', exact: true }),
  144 |     page.locator('#texto-decision'),
  145 |     page.getByRole('button', { name: 'Revisar decisión', exact: true }),
  146 |   ]) {
  147 |     await page.keyboard.press('Tab');
> 148 |     await expect(control).toBeFocused();
      |                           ^ Error: expect(locator).toBeFocused() failed
  149 |     await focoVisible(page);
  150 |   }
  151 |   await page.keyboard.press('Enter');
  152 |   await expect(page.getByRole('heading', { name: `Confirmar ${tipo}`, exact: true })).toBeFocused();
  153 |   await page.keyboard.press('Tab');
  154 |   await expect(page.getByRole('button', { name: `Confirmar ${tipo}`, exact: true })).toBeFocused();
  155 |   await focoVisible(page);
  156 |   await page.keyboard.press('Tab');
  157 |   await expect(page.getByRole('button', { name: 'Volver a revisar', exact: true })).toBeFocused();
  158 |   await focoVisible(page);
  159 |   await captura(page, `confirmacion-${tipo}`, ancho);
  160 |   await page.keyboard.press('Enter');
  161 |   await expect(page.locator('#texto-decision')).toBeFocused();
  162 | }
  163 | async function comprobarLectura(
  164 |   page: Page,
  165 |   detalle: DetalleSolicitud,
  166 |   estado: string,
  167 |   texto: string,
  168 | ) {
  169 |   await page.goto(`/solicitudes/${detalle.id}`);
  170 |   await expect(page.getByRole('heading', { name: detalle.asunto, exact: true })).toBeVisible();
  171 |   await expect(page.locator('.encabezado .estado')).toHaveText(estado);
  172 |   await expect(page.locator('.resultado-decision')).toContainText(texto);
  173 |   await expect(page.locator('app-solicitud-decision')).toHaveCount(0);
  174 |   await expect(page.getByRole('link', { name: 'Editar borrador', exact: true })).toHaveCount(0);
  175 | }
  176 | function fixturesExternos() {
  177 |   const ajeno = process.env['E2E_AJENO_CORREO'];
  178 |   const multiple = process.env['E2E_MULTIPLE_CORREO'];
  179 |   expect(ajeno, 'El coordinador debe proporcionar un SOLICITANTE ajeno ficticio').toBeTruthy();
  180 |   expect(
  181 |     multiple,
  182 |     'El coordinador debe proporcionar la cuenta ficticia de cuatro roles',
  183 |   ).toBeTruthy();
  184 |   return { ajeno: ajeno!, multiple: multiple! };
  185 | }
  186 | 
  187 | test('AP-01/03/04/06/07/08: aprobación confirmada, replay y lectores autorizados reales', async ({
  188 |   page,
  189 |   browser,
  190 | }) => {
  191 |   test.setTimeout(180000);
  192 |   const externos = fixturesExternos();
  193 |   const sesiones: Sesion[] = [];
  194 |   try {
  195 |     const admin = await sesionApi('ADMINISTRADOR');
  196 |     sesiones.push(admin);
  197 |     const autor = await sesionApi('SOLICITANTE');
  198 |     sesiones.push(autor);
  199 |     const supervisor = await sesionApi('SUPERVISOR');
  200 |     sesiones.push(supervisor);
  201 |     const detalle = await presentada(admin, autor, supervisor, `Aprobación E2E ${randomUUID()}`);
  202 |     const ruta = `/api/solicitudes/${detalle.id}`;
  203 |     const comentario = 'Aprobación ficticia: conceptos y presupuesto revisados.';
  204 |     let resultado: ResultadoDecision;
  205 |     let cabeceras: Record<string, string> = {};
  206 |     let cuerpo: Record<string, unknown> = {};
  207 |     await test.step('Bandeja asignada y detalle conservan conceptos, total y proveedor', async () => {
  208 |       await acceder(page, 'SUPERVISOR');
  209 |       await page.getByRole('link', { name: 'Aprobaciones', exact: true }).click();
  210 |       await page.getByLabel('Asunto contiene', { exact: true }).fill(detalle.asunto);
  211 |       await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  212 |       await expect(page.locator('.solicitud-tarjeta')).toHaveCount(1);
  213 |       for (const ancho of [360, 768, 1440]) await captura(page, 'bandeja', ancho);
  214 |       await page.getByRole('link', { name: detalle.asunto, exact: true }).click();
  215 |       await expect(page.locator('.importe-total')).toHaveText('11,32 €');
  216 |       await expect(
  217 |         page.getByRole('button', { name: 'Aprobar solicitud', exact: true }),
  218 |       ).toBeVisible();
  219 |     });
  220 |     await test.step('Validación, revisión y confirmación explícita con teclado', async () => {
  221 |       let peticiones = 0;
  222 |       const contar = (peticion: import('@playwright/test').Request) => {
  223 |         if (peticion.method() === 'POST' && peticion.url().endsWith('/aprobar')) peticiones++;
  224 |       };
  225 |       page.on('request', contar);
  226 |       await page.getByRole('button', { name: 'Aprobar solicitud', exact: true }).click();
  227 |       await page
  228 |         .getByLabel('Comentario de aprobación (opcional)', { exact: true })
  229 |         .fill('x'.repeat(501));
  230 |       await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  231 |       await expect(page.locator('#decision-error')).toHaveText(
  232 |         'El comentario admite hasta 500 caracteres.',
  233 |       );
  234 |       await page
  235 |         .getByLabel('Comentario de aprobación (opcional)', { exact: true })
  236 |         .fill(comentario);
  237 |       await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  238 |       await page.getByRole('button', { name: 'Volver a revisar', exact: true }).click();
  239 |       for (const ancho of [360, 768, 1440])
  240 |         await tecladoDecision(page, detalle.asunto, ancho, 'aprobación');
  241 |       expect(peticiones).toBe(0);
  242 |       page.off('request', contar);
  243 |       await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  244 |       const respuestaPendiente = page.waitForResponse(
  245 |         (r) => r.request().method() === 'POST' && r.url().endsWith(`${ruta}/aprobar`),
  246 |       );
  247 |       await page.getByRole('button', { name: 'Confirmar aprobación', exact: true }).click();
  248 |       const respuesta = await respuestaPendiente;
```