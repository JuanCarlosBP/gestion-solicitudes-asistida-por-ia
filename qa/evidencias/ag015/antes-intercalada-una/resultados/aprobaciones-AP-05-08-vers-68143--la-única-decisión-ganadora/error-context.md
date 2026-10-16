# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: aprobaciones.spec.ts >> AP-05/08: versión obsoleta y dos pestañas reales conservan la única decisión ganadora
- Location: tmp\ag015\e2e\aprobaciones.spec.ts:485:5

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
          - status [ref=f1e21]: "No se ha localizado un resultado visible para tu cuenta. Conservamos el intento: consulta de nuevo o vuelve al formulario e introduce la misma entrada para reintentarlo."
        - generic [ref=f1e22]:
          - 'button "Consultar resultado: Aprobación de solicitud" [ref=f1e23] [cursor=pointer]': Consultar resultado
          - link "Volver a la operación" [ref=f1e24] [cursor=pointer]:
            - /url: /solicitudes/d7fa2d8b-1501-433c-9f06-25af247eb32f
      - article [ref=f1e25]:
        - generic [ref=f1e26]:
          - strong [ref=f1e27]: Rechazo de solicitud
          - status [ref=f1e28]: Operación completada. Resultado recuperado sin repetir el efecto.
        - link "Abrir resultado" [ref=f1e30] [cursor=pointer]:
          - /url: /solicitudes/d7fa2d8b-1501-433c-9f06-25af247eb32f
    - generic [ref=f1e31]:
      - link "Volver a solicitudes" [ref=f1e32] [cursor=pointer]:
        - /url: /solicitudes
      - generic [ref=f1e33]:
        - generic [ref=f1e34]:
          - paragraph [ref=f1e35]: SOL-2026-000059
          - heading "Concurrencia E2E 655f6580-3a50-4df7-bcbc-73febab00ec2" [level=1] [ref=f1e36]
          - paragraph [ref=f1e37]: Creada por Solicitante de demostración
        - generic [ref=f1e38]: Presentada
      - generic [ref=f1e39]:
        - generic [ref=f1e40]:
          - region [ref=f1e41]:
            - heading "Datos de la solicitud" [level=2] [ref=f1e42]
            - paragraph [ref=f1e43]: Solicitud ficticia para verificar decisiones con persistencia real.
            - generic [ref=f1e44]:
              - generic [ref=f1e45]:
                - term [ref=f1e46]: Autor
                - definition [ref=f1e47]: Solicitante de demostración
              - generic [ref=f1e48]:
                - term [ref=f1e49]: Supervisor
                - definition [ref=f1e50]: Supervisor de demostración
              - generic [ref=f1e51]:
                - term [ref=f1e52]: Creada
                - definition [ref=f1e53]: 16/10/2026 00:48
              - generic [ref=f1e54]:
                - term [ref=f1e55]: Última actualización
                - definition [ref=f1e56]: 16/10/2026 00:48
              - generic [ref=f1e57]:
                - term [ref=f1e58]: Presentada
                - definition [ref=f1e59]: 16/10/2026 00:48
              - generic [ref=f1e60]:
                - term [ref=f1e61]: Versión
                - definition [ref=f1e62]: "2"
          - region [ref=f1e63]:
            - heading "Proveedor" [level=2] [ref=f1e64]
            - heading "Proveedor aprobaciones ae349b1c-b49e-414f-a3a7-7ee7798e1ba1" [level=3] [ref=f1e65]
            - generic [ref=f1e66]:
              - generic [ref=f1e67]:
                - term [ref=f1e68]: Tipo
                - definition [ref=f1e69]: Profesional
              - generic [ref=f1e70]:
                - term [ref=f1e71]: País fiscal
                - definition [ref=f1e72]: ES
              - generic [ref=f1e73]:
                - term [ref=f1e74]: Identificador fiscal
                - definition [ref=f1e75]: FICTICIO-8f02d5ba-a92e-4fd4-bc9f-d98fc7d109e0
            - paragraph [ref=f1e76]: Datos del proveedor conservados al presentar la solicitud.
        - complementary "Resumen de importes" [ref=f1e77]:
          - paragraph [ref=f1e78]: Total confirmado
          - strong [ref=f1e79]: 11,32 €
          - paragraph [ref=f1e80]: 2 conceptos · EUR
          - paragraph [ref=f1e81]: Calculado por el servidor, con redondeo por línea a dos decimales.
          - separator [ref=f1e82]
          - paragraph [ref=f1e83]: La cabecera y los conceptos están fijados desde la presentación.
      - region [ref=f1e84]:
        - heading "Conceptos" [level=2] [ref=f1e85]
        - table [ref=f1e86]:
          - caption [ref=f1e87]: Conceptos e importes confirmados por el servidor
          - rowgroup [ref=f1e88]:
            - row [ref=f1e89]:
              - columnheader "Concepto" [ref=f1e90]
              - columnheader "Cantidad" [ref=f1e91]
              - columnheader "Unidad" [ref=f1e92]
              - columnheader "Precio unitario (€)" [ref=f1e93]
              - columnheader "Importe (€)" [ref=f1e94]
          - rowgroup [ref=f1e95]:
            - row [ref=f1e96]:
              - rowheader "1. Servicio ficticio" [ref=f1e97]
              - cell "2.500" [ref=f1e98]
              - cell "Hora" [ref=f1e99]
              - cell "4.1250 €" [ref=f1e100]
              - cell [ref=f1e101]:
                - strong [ref=f1e102]: 10,31 €
            - row [ref=f1e103]:
              - rowheader "2. Material ficticio" [ref=f1e104]
              - cell "3.000" [ref=f1e105]
              - cell "Unidad" [ref=f1e106]
              - cell "0.3350 €" [ref=f1e107]
              - cell [ref=f1e108]:
                - strong [ref=f1e109]: 1,01 €
      - region [ref=f1e111]:
        - paragraph [ref=f1e112]: Supervisión asignada
        - heading "Decidir esta solicitud" [level=2] [ref=f1e113]
        - paragraph [ref=f1e114]: La aprobación o el rechazo son definitivos. Revisa los conceptos y el total antes de decidir.
        - alert [active] [ref=f1e115]:
          - paragraph [ref=f1e116]: Tu cuenta no tiene permiso para esta operación.
          - button "Recargar estado actual" [ref=f1e118] [cursor=pointer]
        - generic [ref=f1e119]:
          - button "Aprobar solicitud" [ref=f1e120] [cursor=pointer]
          - button "Rechazar solicitud" [ref=f1e121] [cursor=pointer]
        - form "Decisión del supervisor" [ref=f1e122]:
          - generic [ref=f1e123]:
            - generic [ref=f1e124]: Comentario de aprobación (opcional)
            - textbox "Comentario de aprobación (opcional)" [ref=f1e125]
            - generic [ref=f1e126]: Hasta 500 caracteres. Será visible para las personas autorizadas a consultar la solicitud.
          - button "Revisar decisión" [ref=f1e127] [cursor=pointer]
      - region [ref=f1e129]:
        - generic [ref=f1e130]:
          - generic [ref=f1e131]:
            - paragraph [ref=f1e132]: TRAZABILIDAD
            - heading "Historial registrado" [level=2] [ref=f1e133]
          - link "Abrir historial completo" [ref=f1e134] [cursor=pointer]:
            - /url: /solicitudes/d7fa2d8b-1501-433c-9f06-25af247eb32f/historial?page=0&size=20
        - paragraph [ref=f1e135]: Más recientes primero · Fechas mostradas en Europe/Madrid.
        - form "Filtros del historial" [ref=f1e136]:
          - generic [ref=f1e137]:
            - generic [ref=f1e138]:
              - generic [ref=f1e139]: Acción
              - combobox "Acción" [ref=f1e140]:
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
            - generic [ref=f1e141]:
              - generic [ref=f1e142]: Actor (UUID)
              - textbox "Actor (UUID)" [ref=f1e143]
            - generic [ref=f1e144]:
              - generic [ref=f1e145]: Desde (ISO con zona)
              - textbox "Desde (ISO con zona)" [ref=f1e146]:
                - /placeholder: 2026-10-15T00:00:00+02:00
            - generic [ref=f1e147]:
              - generic [ref=f1e148]: Hasta (ISO con zona)
              - textbox "Hasta (ISO con zona)" [ref=f1e149]:
                - /placeholder: 2026-10-15T23:59:59+02:00
            - generic [ref=f1e150]:
              - generic [ref=f1e151]: Eventos por página
              - combobox "Eventos por página" [ref=f1e152]:
                - option "1"
                - option "10"
                - option "20" [selected]
                - option "50"
                - option "100"
          - paragraph [ref=f1e153]: Fechas inclusivas. Indica Z para UTC o el desfase, por ejemplo +02:00.
          - generic [ref=f1e154]:
            - button "Aplicar filtros" [ref=f1e155] [cursor=pointer]
            - button "Restablecer filtros" [ref=f1e156] [cursor=pointer]
        - generic [ref=f1e157]:
          - status [ref=f1e158]: 3 eventos encontrados
          - list "Eventos del historial" [ref=f1e159]:
            - listitem [ref=f1e160]:
              - generic [ref=f1e161]:
                - heading "Solicitud presentada" [level=3] [ref=f1e162]
                - time [ref=f1e163]: 16/10/2026 00:48:52
              - paragraph [ref=f1e164]: Solicitante de demostración
              - paragraph [ref=f1e165]: Solicitud presentada
              - generic [ref=f1e166]:
                - generic [ref=f1e167]: BORRADOR → PRESENTADA
                - generic [ref=f1e168]: Versión 1 → 2
              - paragraph [ref=f1e169]: Evento de negocio
            - listitem [ref=f1e170]:
              - generic [ref=f1e171]:
                - heading "Borrador guardado" [level=3] [ref=f1e172]
                - time [ref=f1e173]: 16/10/2026 00:48:52
              - paragraph [ref=f1e174]: Solicitante de demostración
              - paragraph [ref=f1e175]: Borrador guardado
              - generic [ref=f1e176]:
                - generic [ref=f1e177]: BORRADOR → BORRADOR
                - generic [ref=f1e178]: Versión 0 → 1
              - paragraph [ref=f1e179]: Evento de negocio
            - listitem [ref=f1e180]:
              - generic [ref=f1e181]:
                - heading "Borrador creado" [level=3] [ref=f1e182]
                - time [ref=f1e183]: 16/10/2026 00:48:52
              - paragraph [ref=f1e184]: Solicitante de demostración
              - paragraph [ref=f1e185]: Borrador creado
              - generic [ref=f1e186]:
                - generic [ref=f1e187]: Sin estado anterior → BORRADOR
                - generic [ref=f1e188]: Versión — → 0
              - paragraph [ref=f1e189]: Evento de negocio
          - navigation "Paginación del historial" [ref=f1e190]:
            - button "Página anterior de eventos" [disabled] [ref=f1e191]
            - generic [ref=f1e192]: Página 1 de 1
            - button "Siguiente página de eventos" [disabled] [ref=f1e193]
          - paragraph [ref=f1e194]: Si se registran eventos nuevos durante la consulta, las páginas pueden desplazarse. Recarga para actualizar.
          - button "Actualizar historial" [ref=f1e195] [cursor=pointer]
  - contentinfo [ref=f1e196]: Gestión de Solicitudes · Espacio de trabajo
```

# Test source

```ts
  472 |           await expect(lector.locator('.solicitud-tarjeta .estado')).toHaveText('Rechazada');
  473 |         } finally {
  474 |           await contexto.close();
  475 |         }
  476 |       }
  477 |       await page.goto(`/aprobaciones?asunto=${encodeURIComponent(marca)}`);
  478 |       await expect(page.locator('.resultado-consulta')).toContainText('0 solicitudes');
  479 |     });
  480 |   } finally {
  481 |     for (const sesion of sesiones) await sesion.api.dispose();
  482 |   }
  483 | });
  484 | 
  485 | test('AP-05/08: versión obsoleta y dos pestañas reales conservan la única decisión ganadora', async ({
  486 |   page,
  487 |   context,
  488 | }) => {
  489 |   test.setTimeout(120000);
  490 |   fixturesExternos();
  491 |   const sesiones: Sesion[] = [];
  492 |   try {
  493 |     const admin = await sesionApi('ADMINISTRADOR');
  494 |     sesiones.push(admin);
  495 |     const autor = await sesionApi('SOLICITANTE');
  496 |     sesiones.push(autor);
  497 |     const supervisor = await sesionApi('SUPERVISOR');
  498 |     sesiones.push(supervisor);
  499 |     const detalle = await presentada(admin, autor, supervisor, `Concurrencia E2E ${randomUUID()}`);
  500 |     const ruta = `/api/solicitudes/${detalle.id}`;
  501 |     const obsoleta = await supervisor.api.post(`${ruta}/aprobar`, {
  502 |       headers: await escritura(supervisor.api, {
  503 |         ...supervisor.headers,
  504 |         'Idempotency-Key': randomUUID(),
  505 |       }),
  506 |       data: { version: detalle.version - 1, comentario: null },
  507 |     });
  508 |     expect(obsoleta.status()).toBe(409);
  509 |     expect(((await obsoleta.json()) as { error: string }).error).toBe('VERSION_OBSOLETA');
  510 |     await acceder(page, 'SUPERVISOR');
  511 |     await page.goto(`/solicitudes/${detalle.id}`);
  512 |     const segunda = await context.newPage();
  513 |     await segunda.goto(`/solicitudes/${detalle.id}`);
  514 |     const motivo = 'Motivo ficticio conservado tras conflicto entre sesiones.';
  515 |     await page.getByRole('button', { name: 'Aprobar solicitud', exact: true }).click();
  516 |     await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  517 |     await segunda.getByRole('button', { name: 'Rechazar solicitud', exact: true }).click();
  518 |     await segunda.getByLabel('Motivo de rechazo *', { exact: true }).fill(motivo);
  519 |     await segunda.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  520 |     // Barrera causal: conserva URL/cuerpo/cabeceras y libera ambos envíos reales juntos.
  521 |     for (const pestaña of [page]) {
  522 |       await pestaña.evaluate(() => {
  523 |         const w = window as any;
  524 |         w.ag015Pendientes = [];
  525 |         const enviar = XMLHttpRequest.prototype.send;
  526 |         const abrir = XMLHttpRequest.prototype.open;
  527 |         XMLHttpRequest.prototype.open = function (...args: any[]) {
  528 |           (this as any).ag015Url = String(args[1]);
  529 |           return (abrir as any).apply(this, args);
  530 |         };
  531 |         XMLHttpRequest.prototype.send = function (cuerpo) {
  532 |           if (/\/(aprobar|rechazar)$/.test((this as any).ag015Url)) {
  533 |             w.ag015Pendientes.push(() => enviar.call(this, cuerpo));
  534 |             return;
  535 |           }
  536 |           return enviar.call(this, cuerpo);
  537 |         };
  538 |         const fetchReal = window.fetch.bind(window);
  539 |         window.fetch = async (entrada, opciones) => {
  540 |           const url = entrada instanceof Request ? entrada.url : String(entrada);
  541 |           if (/\/(aprobar|rechazar)$/.test(url)) {
  542 |             return new Promise<Response>((resolve, reject) => {
  543 |               w.ag015Pendientes.push(() => fetchReal(entrada, opciones).then(resolve, reject));
  544 |             });
  545 |           }
  546 |           return fetchReal(entrada, opciones);
  547 |         };
  548 |       });
  549 |     }
  550 | 
  551 |     const primeraRespuesta = page.waitForResponse(
  552 |       (r) => r.request().method() === 'POST' && r.url().endsWith(`${ruta}/aprobar`),
  553 |     );
  554 |     const segundaRespuesta = segunda.waitForResponse(
  555 |       (r) => r.request().method() === 'POST' && r.url().endsWith(`${ruta}/rechazar`),
  556 |     );
  557 |     await page.getByRole('button', { name: 'Confirmar aprobación', exact: true }).click();
  558 |     await expect.poll(() => page.evaluate(() => (window as any).ag015Pendientes.length)).toBe(1);
  559 |     // La segunda pestaña ejecuta su GET Angular real de historial entre captura y envío.
  560 |     const lectura = segunda.waitForResponse(r => r.url().includes('/historial') && r.request().method() === 'GET');
  561 |     await segunda.evaluate(() => {
  562 |       const boton = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Actualizar historial');
  563 |       if (!boton) throw new Error('No existe el control de historial');
  564 |       boton.click();
  565 |     });
  566 |     expect((await lectura).status()).toBe(200);
  567 |     await Promise.all([
  568 |       segunda.getByRole('button', { name: 'Confirmar rechazo', exact: true }).click(),
  569 |       page.evaluate(() => { for (const enviar of (window as any).ag015Pendientes) enviar(); }),
  570 |     ]);
  571 |     const respuestas = await Promise.all([primeraRespuesta, segundaRespuesta]);
> 572 |     expect(respuestas.map((r) => r.status()).sort()).toEqual([200, 409]);
      |                                                      ^ Error: expect(received).toEqual(expected) // deep equality
  573 |     const indiceGanador = respuestas[0].status() === 200 ? 0 : 1;
  574 |     const ganadora = indiceGanador === 0 ? page : segunda;
  575 |     const perdedora = indiceGanador === 0 ? segunda : page;
  576 |     const estado = indiceGanador === 0 ? 'APROBADA' : 'RECHAZADA';
  577 |     const etiqueta = indiceGanador === 0 ? 'Aprobada' : 'Rechazada';
  578 |     const conflicto = respuestas[1 - indiceGanador];
  579 |     expect(((await conflicto.json()) as { error: string }).error).toBe('SOLICITUD_NO_DECIDIBLE');
  580 |     await expect(ganadora.locator('.encabezado .estado')).toHaveText(etiqueta);
  581 |     await expect(perdedora.getByRole('alert')).toContainText('ya no está pendiente de decisión');
  582 |     await expect(perdedora.locator('#texto-decision')).toHaveValue(
  583 |       indiceGanador === 0 ? motivo : '',
  584 |     );
  585 |     await expect(
  586 |       perdedora.getByRole('button', { name: 'Aprobar solicitud', exact: true }),
  587 |     ).toBeDisabled();
  588 |     await expect(
  589 |       perdedora.getByRole('button', { name: 'Rechazar solicitud', exact: true }),
  590 |     ).toBeDisabled();
  591 |     await captura(perdedora, 'conflicto', 768);
  592 |     await perdedora.getByRole('button', { name: 'Recargar estado actual', exact: true }).click();
  593 |     await expect(perdedora.locator('.encabezado .estado')).toHaveText(etiqueta);
  594 |     await expect(perdedora.locator('app-solicitud-decision')).toHaveCount(0);
  595 |     const final = await consultar(autor, detalle.id);
  596 |     expect(final.estado).toBe(estado);
  597 |     expect(final.version).toBe(detalle.version + 1);
  598 |     expect(final.decision?.tipo).toBe(indiceGanador === 0 ? 'APROBAR' : 'RECHAZAR');
  599 |     expect(final.conceptos).toEqual(detalle.conceptos);
  600 |     expect(final.proveedor).toEqual(detalle.proveedor);
  601 |     await segunda.close();
  602 |   } finally {
  603 |     for (const sesion of sesiones) await sesion.api.dispose();
  604 |   }
  605 | });
  606 | 
```