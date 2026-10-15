# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: operaciones.spec.ts >> CI-07/09: bloqueo PostgreSQL real produce progreso acotado en segunda pestaña
- Location: e2e\operaciones.spec.ts:471:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "EN_PROGRESO"
Received: ""

Call Log:
- Timeout 2000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - link "Saltar al contenido" [ref=f1e3] [cursor=pointer]:
    - /url: "#contenido"
  - banner [ref=f1e4]:
    - link "Gestión de Solicitudes, inicio" [ref=f1e5] [cursor=pointer]:
      - /url: /inicio
      - generic [aria-hidden] [ref=f1e6]: GS
      - generic [ref=f1e7]: Gestión de Solicitudes
    - navigation "Navegación principal" [ref=f1e8]:
      - link "Inicio" [ref=f1e9] [cursor=pointer]:
        - /url: /inicio
      - link "Solicitudes" [ref=f1e10] [cursor=pointer]:
        - /url: /solicitudes
      - link "Proveedores" [ref=f1e11] [cursor=pointer]:
        - /url: /proveedores
      - link "Mi cuenta" [ref=f1e12] [cursor=pointer]:
        - /url: /mi-cuenta
    - generic [ref=f1e13]: Entorno local
  - main [ref=f1e14]:
    - region "Operaciones seguras" [ref=f1e16]:
      - article [ref=f1e17]:
        - generic [ref=f1e18]:
          - strong [ref=f1e19]: Desactivación de proveedor
          - status [ref=f1e20]: No se puede consultar o ejecutar con los permisos actuales. El resultado no se muestra.
        - generic [ref=f1e21]:
          - 'button "Consultar resultado: Desactivación de proveedor" [ref=f1e22] [cursor=pointer]': Consultar resultado
          - link "Volver a la operación" [ref=f1e23] [cursor=pointer]:
            - /url: /proveedores/7a668cc4-f6ec-4778-928e-c4f0ff5b0677
    - region [ref=f1e25]:
      - link "Volver a proveedores" [ref=f1e26] [cursor=pointer]:
        - /url: /proveedores
      - heading "Progreso006 3c7afde6-64e5-4e5d-8e5c-5b9e32b759c0" [level=1] [ref=f1e27]
      - alert [active] [ref=f1e28]: Tu cuenta no tiene permiso para esta operación.
      - button "Recargar datos" [ref=f1e29] [cursor=pointer]
      - status
      - generic [ref=f1e30]:
        - paragraph [ref=f1e31]: Activo
        - generic [ref=f1e32]:
          - term [ref=f1e33]: Tipo
          - definition [ref=f1e34]: Profesional
          - term [ref=f1e35]: País fiscal
          - definition [ref=f1e36]: ES
          - term [ref=f1e37]: Identificador fiscal
          - definition [ref=f1e38]: FICTICIO-e38c90f6-4d0c-445c-8d27-562ad392ea98
          - term [ref=f1e39]: Correo de contacto
          - definition [ref=f1e40]: Sin indicar
          - term [ref=f1e41]: Teléfono de contacto
          - definition [ref=f1e42]: Sin indicar
          - term [ref=f1e43]: Creación
          - definition [ref=f1e44]: 15/10/2026 12:56
          - term [ref=f1e45]: Última actualización
          - definition [ref=f1e46]: 15/10/2026 12:56
        - generic [ref=f1e47]:
          - link "Editar proveedor" [ref=f1e48] [cursor=pointer]:
            - /url: /proveedores/7a668cc4-f6ec-4778-928e-c4f0ff5b0677/editar
          - button "Desactivar proveedor" [ref=f1e49] [cursor=pointer]
  - contentinfo [ref=f1e50]: Gestión de Solicitudes · Espacio de trabajo
```

# Test source

```ts
  453 |         try {
  454 |           return (await page.request.get('/api/salud', { timeout: 3000 })).status();
  455 |         } catch {
  456 |           return 0;
  457 |         }
  458 |       },
  459 |       { timeout: 60000, intervals: [250, 500, 1000] },
  460 |     )
  461 |     .toBe(200);
  462 |   expect(await descriptores(page)).toEqual(anterior);
  463 |   await page.reload();
  464 |   await expect(panel(page).getByRole('status')).toContainText('Resultado recuperado');
  465 |   expect(await descriptores(page)).toEqual([]);
  466 |   await panel(page).getByRole('link', { name: 'Abrir resultado', exact: true }).click();
  467 |   await expect(page).toHaveURL(new RegExp(`/solicitudes/${original.id}$`));
  468 |   await expect(page.getByRole('heading', { name: original.asunto, exact: true })).toBeVisible();
  469 | });
  470 | 
  471 | test('CI-07/09: bloqueo PostgreSQL real produce progreso acotado en segunda pestaña', async ({
  472 |   page,
  473 |   context,
  474 | }) => {
  475 |   test.setTimeout(120000);
  476 |   const admin = await sesionApi('ADMINISTRADOR');
  477 |   let bloqueo: Promise<string> | undefined;
  478 |   const aplicacion = `e2e006_${randomUUID().replaceAll('-', '')}`;
  479 |   const bloqueoListo = senal();
  480 |   try {
  481 |     const alta = await admin.api.post('/api/proveedores', {
  482 |       headers: await escritura(admin.api, admin.headers),
  483 |       data: {
  484 |         tipo: 'PROFESIONAL',
  485 |         denominacion: `Progreso006 ${randomUUID()}`,
  486 |         paisFiscal: 'ES',
  487 |         identificadorFiscal: `FICTICIO-${randomUUID()}`,
  488 |         correoContacto: null,
  489 |         telefonoContacto: null,
  490 |       },
  491 |     });
  492 |     expect(alta.status()).toBe(201);
  493 |     const proveedor = (await alta.json()) as Proveedor;
  494 |     await acceder(page, 'ADMINISTRADOR');
  495 |     await page.goto(`/proveedores/${proveedor.id}`);
  496 |     const segunda = await context.newPage();
  497 |     await segunda.goto(`/proveedores/${proveedor.id}`);
  498 |     await expect(
  499 |       segunda.getByRole('button', { name: 'Desactivar proveedor', exact: true }),
  500 |     ).toBeVisible();
  501 |     await page.route(
  502 |       `**/api/proveedores/${proveedor.id}/desactivar`,
  503 |       async (ruta) => {
  504 |         const clave = uuidFixture(ruta.request().headers()['idempotency-key']);
  505 |         const advisory = createHash('sha256')
  506 |           .update(`${admin.usuarioId}:${clave}`)
  507 |           .digest()
  508 |           .readBigInt64BE()
  509 |           .toString();
  510 |         bloqueo = sqlFixture(
  511 |           `BEGIN; SET LOCAL application_name='${aplicacion}'; SELECT pg_advisory_xact_lock(${advisory}); SELECT pg_sleep(6); COMMIT;`,
  512 |         );
  513 |         await expect
  514 |           .poll(
  515 |             () =>
  516 |               sqlFixture(
  517 |                 `SELECT count(*) FROM pg_stat_activity WHERE application_name='${aplicacion}' AND wait_event='PgSleep'`,
  518 |               ),
  519 |             { timeout: 3000, intervals: [50, 100] },
  520 |           )
  521 |           .toBe('1');
  522 |         await ruta.continue();
  523 |         bloqueoListo.resolver();
  524 |       },
  525 |       { times: 1 },
  526 |     );
  527 |     const primeraPeticion = page.waitForRequest(
  528 |       (peticion) =>
  529 |         peticion.method() === 'POST' &&
  530 |         peticion.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  531 |     );
  532 |     const primeraRespuesta = page.waitForResponse(
  533 |       (respuesta) =>
  534 |         respuesta.request().method() === 'POST' &&
  535 |         respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  536 |     );
  537 |     await page.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
  538 |     const primera = await primeraPeticion;
  539 |     await bloqueoListo.promesa;
  540 |     const clave = primera.headers()['idempotency-key'];
  541 |     await expect
  542 |       .poll(
  543 |         async () => {
  544 |           const consulta = await admin.api.get(`/api/operaciones-idempotentes/${clave}`, {
  545 |             headers: admin.headers,
  546 |           });
  547 |           return consulta.status() === 200
  548 |             ? ((await consulta.json()) as { estado: string }).estado
  549 |             : '';
  550 |         },
  551 |         { timeout: 2000, intervals: [50, 100] },
  552 |       )
> 553 |       .toBe('EN_PROGRESO');
      |        ^ Error: expect(received).toBe(expected) // Object.is equality
  554 |     await expect(
  555 |       panel(segunda).getByRole('button', {
  556 |         name: 'Consultar resultado: Desactivación de proveedor',
  557 |         exact: true,
  558 |       }),
  559 |     ).toBeVisible();
  560 |     await panel(segunda)
  561 |       .getByRole('button', { name: 'Consultar resultado: Desactivación de proveedor', exact: true })
  562 |       .click();
  563 |     await expect(panel(segunda).getByRole('status')).toContainText('Operación pendiente.');
  564 |     const inicio = performance.now();
  565 |     const segundaRespuesta = segunda.waitForResponse(
  566 |       (respuesta) =>
  567 |         respuesta.request().method() === 'POST' &&
  568 |         respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  569 |     );
  570 |     await segunda.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
  571 |     const respuesta = await segundaRespuesta;
  572 |     const observadoMs = Math.round(performance.now() - inicio);
  573 |     expect(respuesta.request().headers()['idempotency-key']).toBe(
  574 |       primera.headers()['idempotency-key'],
  575 |     );
  576 |     expect(respuesta.status()).toBe(409);
  577 |     expect(respuesta.headers()['retry-after']).toBe('1');
  578 |     expect(await respuesta.json()).toEqual({ error: 'OPERACION_EN_PROGRESO' });
  579 |     await expect(panel(segunda).locator('[data-estado=PENDIENTE]')).toHaveCount(1);
  580 |     await test.info().attach('espera-observada', {
  581 |       body: JSON.stringify({
  582 |         escenario: 'duplicado con advisory lock PostgreSQL de6s',
  583 |         observadoMs,
  584 |         resultado: 409,
  585 |       }),
  586 |       contentType: 'application/json',
  587 |     });
  588 |     expect((await primeraRespuesta).status()).toBe(409);
  589 |     await bloqueo;
  590 |     const reintento = page.waitForResponse(
  591 |       (respuesta) =>
  592 |         respuesta.request().method() === 'POST' &&
  593 |         respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  594 |     );
  595 |     await page.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
  596 |     const reintentada = await reintento;
  597 |     expect(reintentada.status()).toBe(200);
  598 |     expect(reintentada.request().headers()['idempotency-key']).toBe(clave);
  599 |     await expect(panel(segunda).getByRole('status')).toContainText('Resultado recuperado');
  600 |     const final = await admin.api.get(`/api/proveedores/${proveedor.id}`, {
  601 |       headers: admin.headers,
  602 |     });
  603 |     expect(await final.json()).toMatchObject({ version: proveedor.version + 1, activo: false });
  604 |     expect(await descriptores(segunda)).toEqual([]);
  605 |     await captura(segunda, 'progreso-recuperado');
  606 |     await segunda.close();
  607 |   } finally {
  608 |     if (bloqueo) await bloqueo;
  609 |     await admin.api.dispose();
  610 |   }
  611 | });
  612 | 
```