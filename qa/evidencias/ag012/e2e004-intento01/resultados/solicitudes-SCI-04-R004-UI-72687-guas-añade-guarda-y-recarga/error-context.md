# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: solicitudes.spec.ts >> SCI-04 / R004-UI01: carga posiciones no contiguas, añade, guarda y recarga
- Location: e2e\solicitudes.spec.ts:375:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 403
```

# Test source

```ts
  307 |       }
  308 |     });
  309 |     await test.step('12 SOLICITANTE ajeno no lista ni consulta la solicitud', async () => {
  310 |       const separado = await browser.newContext({ baseURL });
  311 |       try {
  312 |         const lector = await separado.newPage();
  313 |         await acceder(lector, 'SOLICITANTE', ajenoCorreo!);
  314 |         await lector.goto(`/solicitudes?numero=${encodeURIComponent(numero)}`);
  315 |         await expect(lector.getByRole('status')).toHaveText('0 solicitudes encontradas.');
  316 |         const respuesta = lector.waitForResponse(
  317 |           (r) => new URL(r.url()).pathname === `/api${ruta}` && r.request().method() === 'GET',
  318 |         );
  319 |         await lector.goto(ruta);
  320 |         expect((await respuesta).status()).toBe(404);
  321 |         await expect(lector.getByRole('alert')).toContainText('no existe o no está disponible');
  322 |         await expect(lector.getByRole('heading', { name: asunto, exact: true })).toHaveCount(0);
  323 |       } finally {
  324 |         await separado.close();
  325 |       }
  326 |     });
  327 |     await test.step('13 Responsive, teclado, rutas directas, filtros y recarga', async () => {
  328 |       for (const ancho of [360, 768, 1440]) await captura(page, 'detalle', ancho);
  329 |       await page.goto(`/solicitudes?numero=${encodeURIComponent(numero)}&estado=PRESENTADA&size=1`);
  330 |       await expect(page.getByRole('heading', { name: 'Solicitudes', exact: true })).toBeFocused();
  331 |       for (const ancho of [360, 768, 1440]) await captura(page, 'lista', ancho);
  332 |       const direccion = page.url();
  333 |       await page.reload();
  334 |       await expect(page).toHaveURL(direccion);
  335 |       await expect(page.getByLabel('Número exacto', { exact: true })).toHaveValue(numero);
  336 |       await expect(page.getByRole('link', { name: asunto, exact: true })).toBeVisible();
  337 |       await page.setViewportSize({ width: 360, height: 800 });
  338 |       await page.goto(`${ruta}/editar`);
  339 |       await expect(page.getByRole('alert')).toContainText('no es un borrador propio editable');
  340 |       await expect(page.getByRole('button', { name: 'Guardar borrador', exact: true })).toHaveCount(
  341 |         0,
  342 |       );
  343 |       await page.goto('/solicitudes/nueva');
  344 |       await expect(
  345 |         page.getByRole('heading', { name: 'Nueva solicitud', exact: true }),
  346 |       ).toBeFocused();
  347 |       await page.keyboard.press('Tab');
  348 |       await expect(page.getByLabel('Asunto *', { exact: true })).toBeFocused();
  349 |       await page.getByRole('button', { name: 'Crear borrador', exact: true }).focus();
  350 |       await page.keyboard.press('Enter');
  351 |       await expect(page.getByRole('alert')).toBeFocused();
  352 |       await expect(page.getByLabel('Asunto *', { exact: true })).toHaveAttribute(
  353 |         'aria-invalid',
  354 |         'true',
  355 |       );
  356 |       await captura(page, 'alta-error', 360);
  357 |       expect(
  358 |         await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0),
  359 |       ).toBe(true);
  360 |       expect(escrituras).toBeGreaterThanOrEqual(5);
  361 |       expect(escriturasSinProteccion).toBe(0);
  362 |       await page.emulateMedia({ reducedMotion: 'reduce' });
  363 |       expect(
  364 |         await page
  365 |           .getByRole('button', { name: 'Crear borrador', exact: true })
  366 |           .evaluate((boton) => getComputedStyle(boton).transitionDuration),
  367 |       ).toBe('0s');
  368 |     });
  369 |   } finally {
  370 |     await admin.api.dispose();
  371 |     await supervisor.api.dispose();
  372 |   }
  373 | });
  374 | 
  375 | test('SCI-04 / R004-UI01: carga posiciones no contiguas, añade, guarda y recarga', async ({
  376 |   page,
  377 | }) => {
  378 |   const sesion = await sesionApi('SOLICITANTE');
  379 |   try {
  380 |     const asunto = `Posiciones ficticias ${randomUUID()}`;
  381 |     const alta = await sesion.api.post('/api/solicitudes', {
  382 |       headers: sesion.headers,
  383 |       data: { asunto },
  384 |     });
  385 |     expect(alta.status()).toBe(201);
  386 |     const solicitud = (await alta.json()) as { id: string; version: number };
  387 |     const ruta = `/solicitudes/${solicitud.id}`;
  388 |     const entrada = {
  389 |       asunto,
  390 |       descripcion: null,
  391 |       proveedorId: null,
  392 |       supervisorId: null,
  393 |       version: solicitud.version,
  394 |       conceptos: [1, 3].map((posicion) => ({
  395 |         id: null,
  396 |         descripcion: `Línea ficticia ${posicion}`,
  397 |         cantidad: '1',
  398 |         unidad: 'UNIDAD',
  399 |         precioUnitario: '0.01',
  400 |         posicion,
  401 |       })),
  402 |     };
  403 |     const guardada = await sesion.api.put(`/api${ruta}`, {
  404 |       headers: sesion.headers,
  405 |       data: entrada,
  406 |     });
> 407 |     expect(guardada.status()).toBe(200);
      |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  408 |     const originales = (
  409 |       (await guardada.json()) as { conceptos: { id: string; posicion: number }[] }
  410 |     ).conceptos;
  411 |     expect(originales.map((linea) => linea.posicion)).toEqual([1, 3]);
  412 |     await acceder(page, 'SOLICITANTE');
  413 |     await page.goto(`${ruta}/editar`);
  414 |     await expect(page.getByRole('heading', { name: 'Editar borrador', exact: true })).toBeFocused();
  415 |     await concepto(page, 3, 'Nueva línea ficticia', '1', '0.01');
  416 |     await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  417 |     await expect(page).toHaveURL((url) => url.pathname === ruta);
  418 |     await expect(page.locator('.importe-total')).toHaveText('0,03 €');
  419 |     await page.reload();
  420 |     await expect(page.locator('.importe-total')).toHaveText('0,03 €');
  421 |     const respuesta = await sesion.api.get(`/api${ruta}`, { headers: sesion.headers });
  422 |     expect(respuesta.status()).toBe(200);
  423 |     const persistidas = (
  424 |       (await respuesta.json()) as { conceptos: { id: string; posicion: number }[] }
  425 |     ).conceptos;
  426 |     expect(persistidas.map((linea) => linea.posicion)).toEqual([1, 2, 3]);
  427 |     expect(persistidas.slice(0, 2).map((linea) => linea.id)).toEqual(
  428 |       originales.map((linea) => linea.id),
  429 |     );
  430 |     expect(new Set(persistidas.map((linea) => linea.id)).size).toBe(3);
  431 |   } finally {
  432 |     await sesion.api.dispose();
  433 |   }
  434 | });
  435 | 
```