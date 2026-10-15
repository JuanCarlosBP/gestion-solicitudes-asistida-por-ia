# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: historial.spec.ts >> 007: diez recorridos de historial y resumen >> HA-E2E10: teclado, foco, etiquetas y capturas360/768/1440
- Location: e2e\historial.spec.ts:374:7

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator: getByLabel('Acción', { exact: true })
Expected: focused
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeFocused" getByLabel('Acción', { exact: true }) with timeout 5000ms
  - waiting for getByLabel('Acción', { exact: true })

```

```yaml
- link "Saltar al contenido":
  - /url: "#contenido"
- banner:
  - link "Gestión de Solicitudes, inicio":
    - /url: /inicio
    - text: Gestión de Solicitudes
  - navigation "Navegación principal":
    - link "Inicio":
      - /url: /inicio
    - link "Solicitudes":
      - /url: /solicitudes
    - link "Proveedores":
      - /url: /proveedores
    - link "Historial":
      - /url: /historial
    - link "Mi cuenta":
      - /url: /mi-cuenta
- main:
  - link "Volver al detalle":
    - /url: /solicitudes/2b8dca20-0ad3-42d0-89da-4314a7523f20
  - heading "Historial de solicitud" [level=1]
  - paragraph: Consulta los hechos registrados y las personas que los realizaron.
  - region "Historial registrado":
    - paragraph: TRAZABILIDAD
    - heading "Historial registrado" [level=2]
    - paragraph: Más recientes primero · Fechas mostradas en Europe/Madrid.
    - form "Filtros del historial":
      - text: Acción
      - combobox "Acción":
        - option "Todas" [selected]
        - option "Proveedor creado"
        - option "Proveedor modificado"
        - option "Proveedor desactivado"
        - option "Proveedor reactivado"
        - option "Borrador creado"
        - option "Borrador guardado"
        - option "Solicitud presentada"
        - option "Solicitud aprobada"
        - option "Solicitud rechazada"
      - text: Actor (UUID)
      - textbox "Actor (UUID)"
      - text: Desde (ISO con zona)
      - textbox "Desde (ISO con zona)":
        - /placeholder: 2026-10-15T00:00:00+02:00
      - text: Hasta (ISO con zona)
      - textbox "Hasta (ISO con zona)":
        - /placeholder: 2026-10-15T23:59:59+02:00
      - text: Eventos por página
      - combobox "Eventos por página":
        - option "1" [selected]
        - option "10"
        - option "20"
        - option "50"
        - option "100"
      - paragraph: Fechas inclusivas. Indica Z para UTC o el desfase, por ejemplo +02:00.
      - button "Aplicar filtros"
      - button "Restablecer filtros"
    - status: 4 eventos encontrados
    - list "Eventos del historial":
      - listitem:
        - heading "Solicitud aprobada" [level=3]
        - time: 15/10/2026 21:51:36
        - paragraph: Supervisor de demostración
        - paragraph: Solicitud aprobada
        - text: PRESENTADA → APROBADA Versión 2 → 3
        - paragraph: Decisión registrada
      - listitem:
        - heading "Solicitud presentada" [level=3]
        - time: 15/10/2026 21:51:36
        - paragraph: Solicitante de demostración
        - paragraph: Solicitud presentada
        - text: BORRADOR → PRESENTADA Versión 1 → 2
        - paragraph: Evento de negocio
      - listitem:
        - heading "Borrador guardado" [level=3]
        - time: 15/10/2026 21:51:36
        - paragraph: Solicitante de demostración
        - paragraph: Borrador guardado
        - text: BORRADOR → BORRADOR Versión 0 → 1
        - paragraph: Evento de negocio
      - listitem:
        - heading "Borrador creado" [level=3]
        - time: 15/10/2026 21:51:36
        - paragraph: Solicitante de demostración
        - paragraph: Borrador creado
        - text: Sin estado anterior → BORRADOR Versión — → 0
        - paragraph: Evento de negocio
    - navigation "Paginación del historial":
      - button "Página anterior de eventos" [disabled]
      - text: Página 1 de 1
      - button "Siguiente página de eventos" [disabled]
    - paragraph: Si se registran eventos nuevos durante la consulta, las páginas pueden desplazarse. Recarga para actualizar.
    - button "Actualizar historial"
- contentinfo: Gestión de Solicitudes · Espacio de trabajo
```

# Test source

```ts
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
  304 |       throw new Error('Falta fixture E2E_AJENO_CORREO para probar solicitudes de otro autor.');
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
  355 |     await page.getByLabel('Desde (ISO con zona)', { exact: true }).fill('2026-02-30T12:00:00Z');
  356 |     await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  357 |     await expect(page.getByRole('alert')).toContainText('Revisa los UUID y las fechas');
  358 |   });
  359 |   test('HA-E2E09: fallo de red controlado y recuperación consulta PostgreSQL real', async ({
  360 |     page,
  361 |   }) => {
  362 |     await acceder(page, 'AUDITOR');
  363 |     await page.route('**/api/historial?*', (ruta) => ruta.abort('connectionfailed'));
  364 |     await page.goto('/historial');
  365 |     await expect(page.getByRole('alert')).toContainText('No se ha podido cargar el historial');
  366 |     await expect(page.locator('.evento-historial')).toHaveCount(0);
  367 |     await page.unroute('**/api/historial?*');
  368 |     const respuesta = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/historial');
  369 |     await page.getByRole('button', { name: 'Reintentar historial', exact: true }).click();
  370 |     const datos = (await (await respuesta).json()) as PaginaHistorial;
  371 |     expect(datos.elementos.length).toBeGreaterThan(0);
  372 |     await expect(page.locator('.evento-historial')).toHaveCount(datos.elementos.length);
  373 |   });
  374 |   test('HA-E2E10: teclado, foco, etiquetas y capturas360/768/1440', async ({ page }) => {
  375 |     await acceder(page, 'AUDITOR');
  376 |     const muestras: {
  377 |       ancho: number;
  378 |       pantalla: string;
  379 |       resultados: Awaited<ReturnType<typeof contrastes>>;
  380 |     }[] = [];
  381 |     for (const ancho of [360, 768, 1440]) {
  382 |       await page.setViewportSize({ width: ancho, height: 900 });
  383 |       await historial(page, aprobada.id);
  384 |       await expect(
  385 |         page.getByRole('heading', { name: 'Historial registrado', exact: true }),
  386 |       ).toBeFocused();
  387 |       await page.keyboard.press('Tab');
> 388 |       await expect(page.getByLabel('Acción', { exact: true })).toBeFocused();
      |                                                                ^ Error: expect(locator).toBeFocused() failed
  389 |       await page.keyboard.press('Tab');
  390 |       await expect(page.getByLabel('Actor (UUID)', { exact: true })).toBeFocused();
  391 |       const foco = await page.getByLabel('Actor (UUID)', { exact: true }).evaluate((el) => ({
  392 |         ancho: getComputedStyle(el).outlineWidth,
  393 |         estilo: getComputedStyle(el).outlineStyle,
  394 |       }));
  395 |       expect(foco).toEqual({ ancho: '3px', estilo: 'solid' });
  396 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
  397 |         true,
  398 |       );
  399 |       muestras.push({
  400 |         ancho,
  401 |         pantalla: 'timeline',
  402 |         resultados: await contrastes(page, [
  403 |           '.historial-panel h2',
  404 |           '.historial-panel .ayuda',
  405 |           '.historial-panel label',
  406 |           '.evento-historial .actor',
  407 |           '.transicion span',
  408 |           '.acciones-historial button[type=submit]',
  409 |           '.acciones-historial button.secundario',
  410 |         ]),
  411 |       });
  412 |       await page.screenshot({
  413 |         path: join(
  414 |           process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  415 |           `frontend007-timeline-${ancho}.png`,
  416 |         ),
  417 |         fullPage: true,
  418 |       });
  419 |       await page.goto(`/historial?tipoRecurso=SOLICITUD&recursoId=${aprobada.id}`);
  420 |       await expect(page.locator('.evento-historial')).toHaveCount(4);
  421 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
  422 |         true,
  423 |       );
  424 |       await page.screenshot({
  425 |         path: join(
  426 |           process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  427 |           `frontend007-global-${ancho}.png`,
  428 |         ),
  429 |         fullPage: true,
  430 |       });
  431 |       muestras.push({
  432 |         ancho,
  433 |         pantalla: 'global',
  434 |         resultados: await contrastes(page, ['.limite-historia']),
  435 |       });
  436 |       await historial(page, proveedor.id, 'proveedores');
  437 |       await expect(page.locator('.evento-historial')).toHaveCount(4);
  438 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
  439 |         true,
  440 |       );
  441 |       await page.screenshot({
  442 |         path: join(
  443 |           process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  444 |           `frontend007-proveedor-${ancho}.png`,
  445 |         ),
  446 |         fullPage: true,
  447 |       });
  448 |       await page.goto('/inicio');
  449 |       await expect(page.locator('.total-resumen')).toBeVisible();
  450 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
  451 |         true,
  452 |       );
  453 |       await page.screenshot({
  454 |         path: join(
  455 |           process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  456 |           `frontend007-resumen-${ancho}.png`,
  457 |         ),
  458 |         fullPage: true,
  459 |       });
  460 |       muestras.push({
  461 |         ancho,
  462 |         pantalla: 'resumen',
  463 |         resultados: await contrastes(page, [
  464 |           '.resumen-inicio h2',
  465 |           '.resumen-inicio .detalle',
  466 |           '.contadores dt',
  467 |           '.contadores dd',
  468 |         ]),
  469 |       });
  470 |     }
  471 |     await writeFile(
  472 |       join(process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results', 'frontend007-contrastes.json'),
  473 |       JSON.stringify(
  474 |         {
  475 |           criterio:
  476 |             'Texto normal >=4.5:1 sobre fondo computado; muestra acotada, no auditoría WCAG completa.',
  477 |           muestras,
  478 |         },
  479 |         null,
  480 |         2,
  481 |       ),
  482 |     );
  483 |   });
  484 | });
  485 | 
```