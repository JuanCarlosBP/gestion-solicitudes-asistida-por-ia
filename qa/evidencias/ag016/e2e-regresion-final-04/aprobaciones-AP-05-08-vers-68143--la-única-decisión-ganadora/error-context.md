# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: aprobaciones.spec.ts >> AP-05/08: versión obsoleta y dos pestañas reales conservan la única decisión ganadora
- Location: e2e\aprobaciones.spec.ts:484:5

# Error details

```
Error: El coordinador debe proporcionar un SOLICITANTE ajeno ficticio

expect(received).toBeTruthy()

Received: undefined
```

# Test source

```ts
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
  139 |   // Volver a revisar devuelve el foco al campo después del siguiente render.
  140 |   // Esperar ese efecto evita que interrumpa el recorrido que empieza en el título.
  141 |   await expect(page.locator('#texto-decision')).toBeFocused();
  142 |   await page.setViewportSize({ width: ancho, height: 900 });
  143 |   const titulo = page.getByRole('heading', { name: asunto, exact: true });
  144 |   await titulo.focus();
  145 |   await expect(titulo).toBeFocused();
  146 |   for (const control of [
  147 |     page.getByRole('button', { name: 'Aprobar solicitud', exact: true }),
  148 |     page.getByRole('button', { name: 'Rechazar solicitud', exact: true }),
  149 |     page.locator('#texto-decision'),
  150 |     page.getByRole('button', { name: 'Revisar decisión', exact: true }),
  151 |   ]) {
  152 |     await page.keyboard.press('Tab');
  153 |     await expect(control).toBeFocused();
  154 |     await focoVisible(page);
  155 |   }
  156 |   await page.keyboard.press('Enter');
  157 |   await expect(page.getByRole('heading', { name: `Confirmar ${tipo}`, exact: true })).toBeFocused();
  158 |   await page.keyboard.press('Tab');
  159 |   await expect(page.getByRole('button', { name: `Confirmar ${tipo}`, exact: true })).toBeFocused();
  160 |   await focoVisible(page);
  161 |   await page.keyboard.press('Tab');
  162 |   await expect(page.getByRole('button', { name: 'Volver a revisar', exact: true })).toBeFocused();
  163 |   await focoVisible(page);
  164 |   await captura(page, `confirmacion-${tipo}`, ancho);
  165 |   await page.keyboard.press('Enter');
  166 |   await expect(page.locator('#texto-decision')).toBeFocused();
  167 | }
  168 | async function comprobarLectura(
  169 |   page: Page,
  170 |   detalle: DetalleSolicitud,
  171 |   estado: string,
  172 |   texto: string,
  173 | ) {
  174 |   await page.goto(`/solicitudes/${detalle.id}`);
  175 |   await expect(page.getByRole('heading', { name: detalle.asunto, exact: true })).toBeVisible();
  176 |   await expect(page.locator('.encabezado .estado')).toHaveText(estado);
  177 |   await expect(page.locator('.resultado-decision')).toContainText(texto);
  178 |   await expect(page.locator('app-solicitud-decision')).toHaveCount(0);
  179 |   await expect(page.getByRole('link', { name: 'Editar borrador', exact: true })).toHaveCount(0);
  180 | }
  181 | function fixturesExternos() {
  182 |   const ajeno = process.env['E2E_AJENO_CORREO'];
  183 |   const multiple = process.env['E2E_MULTIPLE_CORREO'];
> 184 |   expect(ajeno, 'El coordinador debe proporcionar un SOLICITANTE ajeno ficticio').toBeTruthy();
      |                                                                                   ^ Error: El coordinador debe proporcionar un SOLICITANTE ajeno ficticio
  185 |   expect(
  186 |     multiple,
  187 |     'El coordinador debe proporcionar la cuenta ficticia de cuatro roles',
  188 |   ).toBeTruthy();
  189 |   return { ajeno: ajeno!, multiple: multiple! };
  190 | }
  191 | 
  192 | test('AP-01/03/04/06/07/08: aprobación confirmada, replay y lectores autorizados reales', async ({
  193 |   page,
  194 |   browser,
  195 | }) => {
  196 |   test.setTimeout(180000);
  197 |   const externos = fixturesExternos();
  198 |   const sesiones: Sesion[] = [];
  199 |   try {
  200 |     const admin = await sesionApi('ADMINISTRADOR');
  201 |     sesiones.push(admin);
  202 |     const autor = await sesionApi('SOLICITANTE');
  203 |     sesiones.push(autor);
  204 |     const supervisor = await sesionApi('SUPERVISOR');
  205 |     sesiones.push(supervisor);
  206 |     const detalle = await presentada(admin, autor, supervisor, `Aprobación E2E ${randomUUID()}`);
  207 |     const ruta = `/api/solicitudes/${detalle.id}`;
  208 |     const comentario = 'Aprobación ficticia: conceptos y presupuesto revisados.';
  209 |     let resultado: ResultadoDecision;
  210 |     let cabeceras: Record<string, string> = {};
  211 |     let cuerpo: Record<string, unknown> = {};
  212 |     await test.step('Bandeja asignada y detalle conservan conceptos, total y proveedor', async () => {
  213 |       await acceder(page, 'SUPERVISOR');
  214 |       await page.getByRole('link', { name: 'Aprobaciones', exact: true }).click();
  215 |       await page.getByLabel('Asunto contiene', { exact: true }).fill(detalle.asunto);
  216 |       await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  217 |       await expect(page.locator('.solicitud-tarjeta')).toHaveCount(1);
  218 |       for (const ancho of [360, 768, 1440]) await captura(page, 'bandeja', ancho);
  219 |       await page.getByRole('link', { name: detalle.asunto, exact: true }).click();
  220 |       await expect(page.locator('.importe-total')).toHaveText('11,32 €');
  221 |       await expect(
  222 |         page.getByRole('button', { name: 'Aprobar solicitud', exact: true }),
  223 |       ).toBeVisible();
  224 |     });
  225 |     await test.step('Validación, revisión y confirmación explícita con teclado', async () => {
  226 |       let peticiones = 0;
  227 |       const contar = (peticion: import('@playwright/test').Request) => {
  228 |         if (peticion.method() === 'POST' && peticion.url().endsWith('/aprobar')) peticiones++;
  229 |       };
  230 |       page.on('request', contar);
  231 |       await page.getByRole('button', { name: 'Aprobar solicitud', exact: true }).click();
  232 |       await page
  233 |         .getByLabel('Comentario de aprobación (opcional)', { exact: true })
  234 |         .fill('x'.repeat(501));
  235 |       await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  236 |       await expect(page.locator('#decision-error')).toHaveText(
  237 |         'El comentario admite hasta 500 caracteres.',
  238 |       );
  239 |       await page
  240 |         .getByLabel('Comentario de aprobación (opcional)', { exact: true })
  241 |         .fill(comentario);
  242 |       await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  243 |       await page.getByRole('button', { name: 'Volver a revisar', exact: true }).click();
  244 |       for (const ancho of [360, 768, 1440])
  245 |         await tecladoDecision(page, detalle.asunto, ancho, 'aprobación');
  246 |       expect(peticiones).toBe(0);
  247 |       page.off('request', contar);
  248 |       await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  249 |       const respuestaPendiente = page.waitForResponse(
  250 |         (r) => r.request().method() === 'POST' && r.url().endsWith(`${ruta}/aprobar`),
  251 |       );
  252 |       await page.getByRole('button', { name: 'Confirmar aprobación', exact: true }).click();
  253 |       const respuesta = await respuestaPendiente;
  254 |       expect(respuesta.status()).toBe(200);
  255 |       resultado = (await respuesta.json()) as ResultadoDecision;
  256 |       cabeceras = {
  257 |         Authorization: respuesta.request().headers()['authorization'],
  258 |         'Idempotency-Key': respuesta.request().headers()['idempotency-key'],
  259 |       };
  260 |       expect(respuesta.request().headers()['x-xsrf-token']).toBeTruthy();
  261 |       expect(cabeceras['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
  262 |       cuerpo = respuesta.request().postDataJSON() as Record<string, unknown>;
  263 |       expect(cuerpo).toEqual({ version: detalle.version, comentario });
  264 |       await expect(page.locator('.encabezado .estado')).toHaveText('Aprobada');
  265 |       await expect(page.getByRole('heading', { name: detalle.asunto, exact: true })).toBeFocused();
  266 |       for (const ancho of [360, 768, 1440]) await captura(page, 'aprobada', ancho);
  267 |     });
  268 |     await test.step('Replay exacto, clave incompatible y nueva decisión final', async () => {
  269 |       const repetida = await page.request.post(`${ruta}/aprobar`, {
  270 |         headers: await escritura(page.request, cabeceras),
  271 |         data: cuerpo,
  272 |       });
  273 |       expect(repetida.status()).toBe(200);
  274 |       expect(await repetida.json()).toEqual(resultado!);
  275 |       const incompatible = await page.request.post(`${ruta}/rechazar`, {
  276 |         headers: await escritura(page.request, cabeceras),
  277 |         data: { version: detalle.version, motivo: 'Rechazo ficticio incompatible' },
  278 |       });
  279 |       expect(incompatible.status()).toBe(409);
  280 |       expect(((await incompatible.json()) as { error: string }).error).toBe(
  281 |         'CLAVE_IDEMPOTENCIA_REUTILIZADA',
  282 |       );
  283 |       const nueva = await page.request.post(`${ruta}/aprobar`, {
  284 |         headers: await escritura(page.request, { ...cabeceras, 'Idempotency-Key': randomUUID() }),
```