# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demo-aislamiento.spec.ts >> 008: tres espacios exclusivos, recorrido real por roles, cuarto visitante y pestaña antigua
- Location: e2e\demo-aislamiento.spec.ts:53:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('.estado').first()
Expected: "Presentada"
Received: "Borrador"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" locator('.estado').first() with timeout 5000ms
  - waiting for locator('.estado').first()
    14 × locator resolved to <span class="estado" _ngcontent-ng-c2404591878="">Borrador</span>
       - unexpected value "Borrador"

```

```yaml
- text: Borrador
```

# Test source

```ts
  191 |       });
  192 |       paginas.push(pagina);
  193 |     }
  194 |     const [a, b, c, cuarto] = paginas;
  195 |     await test.step('tres reservas separadas y cuarto visitante recibe cupo ocupado', async () => {
  196 |       reservas.push(await reservar(a), await reservar(b), await reservar(c));
  197 |       expect(new Set(reservas.map((r) => r.espacio)).size).toBe(3);
  198 |       expect(new Set(reservas.map((r) => r.reservaId)).size).toBe(3);
  199 |       await cuarto.goto('/demo');
  200 |       const respuesta = cuarto.waitForResponse((r) => r.url().endsWith('/api/demo/reservas'));
  201 |       await cuarto.getByRole('button', { name: 'Reservar mi espacio', exact: true }).click();
  202 |       expect((await respuesta).status()).toBe(409);
  203 |       await expect(cuarto.getByRole('alert')).toContainText('Todos los espacios están ocupados');
  204 |       await expect(
  205 |         cuarto.getByRole('button', { name: 'Entrar como solicitante', exact: true }),
  206 |       ).toBeDisabled();
  207 |       expect(
  208 |         await cuarto.evaluate((clave) => sessionStorage.getItem(clave) === null, claveContexto),
  209 |       ).toBe(true);
  210 |     });
  211 | 
  212 |     await test.step('presentación usable en móvil, guías de cuatro pasos y sin credenciales almacenadas', async () => {
  213 |       await a.setViewportSize({ width: 390, height: 844 });
  214 |       expect(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  215 |       await expect(a.locator('.guia')).toHaveCount(3);
  216 |       await expect(a.locator('.guia li')).toHaveCount(12);
  217 |       await a.screenshot({
  218 |         path: join(process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results', 'frontend-demo-movil.png'),
  219 |         fullPage: true,
  220 |       });
  221 |       await a.setViewportSize({ width: 1280, height: 900 });
  222 |       await a.screenshot({
  223 |         path: join(
  224 |           process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  225 |           'frontend-demo-escritorio.png',
  226 |         ),
  227 |         fullPage: true,
  228 |       });
  229 |       const cookies = await contextos[0].cookies();
  230 |       const reserva = cookies.find((cookie) => cookie.name === 'DEMO-RESERVA');
  231 |       expect(
  232 |         Boolean(reserva?.httpOnly && reserva.sameSite === 'Strict' && reserva.path === '/api'),
  233 |       ).toBe(true);
  234 |       expect(
  235 |         await a.evaluate((clave) => {
  236 |           const publico = JSON.parse(sessionStorage.getItem(clave)!);
  237 |           return (
  238 |             Object.keys(publico).sort().join(',') === 'espacio,expiraEn,generacion,reservaId' &&
  239 |             !document.cookie.includes('DEMO-RESERVA')
  240 |           );
  241 |         }, claveContexto),
  242 |       ).toBe(true);
  243 |     });
  244 | 
  245 |     await test.step('solicitante crea, edita y presenta con catálogo preparado', async () => {
  246 |       solicitante = await entrar(a, 'SOLICITANTE');
  247 |       expect(solicitante.usuario.roles).toEqual(['SOLICITANTE']);
  248 |       await a.getByRole('link', { name: 'Nueva solicitud', exact: true }).click();
  249 |       await a.getByLabel('Asunto *', { exact: true }).fill(asunto);
  250 |       await a.getByRole('button', { name: 'Crear borrador', exact: true }).click();
  251 |       await expect(a).toHaveURL(/\/solicitudes\/[0-9a-f-]{36}\/editar$/);
  252 |       rutaSolicitud = new URL(a.url()).pathname.replace(/\/editar$/, '');
  253 |       const catalogoProveedor = a.waitForResponse((r) => r.url().includes('/api/proveedores?'));
  254 |       await a.getByRole('button', { name: 'Buscar proveedor', exact: true }).click();
  255 |       const proveedorRespuesta = await catalogoProveedor;
  256 |       registrar({
  257 |         tipo: 'espera-resuelta',
  258 |         visitante: 0,
  259 |         ...catalogos.get(proveedorRespuesta.request()),
  260 |       });
  261 |       expect(proveedorRespuesta.status()).toBe(200);
  262 |       await expect(a.getByLabel('Proveedor', { exact: true })).toBeEnabled();
  263 |       await expect(a.locator('#proveedor-seleccion option').nth(1)).toBeAttached();
  264 |       await a.getByLabel('Proveedor', { exact: true }).selectOption({ index: 1 });
  265 |       await expect(a.getByLabel('Proveedor', { exact: true })).toHaveValue(/^[0-9a-f-]{36}$/);
  266 |       const catalogoSupervisor = a.waitForResponse((r) =>
  267 |         r.url().includes('/api/identidad/supervisores?'),
  268 |       );
  269 |       await a.getByRole('button', { name: 'Buscar supervisor', exact: true }).click();
  270 |       const supervisorRespuesta = await catalogoSupervisor;
  271 |       registrar({
  272 |         tipo: 'espera-resuelta',
  273 |         visitante: 0,
  274 |         ...catalogos.get(supervisorRespuesta.request()),
  275 |       });
  276 |       expect(supervisorRespuesta.status()).toBe(200);
  277 |       await expect(a.getByLabel('Supervisor', { exact: true })).toBeEnabled();
  278 |       await expect(a.locator('#supervisor-seleccion option').nth(1)).toBeAttached();
  279 |       await a.getByLabel('Supervisor', { exact: true }).selectOption({ index: 1 });
  280 |       await expect(a.getByLabel('Supervisor', { exact: true })).toHaveValue(/^[0-9a-f-]{36}$/);
  281 |       await a.getByRole('button', { name: 'Añadir concepto', exact: true }).click();
  282 |       await a
  283 |         .getByLabel('Descripción del concepto 1', { exact: true })
  284 |         .fill('Material de prueba ficticio');
  285 |       await a.getByLabel('Cantidad del concepto 1', { exact: true }).fill('2');
  286 |       await a.getByLabel('Precio unitario del concepto 1', { exact: true }).fill('12.50');
  287 |       await a.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  288 |       await expect(a).toHaveURL(new RegExp(`${rutaSolicitud}$`));
  289 |       await a.getByRole('button', { name: 'Presentar solicitud', exact: true }).click();
  290 |       await a.getByRole('button', { name: 'Confirmar y presentar', exact: true }).click();
> 291 |       await expect(a.locator('.estado').first()).toHaveText('Presentada');
      |                                                  ^ Error: expect(locator).toHaveText(expected) failed
  292 |     });
  293 | 
  294 |     await test.step('cambio de rol rota sesión y supervisor decide', async () => {
  295 |       const supervisor = await entrar(a, 'SUPERVISOR');
  296 |       expect(supervisor.usuario.roles).toEqual(['SUPERVISOR']);
  297 |       const antiguo = await contextos[0].request.get('/api/identidad/yo', {
  298 |         headers: {
  299 |           Authorization: `Bearer ${solicitante.accessToken}`,
  300 |           'X-Demo-Contexto': selector(reservas[0]),
  301 |         },
  302 |       });
  303 |       expect(antiguo.status()).toBe(401);
  304 |       await a.getByRole('link', { name: asunto, exact: true }).click();
  305 |       await a.getByRole('button', { name: 'Aprobar solicitud', exact: true }).click();
  306 |       await a.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  307 |       await a.getByRole('button', { name: 'Confirmar aprobación', exact: true }).click();
  308 |       await expect(a.locator('.estado').first()).toHaveText('Aprobada');
  309 |     });
  310 | 
  311 |     await test.step('auditor solo consulta su espacio y otra reserva no puede leer la solicitud', async () => {
  312 |       const auditor = await entrar(a, 'AUDITOR');
  313 |       expect(auditor.usuario.roles).toEqual(['AUDITOR']);
  314 |       await expect(a.locator('.estado-consulta')).toContainText('eventos encontrados');
  315 |       await a.reload();
  316 |       await expect(a).toHaveURL(/\/historial$/);
  317 |       await expect(a.locator('.estado-consulta')).toContainText('eventos encontrados');
  318 |       const auditorB = await entrar(b, 'AUDITOR');
  319 |       const ajena = await contextos[1].request.get(`/api${rutaSolicitud}`, {
  320 |         headers: {
  321 |           Authorization: `Bearer ${auditorB.accessToken}`,
  322 |           'X-Demo-Contexto': selector(reservas[1]),
  323 |         },
  324 |       });
  325 |       expect(ajena.status()).toBe(404);
  326 |       const manipulado = await contextos[1].request.get('/api/identidad/yo', {
  327 |         headers: {
  328 |           Authorization: `Bearer ${auditorB.accessToken}`,
  329 |           'X-Demo-Contexto': selector(reservas[0]),
  330 |         },
  331 |       });
  332 |       expect(manipulado.status()).toBe(401);
  333 |       const sinContexto = await contextos[1].request.get('/api/identidad/yo', {
  334 |         headers: {
  335 |           Authorization: `Bearer ${auditorB.accessToken}`,
  336 |         },
  337 |       });
  338 |       expect(sinContexto.status()).toBe(401);
  339 |     });
  340 | 
  341 |     await test.step('una pestaña antigua no adopta una cookie de otra reserva', async () => {
  342 |       const cookiesA = await contextos[0].cookies();
  343 |       const cookiesB = await contextos[1].cookies();
  344 |       const cookieAjena = cookiesB.find((cookie) => cookie.name === 'DEMO-RESERVA')!;
  345 |       await contextos[0].addCookies([cookieAjena]);
  346 |       await a.getByRole('link', { name: 'Demo', exact: true }).click();
  347 |       await expect(
  348 |         a.getByRole('button', { name: 'Reservar mi espacio', exact: true }),
  349 |       ).toBeVisible();
  350 |       expect(
  351 |         await a.evaluate((clave) => sessionStorage.getItem(clave) === null, claveContexto),
  352 |       ).toBe(true);
  353 |       await expect(
  354 |         a.getByRole('button', { name: 'Entrar como auditor', exact: true }),
  355 |       ).toBeDisabled();
  356 |       await contextos[0].addCookies(cookiesA);
  357 |     });
  358 | 
  359 |     for (let i = 0; i < reservas.length; i++) await liberar(contextos[i], reservas[i]);
  360 |   } finally {
  361 |     for (let i = 0; i < paginas.length; i++) {
  362 |       const eventos = await paginas[i].evaluate(
  363 |         () =>
  364 |           (window as unknown as { __ag016Diagnostico?: Record<string, unknown>[] })
  365 |             .__ag016Diagnostico ?? [],
  366 |       );
  367 |       for (const evento of eventos) registrar({ ...evento, visitante: i });
  368 |     }
  369 |     diagnostico.sort((a, b) => String(a['fecha']).localeCompare(String(b['fecha'])));
  370 |     const rutaDiagnostico = testInfo.outputPath('diagnostico.json');
  371 |     await mkdir(dirname(rutaDiagnostico), { recursive: true });
  372 |     await writeFile(rutaDiagnostico, `${JSON.stringify(diagnostico, null, 2)}\n`, { flag: 'wx' });
  373 |     await testInfo.attach('diagnostico-formulario-sin-datos', {
  374 |       path: rutaDiagnostico,
  375 |       contentType: 'application/json',
  376 |     });
  377 |     for (const contexto of contextos) await contexto.close();
  378 |   }
  379 | });
  380 | 
```