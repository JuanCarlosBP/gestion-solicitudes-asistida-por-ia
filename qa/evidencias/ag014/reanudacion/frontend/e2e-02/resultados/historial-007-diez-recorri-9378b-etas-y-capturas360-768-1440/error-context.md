# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: historial.spec.ts >> 007: diez recorridos de historial y resumen >> HA-E2E10: teclado, foco, etiquetas y capturas360/768/1440
- Location: e2e\historial.spec.ts:386:7

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 2
+ Received  + 2

  Object {
-   "ancho": "3px",
-   "estilo": "solid",
+   "ancho": "1px",
+   "estilo": "auto",
  }
```

# Test source

```ts
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
  388 |     const muestras: {
  389 |       ancho: number;
  390 |       pantalla: string;
  391 |       resultados: Awaited<ReturnType<typeof contrastes>>;
  392 |     }[] = [];
  393 |     for (const ancho of [360, 768, 1440]) {
  394 |       await page.setViewportSize({ width: ancho, height: 900 });
  395 |       await historial(page, aprobada.id);
  396 |       await expect(
  397 |         page.getByRole('heading', { name: 'Historial registrado', exact: true }),
  398 |       ).toBeFocused();
  399 |       await page.keyboard.press('Tab');
  400 |       await expect(page.getByLabel('Acción', { exact: true })).toBeFocused();
  401 |       await page.keyboard.press('Tab');
  402 |       await expect(page.getByLabel('Actor (UUID)', { exact: true })).toBeFocused();
  403 |       const foco = await page.getByLabel('Actor (UUID)', { exact: true }).evaluate((el) => ({
  404 |         ancho: getComputedStyle(el).outlineWidth,
  405 |         estilo: getComputedStyle(el).outlineStyle,
  406 |       }));
> 407 |       expect(foco).toEqual({ ancho: '3px', estilo: 'solid' });
      |                    ^ Error: expect(received).toEqual(expected) // deep equality
  408 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
  409 |         true,
  410 |       );
  411 |       muestras.push({
  412 |         ancho,
  413 |         pantalla: 'timeline',
  414 |         resultados: await contrastes(page, [
  415 |           '.historial-panel h2',
  416 |           '.historial-panel .ayuda',
  417 |           '.historial-panel label',
  418 |           '.evento-historial .actor',
  419 |           '.transicion span',
  420 |           '.acciones-historial button[type=submit]',
  421 |           '.acciones-historial button.secundario',
  422 |         ]),
  423 |       });
  424 |       await page.screenshot({
  425 |         path: join(
  426 |           process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  427 |           `frontend007-timeline-${ancho}.png`,
  428 |         ),
  429 |         fullPage: true,
  430 |       });
  431 |       await page.goto(`/historial?tipoRecurso=SOLICITUD&recursoId=${aprobada.id}`);
  432 |       await expect(page.locator('.evento-historial')).toHaveCount(4);
  433 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
  434 |         true,
  435 |       );
  436 |       await page.screenshot({
  437 |         path: join(
  438 |           process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  439 |           `frontend007-global-${ancho}.png`,
  440 |         ),
  441 |         fullPage: true,
  442 |       });
  443 |       muestras.push({
  444 |         ancho,
  445 |         pantalla: 'global',
  446 |         resultados: await contrastes(page, ['.limite-historia']),
  447 |       });
  448 |       await historial(page, proveedor.id, 'proveedores');
  449 |       await expect(page.locator('.evento-historial')).toHaveCount(4);
  450 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
  451 |         true,
  452 |       );
  453 |       await page.screenshot({
  454 |         path: join(
  455 |           process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  456 |           `frontend007-proveedor-${ancho}.png`,
  457 |         ),
  458 |         fullPage: true,
  459 |       });
  460 |       await page.goto('/inicio');
  461 |       await expect(page.locator('.total-resumen')).toBeVisible();
  462 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
  463 |         true,
  464 |       );
  465 |       await page.screenshot({
  466 |         path: join(
  467 |           process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  468 |           `frontend007-resumen-${ancho}.png`,
  469 |         ),
  470 |         fullPage: true,
  471 |       });
  472 |       muestras.push({
  473 |         ancho,
  474 |         pantalla: 'resumen',
  475 |         resultados: await contrastes(page, [
  476 |           '.resumen-inicio h2',
  477 |           '.resumen-inicio .detalle',
  478 |           '.contadores dt',
  479 |           '.contadores dd',
  480 |         ]),
  481 |       });
  482 |     }
  483 |     await writeFile(
  484 |       join(process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results', 'frontend007-contrastes.json'),
  485 |       JSON.stringify(
  486 |         {
  487 |           criterio:
  488 |             'Texto normal >=4.5:1 sobre fondo computado; muestra acotada, no auditoría WCAG completa.',
  489 |           muestras,
  490 |         },
  491 |         null,
  492 |         2,
  493 |       ),
  494 |     );
  495 |   });
  496 | });
  497 | 
```