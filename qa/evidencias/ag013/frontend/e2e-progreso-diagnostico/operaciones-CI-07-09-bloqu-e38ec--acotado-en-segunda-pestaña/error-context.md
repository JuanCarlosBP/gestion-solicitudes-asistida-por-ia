# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: operaciones.spec.ts >> CI-07/09: bloqueo PostgreSQL real produce progreso acotado en segunda pestaña
- Location: e2e\operaciones.spec.ts:472:5

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
            - /url: /proveedores/0d89247b-4a99-4d60-85d9-e545ccd263e3
    - region [ref=f1e25]:
      - link "Volver a proveedores" [ref=f1e26] [cursor=pointer]:
        - /url: /proveedores
      - heading "Progreso006 c6a99673-c757-4994-9fd2-b457f2fee2b6" [level=1] [ref=f1e27]
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
          - definition [ref=f1e38]: FICTICIO-8dab5d2f-37b1-42eb-bbe1-7abee958505d
          - term [ref=f1e39]: Correo de contacto
          - definition [ref=f1e40]: Sin indicar
          - term [ref=f1e41]: Teléfono de contacto
          - definition [ref=f1e42]: Sin indicar
          - term [ref=f1e43]: Creación
          - definition [ref=f1e44]: 15/10/2026 12:57
          - term [ref=f1e45]: Última actualización
          - definition [ref=f1e46]: 15/10/2026 12:57
        - generic [ref=f1e47]:
          - link "Editar proveedor" [ref=f1e48] [cursor=pointer]:
            - /url: /proveedores/0d89247b-4a99-4d60-85d9-e545ccd263e3/editar
          - button "Desactivar proveedor" [ref=f1e49] [cursor=pointer]
  - contentinfo [ref=f1e50]: Gestión de Solicitudes · Espacio de trabajo
```

# Test source

```ts
  472 | test('CI-07/09: bloqueo PostgreSQL real produce progreso acotado en segunda pestaña', async ({
  473 |   page,
  474 |   context,
  475 | }) => {
  476 |   test.setTimeout(120000);
  477 |   const admin = await sesionApi('ADMINISTRADOR');
  478 |   let bloqueo: Promise<string> | undefined;
  479 |   const aplicacion = `e2e006_${randomUUID().replaceAll('-', '')}`;
  480 |   const bloqueoListo = senal();
  481 |   const diagnostico: unknown[] = [];
  482 |   try {
  483 |     const alta = await admin.api.post('/api/proveedores', {
  484 |       headers: await escritura(admin.api, admin.headers),
  485 |       data: {
  486 |         tipo: 'PROFESIONAL',
  487 |         denominacion: `Progreso006 ${randomUUID()}`,
  488 |         paisFiscal: 'ES',
  489 |         identificadorFiscal: `FICTICIO-${randomUUID()}`,
  490 |         correoContacto: null,
  491 |         telefonoContacto: null,
  492 |       },
  493 |     });
  494 |     expect(alta.status()).toBe(201);
  495 |     const proveedor = (await alta.json()) as Proveedor;
  496 |     page.on('response', async (respuesta) => {
  497 |       if (respuesta.url().endsWith(`/api/proveedores/${proveedor.id}/desactivar`))
  498 |         diagnostico.push({ paso: 'post', status: respuesta.status(), codigo: ((await respuesta.json()) as { error?: string }).error });
  499 |     });
  500 |     await acceder(page, 'ADMINISTRADOR');
  501 |     await page.goto(`/proveedores/${proveedor.id}`);
  502 |     const segunda = await context.newPage();
  503 |     await segunda.goto(`/proveedores/${proveedor.id}`);
  504 |     await expect(
  505 |       segunda.getByRole('button', { name: 'Desactivar proveedor', exact: true }),
  506 |     ).toBeVisible();
  507 |     await page.route(
  508 |       `**/api/proveedores/${proveedor.id}/desactivar`,
  509 |       async (ruta) => {
  510 |         const clave = uuidFixture(ruta.request().headers()['idempotency-key']);
  511 |         diagnostico.push({
  512 |           paso: 'antes-bloqueo',
  513 |           csrfCoincide: ruta.request().headers()['x-xsrf-token'] === (await csrf(page.request)),
  514 |         });
  515 |         const advisory = createHash('sha256')
  516 |           .update(`${admin.usuarioId}:${clave}`)
  517 |           .digest()
  518 |           .readBigInt64BE()
  519 |           .toString();
  520 |         bloqueo = sqlFixture(
  521 |           `BEGIN; SET LOCAL application_name='${aplicacion}'; SELECT pg_advisory_xact_lock(${advisory}); SELECT pg_sleep(6); COMMIT;`,
  522 |         );
  523 |         await expect
  524 |           .poll(
  525 |             () =>
  526 |               sqlFixture(
  527 |                 `SELECT count(*) FROM pg_stat_activity WHERE application_name='${aplicacion}' AND wait_event='PgSleep'`,
  528 |               ),
  529 |             { timeout: 3000, intervals: [50, 100] },
  530 |           )
  531 |           .toBe('1');
  532 |         diagnostico.push({
  533 |           paso: 'despues-bloqueo',
  534 |           csrfCoincide: ruta.request().headers()['x-xsrf-token'] === (await csrf(page.request)),
  535 |         });
  536 |         await ruta.continue();
  537 |         bloqueoListo.resolver();
  538 |       },
  539 |       { times: 1 },
  540 |     );
  541 |     const primeraPeticion = page.waitForRequest(
  542 |       (peticion) =>
  543 |         peticion.method() === 'POST' &&
  544 |         peticion.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  545 |     );
  546 |     const primeraRespuesta = page.waitForResponse(
  547 |       (respuesta) =>
  548 |         respuesta.request().method() === 'POST' &&
  549 |         respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  550 |     );
  551 |     await page.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
  552 |     const primera = await primeraPeticion;
  553 |     await bloqueoListo.promesa;
  554 |     const clave = primera.headers()['idempotency-key'];
  555 |     await expect
  556 |       .poll(
  557 |         async () => {
  558 |           const consulta = await admin.api.get(`/api/operaciones-idempotentes/${clave}`, {
  559 |             headers: admin.headers,
  560 |           });
  561 |           diagnostico.push({
  562 |             paso: 'consulta',
  563 |             status: consulta.status(),
  564 |             codigo: ((await consulta.json()) as { error?: string }).error,
  565 |           });
  566 |           return consulta.status() === 200
  567 |             ? ((await consulta.json()) as { estado: string }).estado
  568 |             : '';
  569 |         },
  570 |         { timeout: 2000, intervals: [50, 100] },
  571 |       )
> 572 |       .toBe('EN_PROGRESO');
      |        ^ Error: expect(received).toBe(expected) // Object.is equality
  573 |     await expect(
  574 |       panel(segunda).getByRole('button', {
  575 |         name: 'Consultar resultado: Desactivación de proveedor',
  576 |         exact: true,
  577 |       }),
  578 |     ).toBeVisible();
  579 |     await panel(segunda)
  580 |       .getByRole('button', { name: 'Consultar resultado: Desactivación de proveedor', exact: true })
  581 |       .click();
  582 |     await expect(panel(segunda).getByRole('status')).toContainText('Operación pendiente.');
  583 |     const inicio = performance.now();
  584 |     const segundaRespuesta = segunda.waitForResponse(
  585 |       (respuesta) =>
  586 |         respuesta.request().method() === 'POST' &&
  587 |         respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  588 |     );
  589 |     await segunda.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
  590 |     const respuesta = await segundaRespuesta;
  591 |     const observadoMs = Math.round(performance.now() - inicio);
  592 |     expect(respuesta.request().headers()['idempotency-key']).toBe(
  593 |       primera.headers()['idempotency-key'],
  594 |     );
  595 |     expect(respuesta.status()).toBe(409);
  596 |     expect(respuesta.headers()['retry-after']).toBe('1');
  597 |     expect(await respuesta.json()).toEqual({ error: 'OPERACION_EN_PROGRESO' });
  598 |     await expect(panel(segunda).locator('[data-estado=PENDIENTE]')).toHaveCount(1);
  599 |     await test.info().attach('espera-observada', {
  600 |       body: JSON.stringify({
  601 |         escenario: 'duplicado con advisory lock PostgreSQL de6s',
  602 |         observadoMs,
  603 |         resultado: 409,
  604 |       }),
  605 |       contentType: 'application/json',
  606 |     });
  607 |     expect((await primeraRespuesta).status()).toBe(409);
  608 |     await bloqueo;
  609 |     const reintento = page.waitForResponse(
  610 |       (respuesta) =>
  611 |         respuesta.request().method() === 'POST' &&
  612 |         respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  613 |     );
  614 |     await page.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
  615 |     const reintentada = await reintento;
  616 |     expect(reintentada.status()).toBe(200);
  617 |     expect(reintentada.request().headers()['idempotency-key']).toBe(clave);
  618 |     await expect(panel(segunda).getByRole('status')).toContainText('Resultado recuperado');
  619 |     const final = await admin.api.get(`/api/proveedores/${proveedor.id}`, {
  620 |       headers: admin.headers,
  621 |     });
  622 |     expect(await final.json()).toMatchObject({ version: proveedor.version + 1, activo: false });
  623 |     expect(await descriptores(segunda)).toEqual([]);
  624 |     await captura(segunda, 'progreso-recuperado');
  625 |     await segunda.close();
  626 |   } finally {
  627 |     if (bloqueo) await bloqueo;
  628 |     await test
  629 |       .info()
  630 |       .attach('diagnostico-progreso', {
  631 |         body: JSON.stringify(diagnostico),
  632 |         contentType: 'application/json',
  633 |       });
  634 |     await admin.api.dispose();
  635 |   }
  636 | });
  637 | 
```