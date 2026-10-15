# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: operaciones.spec.ts >> CI-07/09: bloqueo PostgreSQL real produce progreso acotado en segunda pestaña
- Location: e2e\operaciones.spec.ts:473:5

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
            - /url: /proveedores/40b23759-e88f-4965-b80e-3e23235e6e2d
    - region [ref=f1e25]:
      - link "Volver a proveedores" [ref=f1e26] [cursor=pointer]:
        - /url: /proveedores
      - heading "Progreso006 bf2f8d7e-60ac-463c-b209-84b23a05469c" [level=1] [ref=f1e27]
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
          - definition [ref=f1e38]: FICTICIO-e6f00e54-f669-4be7-80c3-d53cbb8e71a8
          - term [ref=f1e39]: Correo de contacto
          - definition [ref=f1e40]: Sin indicar
          - term [ref=f1e41]: Teléfono de contacto
          - definition [ref=f1e42]: Sin indicar
          - term [ref=f1e43]: Creación
          - definition [ref=f1e44]: 15/10/2026 12:58
          - term [ref=f1e45]: Última actualización
          - definition [ref=f1e46]: 15/10/2026 12:58
        - generic [ref=f1e47]:
          - link "Editar proveedor" [ref=f1e48] [cursor=pointer]:
            - /url: /proveedores/40b23759-e88f-4965-b80e-3e23235e6e2d/editar
          - button "Desactivar proveedor" [ref=f1e49] [cursor=pointer]
  - contentinfo [ref=f1e50]: Gestión de Solicitudes · Espacio de trabajo
```

# Test source

```ts
  473 | test('CI-07/09: bloqueo PostgreSQL real produce progreso acotado en segunda pestaña', async ({
  474 |   page,
  475 |   context,
  476 | }) => {
  477 |   test.setTimeout(120000);
  478 |   const admin = await sesionApi('ADMINISTRADOR');
  479 |   let bloqueo: Promise<string> | undefined;
  480 |   const aplicacion = `e2e006_${randomUUID().replaceAll('-', '')}`;
  481 |   const bloqueoListo = senal();
  482 |   const diagnostico: unknown[] = [];
  483 |   try {
  484 |     const alta = await admin.api.post('/api/proveedores', {
  485 |       headers: await escritura(admin.api, admin.headers),
  486 |       data: {
  487 |         tipo: 'PROFESIONAL',
  488 |         denominacion: `Progreso006 ${randomUUID()}`,
  489 |         paisFiscal: 'ES',
  490 |         identificadorFiscal: `FICTICIO-${randomUUID()}`,
  491 |         correoContacto: null,
  492 |         telefonoContacto: null,
  493 |       },
  494 |     });
  495 |     expect(alta.status()).toBe(201);
  496 |     const proveedor = (await alta.json()) as Proveedor;
  497 |     page.on('response', async (respuesta) => {
  498 |       if (respuesta.url().endsWith(`/api/proveedores/${proveedor.id}/desactivar`))
  499 |         diagnostico.push({ paso: 'post', status: respuesta.status(), codigo: ((await respuesta.json()) as { error?: string }).error });
  500 |     });
  501 |     await acceder(page, 'ADMINISTRADOR');
  502 |     await page.goto(`/proveedores/${proveedor.id}`);
  503 |     const segunda = await context.newPage();
  504 |     await segunda.goto(`/proveedores/${proveedor.id}`);
  505 |     await expect(
  506 |       segunda.getByRole('button', { name: 'Desactivar proveedor', exact: true }),
  507 |     ).toBeVisible();
  508 |     await page.route(
  509 |       `**/api/proveedores/${proveedor.id}/desactivar`,
  510 |       async (ruta) => {
  511 |         const clave = uuidFixture(ruta.request().headers()['idempotency-key']);
  512 |         diagnostico.push({
  513 |           paso: 'antes-bloqueo',
  514 |           csrfCoincide: ruta.request().headers()['x-xsrf-token'] === (await csrf(page.request)),
  515 |         });
  516 |         const advisory = createHash('sha256')
  517 |           .update(`${admin.usuarioId}:${clave}`)
  518 |           .digest()
  519 |           .readBigInt64BE()
  520 |           .toString();
  521 |         bloqueo = sqlFixture(
  522 |           `BEGIN; SET LOCAL application_name='${aplicacion}'; SELECT pg_advisory_xact_lock(${advisory}); SELECT pg_sleep(6); COMMIT;`,
  523 |         );
  524 |         await expect
  525 |           .poll(
  526 |             () =>
  527 |               sqlFixture(
  528 |                 `SELECT count(*) FROM pg_stat_activity WHERE application_name='${aplicacion}' AND wait_event='PgSleep'`,
  529 |               ),
  530 |             { timeout: 3000, intervals: [50, 100] },
  531 |           )
  532 |           .toBe('1');
  533 |         diagnostico.push({
  534 |           paso: 'despues-bloqueo',
  535 |           csrfCoincide: ruta.request().headers()['x-xsrf-token'] === (await csrf(page.request)),
  536 |         });
  537 |         await ruta.continue();
  538 |         bloqueoListo.resolver();
  539 |       },
  540 |       { times: 1 },
  541 |     );
  542 |     const primeraPeticion = page.waitForRequest(
  543 |       (peticion) =>
  544 |         peticion.method() === 'POST' &&
  545 |         peticion.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  546 |     );
  547 |     const primeraRespuesta = page.waitForResponse(
  548 |       (respuesta) =>
  549 |         respuesta.request().method() === 'POST' &&
  550 |         respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  551 |     );
  552 |     await page.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
  553 |     const primera = await primeraPeticion;
  554 |     await bloqueoListo.promesa;
  555 |     const clave = primera.headers()['idempotency-key'];
  556 |     await expect
  557 |       .poll(
  558 |         async () => {
  559 |           const consulta = await admin.api.get(`/api/operaciones-idempotentes/${clave}`, {
  560 |             headers: admin.headers,
  561 |           });
  562 |           diagnostico.push({
  563 |             paso: 'consulta',
  564 |             status: consulta.status(),
  565 |             codigo: ((await consulta.json()) as { error?: string }).error,
  566 |           });
  567 |           return consulta.status() === 200
  568 |             ? ((await consulta.json()) as { estado: string }).estado
  569 |             : '';
  570 |         },
  571 |         { timeout: 2000, intervals: [50, 100] },
  572 |       )
> 573 |       .toBe('EN_PROGRESO');
      |        ^ Error: expect(received).toBe(expected) // Object.is equality
  574 |     await expect(
  575 |       panel(segunda).getByRole('button', {
  576 |         name: 'Consultar resultado: Desactivación de proveedor',
  577 |         exact: true,
  578 |       }),
  579 |     ).toBeVisible();
  580 |     await panel(segunda)
  581 |       .getByRole('button', { name: 'Consultar resultado: Desactivación de proveedor', exact: true })
  582 |       .click();
  583 |     await expect(panel(segunda).getByRole('status')).toContainText('Operación pendiente.');
  584 |     const inicio = performance.now();
  585 |     const segundaRespuesta = segunda.waitForResponse(
  586 |       (respuesta) =>
  587 |         respuesta.request().method() === 'POST' &&
  588 |         respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  589 |     );
  590 |     await segunda.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
  591 |     const respuesta = await segundaRespuesta;
  592 |     const observadoMs = Math.round(performance.now() - inicio);
  593 |     expect(respuesta.request().headers()['idempotency-key']).toBe(
  594 |       primera.headers()['idempotency-key'],
  595 |     );
  596 |     expect(respuesta.status()).toBe(409);
  597 |     expect(respuesta.headers()['retry-after']).toBe('1');
  598 |     expect(await respuesta.json()).toEqual({ error: 'OPERACION_EN_PROGRESO' });
  599 |     await expect(panel(segunda).locator('[data-estado=PENDIENTE]')).toHaveCount(1);
  600 |     await test.info().attach('espera-observada', {
  601 |       body: JSON.stringify({
  602 |         escenario: 'duplicado con advisory lock PostgreSQL de6s',
  603 |         observadoMs,
  604 |         resultado: 409,
  605 |       }),
  606 |       contentType: 'application/json',
  607 |     });
  608 |     expect((await primeraRespuesta).status()).toBe(409);
  609 |     await bloqueo;
  610 |     const reintento = page.waitForResponse(
  611 |       (respuesta) =>
  612 |         respuesta.request().method() === 'POST' &&
  613 |         respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  614 |     );
  615 |     await page.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
  616 |     const reintentada = await reintento;
  617 |     expect(reintentada.status()).toBe(200);
  618 |     expect(reintentada.request().headers()['idempotency-key']).toBe(clave);
  619 |     await expect(panel(segunda).getByRole('status')).toContainText('Resultado recuperado');
  620 |     const final = await admin.api.get(`/api/proveedores/${proveedor.id}`, {
  621 |       headers: admin.headers,
  622 |     });
  623 |     expect(await final.json()).toMatchObject({ version: proveedor.version + 1, activo: false });
  624 |     expect(await descriptores(segunda)).toEqual([]);
  625 |     await captura(segunda, 'progreso-recuperado');
  626 |     await segunda.close();
  627 |   } finally {
  628 |     if (bloqueo) await bloqueo;
  629 |     const diagnosticoRuta = test.info().outputPath('diagnostico-progreso.json');
  630 |     await writeFile(diagnosticoRuta, JSON.stringify(diagnostico));
  631 |     await test.info().attach('diagnostico-progreso', { path: diagnosticoRuta, contentType: 'application/json' });
  632 |     await admin.api.dispose();
  633 |   }
  634 | });
  635 | 
```