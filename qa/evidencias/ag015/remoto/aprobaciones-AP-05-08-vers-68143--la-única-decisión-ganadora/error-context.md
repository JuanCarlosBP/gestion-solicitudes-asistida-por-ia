# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: aprobaciones.spec.ts >> AP-05/08: versión obsoleta y dos pestañas reales conservan la única decisión ganadora
- Location: e2e/aprobaciones.spec.ts:484:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Array [
    200,
-   409,
+   403,
  ]
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
      - link "Aprobaciones" [ref=f1e10] [cursor=pointer]:
        - /url: /aprobaciones
      - link "Solicitudes" [ref=f1e11] [cursor=pointer]:
        - /url: /solicitudes
      - link "Proveedores" [ref=f1e12] [cursor=pointer]:
        - /url: /proveedores
      - link "Mi cuenta" [ref=f1e13] [cursor=pointer]:
        - /url: /mi-cuenta
    - generic [ref=f1e14]: Entorno local
  - main [ref=f1e15]:
    - region "Operaciones seguras" [ref=f1e17]:
      - article [ref=f1e18]:
        - generic [ref=f1e19]:
          - strong [ref=f1e20]: Aprobación de solicitud
          - status [ref=f1e21]: Operación completada.
        - link "Abrir resultado" [ref=f1e23] [cursor=pointer]:
          - /url: /solicitudes/84f9472a-a0d8-4f99-b8fa-00fa07e3643c
      - article [ref=f1e24]:
        - generic [ref=f1e25]:
          - strong [ref=f1e26]: Rechazo de solicitud
          - status [ref=f1e27]: "No se ha localizado un resultado visible para tu cuenta. Conservamos el intento: consulta de nuevo o vuelve al formulario e introduce la misma entrada para reintentarlo."
        - generic [ref=f1e28]:
          - 'button "Consultar resultado: Rechazo de solicitud" [ref=f1e29] [cursor=pointer]': Consultar resultado
          - link "Volver a la operación" [ref=f1e30] [cursor=pointer]:
            - /url: /solicitudes/84f9472a-a0d8-4f99-b8fa-00fa07e3643c
    - generic [ref=f1e31]:
      - link "Volver a solicitudes" [ref=f1e32] [cursor=pointer]:
        - /url: /solicitudes
      - status [ref=f1e33]: Solicitud aprobada. La decisión ha quedado registrada.
      - generic [ref=f1e34]:
        - generic [ref=f1e35]:
          - paragraph [ref=f1e36]: SOL-2026-000053
          - heading "Concurrencia E2E 7a9d809b-beb6-4a55-8385-06db3974b6d6" [active] [level=1] [ref=f1e37]
          - paragraph [ref=f1e38]: Creada por Solicitante de demostración
        - generic [ref=f1e39]: Aprobada
      - generic [ref=f1e40]:
        - generic [ref=f1e41]:
          - region [ref=f1e42]:
            - heading "Datos de la solicitud" [level=2] [ref=f1e43]
            - paragraph [ref=f1e44]: Solicitud ficticia para verificar decisiones con persistencia real.
            - generic [ref=f1e45]:
              - generic [ref=f1e46]:
                - term [ref=f1e47]: Autor
                - definition [ref=f1e48]: Solicitante de demostración
              - generic [ref=f1e49]:
                - term [ref=f1e50]: Supervisor
                - definition [ref=f1e51]: Supervisor de demostración
              - generic [ref=f1e52]:
                - term [ref=f1e53]: Creada
                - definition [ref=f1e54]: 15/10/2026 22:08
              - generic [ref=f1e55]:
                - term [ref=f1e56]: Última actualización
                - definition [ref=f1e57]: 15/10/2026 22:08
              - generic [ref=f1e58]:
                - term [ref=f1e59]: Presentada
                - definition [ref=f1e60]: 15/10/2026 22:08
              - generic [ref=f1e61]:
                - term [ref=f1e62]: Versión
                - definition [ref=f1e63]: "3"
          - region [ref=f1e64]:
            - heading "Proveedor" [level=2] [ref=f1e65]
            - heading "Proveedor aprobaciones 8d80e37c-a614-4c91-ac2c-5e8906c6cb7c" [level=3] [ref=f1e66]
            - generic [ref=f1e67]:
              - generic [ref=f1e68]:
                - term [ref=f1e69]: Tipo
                - definition [ref=f1e70]: Profesional
              - generic [ref=f1e71]:
                - term [ref=f1e72]: País fiscal
                - definition [ref=f1e73]: ES
              - generic [ref=f1e74]:
                - term [ref=f1e75]: Identificador fiscal
                - definition [ref=f1e76]: FICTICIO-83c6dc89-9879-44c5-b685-6b3c5327f94d
            - paragraph [ref=f1e77]: Datos del proveedor conservados al presentar la solicitud.
        - complementary "Resumen de importes" [ref=f1e78]:
          - paragraph [ref=f1e79]: Total confirmado
          - strong [ref=f1e80]: 11,32 €
          - paragraph [ref=f1e81]: 2 conceptos · EUR
          - paragraph [ref=f1e82]: Calculado por el servidor, con redondeo por línea a dos decimales.
          - separator [ref=f1e83]
          - paragraph [ref=f1e84]: La cabecera y los conceptos están fijados desde la presentación.
      - region [ref=f1e85]:
        - heading "Conceptos" [level=2] [ref=f1e86]
        - table [ref=f1e87]:
          - caption [ref=f1e88]: Conceptos e importes confirmados por el servidor
          - rowgroup [ref=f1e89]:
            - row [ref=f1e90]:
              - columnheader "Concepto" [ref=f1e91]
              - columnheader "Cantidad" [ref=f1e92]
              - columnheader "Unidad" [ref=f1e93]
              - columnheader "Precio unitario (€)" [ref=f1e94]
              - columnheader "Importe (€)" [ref=f1e95]
          - rowgroup [ref=f1e96]:
            - row [ref=f1e97]:
              - rowheader "1. Servicio ficticio" [ref=f1e98]
              - cell "2.500" [ref=f1e99]
              - cell "Hora" [ref=f1e100]
              - cell "4.1250 €" [ref=f1e101]
              - cell [ref=f1e102]:
                - strong [ref=f1e103]: 10,31 €
            - row [ref=f1e104]:
              - rowheader "2. Material ficticio" [ref=f1e105]
              - cell "3.000" [ref=f1e106]
              - cell "Unidad" [ref=f1e107]
              - cell "0.3350 €" [ref=f1e108]
              - cell [ref=f1e109]:
                - strong [ref=f1e110]: 1,01 €
      - region [ref=f1e111]:
        - paragraph [ref=f1e112]: Decisión registrada
        - heading "Solicitud aprobada" [level=2] [ref=f1e113]
        - generic [ref=f1e114]:
          - generic [ref=f1e115]:
            - term [ref=f1e116]: Supervisor que decidió
            - definition [ref=f1e117]: Supervisor de demostración
          - generic [ref=f1e118]:
            - term [ref=f1e119]: Fecha de decisión
            - definition [ref=f1e120]: 15/10/2026 22:08
        - heading "Comentario de aprobación" [level=3] [ref=f1e121]
        - paragraph [ref=f1e122]: Sin comentario adicional.
      - region [ref=f1e124]:
        - generic [ref=f1e125]:
          - generic [ref=f1e126]:
            - paragraph [ref=f1e127]: TRAZABILIDAD
            - heading "Historial registrado" [level=2] [ref=f1e128]
          - link "Abrir historial completo" [ref=f1e129] [cursor=pointer]:
            - /url: /solicitudes/84f9472a-a0d8-4f99-b8fa-00fa07e3643c/historial?page=0&size=20
        - paragraph [ref=f1e130]: Más recientes primero · Fechas mostradas en UTC.
        - form "Filtros del historial" [ref=f1e131]:
          - generic [ref=f1e132]:
            - generic [ref=f1e133]:
              - generic [ref=f1e134]: Acción
              - combobox "Acción" [ref=f1e135]:
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
            - generic [ref=f1e136]:
              - generic [ref=f1e137]: Actor (UUID)
              - textbox "Actor (UUID)" [ref=f1e138]
            - generic [ref=f1e139]:
              - generic [ref=f1e140]: Desde (ISO con zona)
              - textbox "Desde (ISO con zona)" [ref=f1e141]:
                - /placeholder: 2026-10-15T00:00:00+02:00
            - generic [ref=f1e142]:
              - generic [ref=f1e143]: Hasta (ISO con zona)
              - textbox "Hasta (ISO con zona)" [ref=f1e144]:
                - /placeholder: 2026-10-15T23:59:59+02:00
            - generic [ref=f1e145]:
              - generic [ref=f1e146]: Eventos por página
              - combobox "Eventos por página" [ref=f1e147]:
                - option "1"
                - option "10"
                - option "20" [selected]
                - option "50"
                - option "100"
          - paragraph [ref=f1e148]: Fechas inclusivas. Indica Z para UTC o el desfase, por ejemplo +02:00.
          - generic [ref=f1e149]:
            - button "Aplicar filtros" [ref=f1e150] [cursor=pointer]
            - button "Restablecer filtros" [ref=f1e151] [cursor=pointer]
        - generic [ref=f1e152]:
          - status [ref=f1e153]: 4 eventos encontrados
          - list "Eventos del historial" [ref=f1e154]:
            - listitem [ref=f1e155]:
              - generic [ref=f1e156]:
                - heading "Solicitud aprobada" [level=3] [ref=f1e157]
                - time [ref=f1e158]: 15/10/2026 22:08:24
              - paragraph [ref=f1e159]: Supervisor de demostración
              - paragraph [ref=f1e160]: Solicitud aprobada
              - generic [ref=f1e161]:
                - generic [ref=f1e162]: PRESENTADA → APROBADA
                - generic [ref=f1e163]: Versión 2 → 3
              - paragraph [ref=f1e164]: Decisión registrada
            - listitem [ref=f1e165]:
              - generic [ref=f1e166]:
                - heading "Solicitud presentada" [level=3] [ref=f1e167]
                - time [ref=f1e168]: 15/10/2026 22:08:24
              - paragraph [ref=f1e169]: Solicitante de demostración
              - paragraph [ref=f1e170]: Solicitud presentada
              - generic [ref=f1e171]:
                - generic [ref=f1e172]: BORRADOR → PRESENTADA
                - generic [ref=f1e173]: Versión 1 → 2
              - paragraph [ref=f1e174]: Evento de negocio
            - listitem [ref=f1e175]:
              - generic [ref=f1e176]:
                - heading "Borrador guardado" [level=3] [ref=f1e177]
                - time [ref=f1e178]: 15/10/2026 22:08:24
              - paragraph [ref=f1e179]: Solicitante de demostración
              - paragraph [ref=f1e180]: Borrador guardado
              - generic [ref=f1e181]:
                - generic [ref=f1e182]: BORRADOR → BORRADOR
                - generic [ref=f1e183]: Versión 0 → 1
              - paragraph [ref=f1e184]: Evento de negocio
            - listitem [ref=f1e185]:
              - generic [ref=f1e186]:
                - heading "Borrador creado" [level=3] [ref=f1e187]
                - time [ref=f1e188]: 15/10/2026 22:08:24
              - paragraph [ref=f1e189]: Solicitante de demostración
              - paragraph [ref=f1e190]: Borrador creado
              - generic [ref=f1e191]:
                - generic [ref=f1e192]: Sin estado anterior → BORRADOR
                - generic [ref=f1e193]: Versión — → 0
              - paragraph [ref=f1e194]: Evento de negocio
          - navigation "Paginación del historial" [ref=f1e195]:
            - button "Página anterior de eventos" [disabled] [ref=f1e196]
            - generic [ref=f1e197]: Página 1 de 1
            - button "Siguiente página de eventos" [disabled] [ref=f1e198]
          - paragraph [ref=f1e199]: Si se registran eventos nuevos durante la consulta, las páginas pueden desplazarse. Recarga para actualizar.
          - button "Actualizar historial" [ref=f1e200] [cursor=pointer]
  - contentinfo [ref=f1e201]: Gestión de Solicitudes · Espacio de trabajo
```

# Test source

```ts
  430 |           page.getByRole('button', { name: 'Confirmar rechazo', exact: true }),
  431 |         ).toHaveCount(0);
  432 |       }
  433 |       await campo.fill(motivo);
  434 |       await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  435 |       await page.getByRole('button', { name: 'Volver a revisar', exact: true }).click();
  436 |       for (const ancho of [360, 768, 1440])
  437 |         await tecladoDecision(page, asignada.asunto, ancho, 'rechazo');
  438 |       await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  439 |       const respuesta = page.waitForResponse(
  440 |         (r) =>
  441 |           r.request().method() === 'POST' &&
  442 |           r.url().endsWith(`/api/solicitudes/${asignada.id}/rechazar`),
  443 |       );
  444 |       await page.getByRole('button', { name: 'Confirmar rechazo', exact: true }).click();
  445 |       expect((await respuesta).status()).toBe(200);
  446 |       await expect(page.locator('.encabezado .estado')).toHaveText('Rechazada');
  447 |       await expect(page.locator('.resultado-decision')).toContainText(motivo);
  448 |       await expect(page.locator('.resultado-decision b')).toHaveCount(0);
  449 |       for (const ancho of [360, 768, 1440]) await captura(page, 'rechazada', ancho);
  450 |       const final = await consultar(autor, asignada.id);
  451 |       expect(final.decision).toMatchObject({
  452 |         tipo: 'RECHAZAR',
  453 |         actor: multiple.usuario,
  454 |         motivo,
  455 |         comentario: null,
  456 |       });
  457 |       expect(final.conceptos).toEqual(asignada.conceptos);
  458 |       expect(final.proveedor).toEqual(asignada.proveedor);
  459 |     });
  460 |     await test.step('Motivo persiste y es visible a autor, auditor y administrador', async () => {
  461 |       await page.reload();
  462 |       await expect(page.locator('.resultado-decision')).toContainText(motivo);
  463 |       for (const rol of ['SOLICITANTE', 'AUDITOR', 'ADMINISTRADOR'] as RolDemo[]) {
  464 |         const contexto = await browser.newContext({ baseURL });
  465 |         try {
  466 |           const lector = await contexto.newPage();
  467 |           await acceder(lector, rol);
  468 |           await comprobarLectura(lector, asignada, 'Rechazada', motivo);
  469 |           await lector.goto(`/solicitudes?estado=RECHAZADA&asunto=${encodeURIComponent(marca)}`);
  470 |           await expect(lector.locator('.solicitud-tarjeta')).toHaveCount(1);
  471 |           await expect(lector.locator('.solicitud-tarjeta .estado')).toHaveText('Rechazada');
  472 |         } finally {
  473 |           await contexto.close();
  474 |         }
  475 |       }
  476 |       await page.goto(`/aprobaciones?asunto=${encodeURIComponent(marca)}`);
  477 |       await expect(page.locator('.resultado-consulta')).toContainText('0 solicitudes');
  478 |     });
  479 |   } finally {
  480 |     for (const sesion of sesiones) await sesion.api.dispose();
  481 |   }
  482 | });
  483 | 
  484 | test('AP-05/08: versión obsoleta y dos pestañas reales conservan la única decisión ganadora', async ({
  485 |   page,
  486 |   context,
  487 | }) => {
  488 |   test.setTimeout(120000);
  489 |   fixturesExternos();
  490 |   const sesiones: Sesion[] = [];
  491 |   try {
  492 |     const admin = await sesionApi('ADMINISTRADOR');
  493 |     sesiones.push(admin);
  494 |     const autor = await sesionApi('SOLICITANTE');
  495 |     sesiones.push(autor);
  496 |     const supervisor = await sesionApi('SUPERVISOR');
  497 |     sesiones.push(supervisor);
  498 |     const detalle = await presentada(admin, autor, supervisor, `Concurrencia E2E ${randomUUID()}`);
  499 |     const ruta = `/api/solicitudes/${detalle.id}`;
  500 |     const obsoleta = await supervisor.api.post(`${ruta}/aprobar`, {
  501 |       headers: await escritura(supervisor.api, {
  502 |         ...supervisor.headers,
  503 |         'Idempotency-Key': randomUUID(),
  504 |       }),
  505 |       data: { version: detalle.version - 1, comentario: null },
  506 |     });
  507 |     expect(obsoleta.status()).toBe(409);
  508 |     expect(((await obsoleta.json()) as { error: string }).error).toBe('VERSION_OBSOLETA');
  509 |     await acceder(page, 'SUPERVISOR');
  510 |     await page.goto(`/solicitudes/${detalle.id}`);
  511 |     const segunda = await context.newPage();
  512 |     await segunda.goto(`/solicitudes/${detalle.id}`);
  513 |     const motivo = 'Motivo ficticio conservado tras conflicto entre sesiones.';
  514 |     await page.getByRole('button', { name: 'Aprobar solicitud', exact: true }).click();
  515 |     await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  516 |     await segunda.getByRole('button', { name: 'Rechazar solicitud', exact: true }).click();
  517 |     await segunda.getByLabel('Motivo de rechazo *', { exact: true }).fill(motivo);
  518 |     await segunda.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  519 |     const primeraRespuesta = page.waitForResponse(
  520 |       (r) => r.request().method() === 'POST' && r.url().endsWith(`${ruta}/aprobar`),
  521 |     );
  522 |     const segundaRespuesta = segunda.waitForResponse(
  523 |       (r) => r.request().method() === 'POST' && r.url().endsWith(`${ruta}/rechazar`),
  524 |     );
  525 |     await Promise.all([
  526 |       page.getByRole('button', { name: 'Confirmar aprobación', exact: true }).click(),
  527 |       segunda.getByRole('button', { name: 'Confirmar rechazo', exact: true }).click(),
  528 |     ]);
  529 |     const respuestas = await Promise.all([primeraRespuesta, segundaRespuesta]);
> 530 |     expect(respuestas.map((r) => r.status()).sort()).toEqual([200, 409]);
      |                                                      ^ Error: expect(received).toEqual(expected) // deep equality
  531 |     const indiceGanador = respuestas[0].status() === 200 ? 0 : 1;
  532 |     const ganadora = indiceGanador === 0 ? page : segunda;
  533 |     const perdedora = indiceGanador === 0 ? segunda : page;
  534 |     const estado = indiceGanador === 0 ? 'APROBADA' : 'RECHAZADA';
  535 |     const etiqueta = indiceGanador === 0 ? 'Aprobada' : 'Rechazada';
  536 |     const conflicto = respuestas[1 - indiceGanador];
  537 |     expect(((await conflicto.json()) as { error: string }).error).toBe('SOLICITUD_NO_DECIDIBLE');
  538 |     await expect(ganadora.locator('.encabezado .estado')).toHaveText(etiqueta);
  539 |     await expect(perdedora.getByRole('alert')).toContainText('ya no está pendiente de decisión');
  540 |     await expect(perdedora.locator('#texto-decision')).toHaveValue(
  541 |       indiceGanador === 0 ? motivo : '',
  542 |     );
  543 |     await expect(
  544 |       perdedora.getByRole('button', { name: 'Aprobar solicitud', exact: true }),
  545 |     ).toBeDisabled();
  546 |     await expect(
  547 |       perdedora.getByRole('button', { name: 'Rechazar solicitud', exact: true }),
  548 |     ).toBeDisabled();
  549 |     await captura(perdedora, 'conflicto', 768);
  550 |     await perdedora.getByRole('button', { name: 'Recargar estado actual', exact: true }).click();
  551 |     await expect(perdedora.locator('.encabezado .estado')).toHaveText(etiqueta);
  552 |     await expect(perdedora.locator('app-solicitud-decision')).toHaveCount(0);
  553 |     const final = await consultar(autor, detalle.id);
  554 |     expect(final.estado).toBe(estado);
  555 |     expect(final.version).toBe(detalle.version + 1);
  556 |     expect(final.decision?.tipo).toBe(indiceGanador === 0 ? 'APROBAR' : 'RECHAZAR');
  557 |     expect(final.conceptos).toEqual(detalle.conceptos);
  558 |     expect(final.proveedor).toEqual(detalle.proveedor);
  559 |     await segunda.close();
  560 |   } finally {
  561 |     for (const sesion of sesiones) await sesion.api.dispose();
  562 |   }
  563 | });
  564 | 
```