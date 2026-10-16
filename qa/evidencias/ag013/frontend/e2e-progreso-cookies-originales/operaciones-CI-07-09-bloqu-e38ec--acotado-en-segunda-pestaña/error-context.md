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
            - /url: /proveedores/82e6956d-7fec-40f4-83f5-9e1aa8fb87fa
    - region [ref=f1e25]:
      - link "Volver a proveedores" [ref=f1e26] [cursor=pointer]:
        - /url: /proveedores
      - heading "Progreso006 dcdb8907-c196-424c-a41f-46874fe8e2ce" [level=1] [ref=f1e27]
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
          - definition [ref=f1e38]: FICTICIO-83d7a4dd-732a-4a6d-98a7-9d9f94d6522a
          - term [ref=f1e39]: Correo de contacto
          - definition [ref=f1e40]: Sin indicar
          - term [ref=f1e41]: Teléfono de contacto
          - definition [ref=f1e42]: Sin indicar
          - term [ref=f1e43]: Creación
          - definition [ref=f1e44]: 15/10/2026 13:00
          - term [ref=f1e45]: Última actualización
          - definition [ref=f1e46]: 15/10/2026 13:00
        - generic [ref=f1e47]:
          - link "Editar proveedor" [ref=f1e48] [cursor=pointer]:
            - /url: /proveedores/82e6956d-7fec-40f4-83f5-9e1aa8fb87fa/editar
          - button "Desactivar proveedor" [ref=f1e49] [cursor=pointer]
  - contentinfo [ref=f1e50]: Gestión de Solicitudes · Espacio de trabajo
```

# Test source

```ts
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
  512 |         const originales = await ruta.request().allHeaders();
  513 |         const cookieOriginal = originales['cookie']?.split(';').map((valor) => valor.trim()).find((valor) => valor.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length);
  514 |         diagnostico.push({ paso: 'peticion-original', cabeceraPresente: !!originales['x-xsrf-token'], cookieOriginalPresente: !!cookieOriginal, csrfOriginalCoincide: originales['x-xsrf-token'] === decodeURIComponent(cookieOriginal ?? '') });
  515 |         diagnostico.push({
  516 |           paso: 'antes-bloqueo',
  517 |           csrfCoincide: ruta.request().headers()['x-xsrf-token'] === (await csrf(page.request)),
  518 |         });
  519 |         const advisory = createHash('sha256')
  520 |           .update(`${admin.usuarioId}:${clave}`)
  521 |           .digest()
  522 |           .readBigInt64BE()
  523 |           .toString();
  524 |         bloqueo = sqlFixture(
  525 |           `BEGIN; SET LOCAL application_name='${aplicacion}'; SELECT pg_advisory_xact_lock(${advisory}); SELECT pg_sleep(6); COMMIT;`,
  526 |         );
  527 |         await expect
  528 |           .poll(
  529 |             () =>
  530 |               sqlFixture(
  531 |                 `SELECT count(*) FROM pg_stat_activity WHERE application_name='${aplicacion}' AND wait_event='PgSleep'`,
  532 |               ),
  533 |             { timeout: 3000, intervals: [50, 100] },
  534 |           )
  535 |           .toBe('1');
  536 |         diagnostico.push({
  537 |           paso: 'despues-bloqueo',
  538 |           csrfCoincide: ruta.request().headers()['x-xsrf-token'] === (await csrf(page.request)),
  539 |         });
  540 |         await ruta.continue();
  541 |         bloqueoListo.resolver();
  542 |       },
  543 |       { times: 1 },
  544 |     );
  545 |     const primeraPeticion = page.waitForRequest(
  546 |       (peticion) =>
  547 |         peticion.method() === 'POST' &&
  548 |         peticion.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  549 |     );
  550 |     const primeraRespuesta = page.waitForResponse(
  551 |       (respuesta) =>
  552 |         respuesta.request().method() === 'POST' &&
  553 |         respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  554 |     );
  555 |     await page.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
  556 |     const primera = await primeraPeticion;
  557 |     await bloqueoListo.promesa;
  558 |     const clave = primera.headers()['idempotency-key'];
  559 |     await expect
  560 |       .poll(
  561 |         async () => {
  562 |           const consulta = await admin.api.get(`/api/operaciones-idempotentes/${clave}`, {
  563 |             headers: admin.headers,
  564 |           });
  565 |           diagnostico.push({
  566 |             paso: 'consulta',
  567 |             status: consulta.status(),
  568 |             codigo: ((await consulta.json()) as { error?: string }).error,
  569 |           });
  570 |           return consulta.status() === 200
  571 |             ? ((await consulta.json()) as { estado: string }).estado
  572 |             : '';
  573 |         },
  574 |         { timeout: 2000, intervals: [50, 100] },
  575 |       )
> 576 |       .toBe('EN_PROGRESO');
      |        ^ Error: expect(received).toBe(expected) // Object.is equality
  577 |     await expect(
  578 |       panel(segunda).getByRole('button', {
  579 |         name: 'Consultar resultado: Desactivación de proveedor',
  580 |         exact: true,
  581 |       }),
  582 |     ).toBeVisible();
  583 |     await panel(segunda)
  584 |       .getByRole('button', { name: 'Consultar resultado: Desactivación de proveedor', exact: true })
  585 |       .click();
  586 |     await expect(panel(segunda).getByRole('status')).toContainText('Operación pendiente.');
  587 |     const inicio = performance.now();
  588 |     const segundaRespuesta = segunda.waitForResponse(
  589 |       (respuesta) =>
  590 |         respuesta.request().method() === 'POST' &&
  591 |         respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  592 |     );
  593 |     await segunda.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
  594 |     const respuesta = await segundaRespuesta;
  595 |     const observadoMs = Math.round(performance.now() - inicio);
  596 |     expect(respuesta.request().headers()['idempotency-key']).toBe(
  597 |       primera.headers()['idempotency-key'],
  598 |     );
  599 |     expect(respuesta.status()).toBe(409);
  600 |     expect(respuesta.headers()['retry-after']).toBe('1');
  601 |     expect(await respuesta.json()).toEqual({ error: 'OPERACION_EN_PROGRESO' });
  602 |     await expect(panel(segunda).locator('[data-estado=PENDIENTE]')).toHaveCount(1);
  603 |     await test.info().attach('espera-observada', {
  604 |       body: JSON.stringify({
  605 |         escenario: 'duplicado con advisory lock PostgreSQL de6s',
  606 |         observadoMs,
  607 |         resultado: 409,
  608 |       }),
  609 |       contentType: 'application/json',
  610 |     });
  611 |     expect((await primeraRespuesta).status()).toBe(409);
  612 |     await bloqueo;
  613 |     const reintento = page.waitForResponse(
  614 |       (respuesta) =>
  615 |         respuesta.request().method() === 'POST' &&
  616 |         respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
  617 |     );
  618 |     await page.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
  619 |     const reintentada = await reintento;
  620 |     expect(reintentada.status()).toBe(200);
  621 |     expect(reintentada.request().headers()['idempotency-key']).toBe(clave);
  622 |     await expect(panel(segunda).getByRole('status')).toContainText('Resultado recuperado');
  623 |     const final = await admin.api.get(`/api/proveedores/${proveedor.id}`, {
  624 |       headers: admin.headers,
  625 |     });
  626 |     expect(await final.json()).toMatchObject({ version: proveedor.version + 1, activo: false });
  627 |     expect(await descriptores(segunda)).toEqual([]);
  628 |     await captura(segunda, 'progreso-recuperado');
  629 |     await segunda.close();
  630 |   } finally {
  631 |     if (bloqueo) await bloqueo;
  632 |     const diagnosticoRuta = test.info().outputPath('diagnostico-progreso.json');
  633 |     await writeFile(diagnosticoRuta, JSON.stringify(diagnostico));
  634 |     await test.info().attach('diagnostico-progreso', { path: diagnosticoRuta, contentType: 'application/json' });
  635 |     await admin.api.dispose();
  636 |   }
  637 | });
  638 | 
```