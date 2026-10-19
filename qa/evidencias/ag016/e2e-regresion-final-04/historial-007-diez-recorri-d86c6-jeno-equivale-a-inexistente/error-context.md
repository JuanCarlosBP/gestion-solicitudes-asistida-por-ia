# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: historial.spec.ts >> 007: diez recorridos de historial y resumen >> HA-E2E06: sin rol no hay global/proveedor y recurso ajeno equivale a inexistente
- Location: e2e\historial.spec.ts:277:7

# Error details

```
Error: Falta fixture E2E_AJENO_CORREO para probar solicitudes de otro autor.
```

# Test source

```ts
  204 |     await expect(page.locator('.estado-consulta')).toContainText('eventos encontrados');
  205 |     await page.getByLabel('Tipo de recurso', { exact: true }).selectOption('SOLICITUD');
  206 |     await page.getByLabel('Recurso (UUID)', { exact: true }).fill(aprobada.id);
  207 |     await page.getByLabel('Eventos por página', { exact: true }).selectOption('1');
  208 |     await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  209 |     await expect(page.locator('.evento-historial')).toHaveCount(1);
  210 |     await expect(page.locator('.estado-consulta')).toHaveText('4 eventos encontrados');
  211 |     const primera = await page.locator('.evento-historial h3').textContent();
  212 |     await page.getByRole('button', { name: 'Siguiente página de eventos', exact: true }).click();
  213 |     await expect(page).toHaveURL(/page=1/);
  214 |     await expect(page.locator('.evento-historial h3')).not.toHaveText(primera!);
  215 |     await page.reload();
  216 |     await expect(page.locator('.paginacion-historial')).toContainText('Página 2 de 4');
  217 |     await page.goBack();
  218 |     await expect(page.locator('.paginacion-historial')).toContainText('Página 1 de 4');
  219 |     await page.getByLabel('Acción', { exact: true }).selectOption('APROBADA');
  220 |     await page.getByLabel('Actor (UUID)', { exact: true }).fill(supervisor.usuarioId);
  221 |     await page
  222 |       .getByLabel('Desde (ISO con zona)', { exact: true })
  223 |       .fill('2020-01-01T00:00:00+02:00');
  224 |     await page.getByLabel('Hasta (ISO con zona)', { exact: true }).fill('2030-01-01T00:00:00Z');
  225 |     await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  226 |     await expect(page.locator('.estado-consulta')).toHaveText('1 eventos encontrados');
  227 |     await expect(page.locator('.evento-historial h3')).toHaveText('Solicitud aprobada');
  228 |   });
  229 |   test('HA-E2E04: administrador y auditor consultan ciclo completo de proveedor', async ({
  230 |     page,
  231 |   }) => {
  232 |     await acceder(page, 'ADMINISTRADOR');
  233 |     await page.goto(`/proveedores/${proveedor.id}`);
  234 |     await expect(page.locator('.evento-historial')).toHaveCount(4);
  235 |     await expect(page.locator('.evento-historial h3')).toHaveText([
  236 |       'Proveedor reactivado',
  237 |       'Proveedor desactivado',
  238 |       'Proveedor modificado',
  239 |       'Proveedor creado',
  240 |     ]);
  241 |     await expect(page.locator('app-historial-timeline')).not.toContainText(
  242 |       proveedor.identificadorFiscal,
  243 |     );
  244 |     await page.getByRole('link', { name: 'Abrir historial completo' }).click();
  245 |     await expect(page.locator('.evento-historial')).toHaveCount(4);
  246 |     await page.goto(`/historial?tipoRecurso=PROVEEDOR&recursoId=${proveedor.id}`);
  247 |     await expect(page.locator('.evento-historial')).toHaveCount(4);
  248 |   });
  249 |   test('HA-E2E05: resumen corresponde a API por cuatro perfiles y conserva salud', async ({
  250 |     browser,
  251 |   }) => {
  252 |     for (const rol of ['SOLICITANTE', 'SUPERVISOR', 'AUDITOR', 'ADMINISTRADOR'] as RolDemo[]) {
  253 |       const contexto = await browser.newContext({ baseURL });
  254 |       try {
  255 |         const page = await contexto.newPage();
  256 |         await acceder(page, rol);
  257 |         const respuesta = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/resumen');
  258 |         await page.getByRole('link', { name: 'Inicio', exact: true }).click();
  259 |         const resumen = (await (await respuesta).json()) as ResumenInicio;
  260 |         await expect(page.locator('.total-resumen')).toContainText(
  261 |           `${resumen.solicitudes.total} solicitudes visibles`,
  262 |         );
  263 |         await expect(page.locator('.contadores dd')).toHaveText(
  264 |           ['BORRADOR', 'PRESENTADA', 'APROBADA', 'RECHAZADA'].map((k) =>
  265 |             String(resumen.solicitudes[k as keyof typeof resumen.solicitudes]),
  266 |           ),
  267 |         );
  268 |         await expect(page.locator('.tarjeta')).toContainText('Sistema disponible');
  269 |         await expect(page.locator('.pendientes-resumen a')).toHaveCount(
  270 |           rol === 'SOLICITANTE' || rol === 'SUPERVISOR' ? 1 : 0,
  271 |         );
  272 |       } finally {
  273 |         await contexto.close();
  274 |       }
  275 |     }
  276 |   });
  277 |   test('HA-E2E06: sin rol no hay global/proveedor y recurso ajeno equivale a inexistente', async ({
  278 |     page,
  279 |     browser,
  280 |   }) => {
  281 |     await acceder(page, 'SUPERVISOR');
  282 |     await expect(page.getByRole('link', { name: 'Historial', exact: true })).toHaveCount(0);
  283 |     for (const ruta of ['/historial', `/proveedores/${proveedor.id}/historial`]) {
  284 |       await page.goto(ruta);
  285 |       await expect(page).toHaveURL(/\/mi-cuenta$/);
  286 |     }
  287 |     let texto: string | null = null;
  288 |     for (const id of [borrador.id, randomUUID()]) {
  289 |       const respuesta = page.waitForResponse((r) =>
  290 |         r.url().includes(`/api/solicitudes/${id}/historial`),
  291 |       );
  292 |       await page.goto(`/solicitudes/${id}/historial`);
  293 |       expect((await respuesta).status()).toBe(404);
  294 |       await expect(page.getByRole('alert')).toContainText(
  295 |         'El recurso no existe o no está disponible para tu cuenta.',
  296 |       );
  297 |       const actual = await page.getByRole('alert').textContent();
  298 |       if (texto !== null) expect(actual).toBe(texto);
  299 |       texto = actual;
  300 |       await expect(page.locator('.evento-historial')).toHaveCount(0);
  301 |     }
  302 |     const correoAjeno = process.env['E2E_AJENO_CORREO'];
  303 |     if (!correoAjeno)
> 304 |       throw new Error('Falta fixture E2E_AJENO_CORREO para probar solicitudes de otro autor.');
      |             ^ Error: Falta fixture E2E_AJENO_CORREO para probar solicitudes de otro autor.
  305 |     const contexto = await browser.newContext({ baseURL });
  306 |     try {
  307 |       const ajeno = await contexto.newPage();
  308 |       await acceder(ajeno, 'SOLICITANTE', correoAjeno);
  309 |       const respuesta = ajeno.waitForResponse((r) =>
  310 |         r.url().includes(`/api/solicitudes/${aprobada.id}/historial`),
  311 |       );
  312 |       await ajeno.goto(`/solicitudes/${aprobada.id}/historial`);
  313 |       expect((await respuesta).status()).toBe(404);
  314 |       await expect(ajeno.getByRole('alert')).toContainText('no existe o no está disponible');
  315 |       await expect(ajeno.locator('.evento-historial')).toHaveCount(0);
  316 |     } finally {
  317 |       await contexto.close();
  318 |     }
  319 |   });
  320 |   test('HA-E2E07: historia anterior a V7 explícita y decisión previa conservada', async ({
  321 |     page,
  322 |   }) => {
  323 |     const id = process.env['E2E_HISTORIAL_ANTERIOR_ID'];
  324 |     if (!id || !/^[0-9a-f-]{36}$/i.test(id))
  325 |       throw new Error(
  326 |         'Falta fixture preV7 E2E_HISTORIAL_ANTERIOR_ID; no se sustituye por datos nuevos.',
  327 |       );
  328 |     await acceder(page, 'AUDITOR');
  329 |     await historial(page, id);
  330 |     await expect(page.locator('.limite-historia')).toContainText('Historia anterior desconocida');
  331 |     if (process.env['E2E_HISTORIAL_ANTERIOR_DECISION'] === 'true') {
  332 |       await expect(page.locator('.timeline')).toContainText('Decisión registrada');
  333 |     }
  334 |     await page.getByLabel('Acción', { exact: true }).selectOption('BORRADOR_CREADO');
  335 |     await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  336 |     await expect(page.locator('.historial-vacio')).toBeVisible();
  337 |     await expect(page.locator('.limite-historia')).toContainText('Historia anterior desconocida');
  338 |   });
  339 |   test('HA-E2E08: vacío e inválidos muestran recuperación sin inventar eventos', async ({
  340 |     page,
  341 |   }) => {
  342 |     await acceder(page, 'AUDITOR');
  343 |     await historial(page, aprobada.id);
  344 |     await page.getByLabel('Acción', { exact: true }).selectOption('RECHAZADA');
  345 |     await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  346 |     await expect(page.locator('.historial-vacio')).toHaveText(
  347 |       'No hay eventos registrados para esta consulta.',
  348 |     );
  349 |     await page.goto('/historial?size=101');
  350 |     await expect(page.getByRole('alert')).toContainText(
  351 |       'Los filtros de la dirección no son válidos',
  352 |     );
  353 |     await page.getByRole('button', { name: 'Restablecer filtros', exact: true }).click();
  354 |     await expect(page.locator('.estado-consulta')).toContainText('eventos encontrados');
  355 |     await expect(page.getByLabel('Eventos por página', { exact: true })).toHaveValue('20');
  356 |     await page.getByLabel('Acción', { exact: true }).selectOption('APROBADA');
  357 |     await page.getByLabel('Desde (ISO con zona)', { exact: true }).fill('2026-10-15T00:00:00Z');
  358 |     await page.getByLabel('Eventos por página', { exact: true }).selectOption('1');
  359 |     const restablecida = page.waitForResponse(
  360 |       (r) => new URL(r.url()).pathname === '/api/historial',
  361 |     );
  362 |     await page.getByRole('button', { name: 'Restablecer filtros', exact: true }).click();
  363 |     expect((await restablecida).status()).toBe(200);
  364 |     await expect(page.getByLabel('Acción', { exact: true })).toHaveValue('');
  365 |     await expect(page.getByLabel('Desde (ISO con zona)', { exact: true })).toHaveValue('');
  366 |     await expect(page.getByLabel('Eventos por página', { exact: true })).toHaveValue('20');
  367 |     await page.getByLabel('Desde (ISO con zona)', { exact: true }).fill('2026-02-30T12:00:00Z');
  368 |     await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  369 |     await expect(page.getByRole('alert')).toContainText('Revisa los UUID y las fechas');
  370 |   });
  371 |   test('HA-E2E09: fallo de red controlado y recuperación consulta PostgreSQL real', async ({
  372 |     page,
  373 |   }) => {
  374 |     await acceder(page, 'AUDITOR');
  375 |     await page.route('**/api/historial?*', (ruta) => ruta.abort('connectionfailed'));
  376 |     await page.goto('/historial');
  377 |     await expect(page.getByRole('alert')).toContainText('No se ha podido cargar el historial');
  378 |     await expect(page.locator('.evento-historial')).toHaveCount(0);
  379 |     await page.unroute('**/api/historial?*');
  380 |     const respuesta = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/historial');
  381 |     await page.getByRole('button', { name: 'Reintentar historial', exact: true }).click();
  382 |     const datos = (await (await respuesta).json()) as PaginaHistorial;
  383 |     expect(datos.elementos.length).toBeGreaterThan(0);
  384 |     await expect(page.locator('.evento-historial')).toHaveCount(datos.elementos.length);
  385 |   });
  386 |   test('HA-E2E10: teclado, foco, etiquetas y capturas360/768/1440', async ({ page }) => {
  387 |     await acceder(page, 'AUDITOR');
  388 |     const teclado: {
  389 |       anchoVentana: number;
  390 |       accionEnfocada: boolean;
  391 |       actorEnfocado: boolean;
  392 |       ancho: string;
  393 |       estilo: string;
  394 |     }[] = [];
  395 |     const muestras: {
  396 |       ancho: number;
  397 |       pantalla: string;
  398 |       resultados: Awaited<ReturnType<typeof contrastes>>;
  399 |     }[] = [];
  400 |     for (const ancho of [360, 768, 1440]) {
  401 |       await page.setViewportSize({ width: ancho, height: 900 });
  402 |       await historial(page, aprobada.id);
  403 |       await expect(
  404 |         page.getByRole('heading', { name: 'Historial registrado', exact: true }),
```