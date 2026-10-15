# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: solicitudes.spec.ts >> SCI-01–13: trece pasos completos con Angular, API y PostgreSQL reales
- Location: e2e\solicitudes.spec.ts:107:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('app-solicitud-detalle').getByRole('status')
Expected substring: "Solicitud presentada."
Error: strict mode violation: locator('app-solicitud-detalle').getByRole('status') resolved to 2 elements:
    1) <p role="status" class="exito" _ngcontent-ng-c2404591878="">Solicitud presentada. La cabecera y los conceptos…</p> aka getByText('Solicitud presentada. La')
    2) <p role="status" class="estado-consulta" _ngcontent-ng-c979294554=""> 5 eventos encontrados </p> aka getByText('eventos encontrados')

Call log:
  - Expect "toContainText" locator('app-solicitud-detalle').getByRole('status') with timeout 5000ms
  - waiting for locator('app-solicitud-detalle').getByRole('status')

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
          - strong [ref=f1e19]: Presentación de solicitud
          - status [ref=f1e20]: Operación completada.
        - link "Abrir resultado" [ref=f1e22] [cursor=pointer]:
          - /url: /solicitudes/90f904b3-5e8d-471a-ace4-ca41727882d4
    - generic [ref=f1e23]:
      - link "Volver a solicitudes" [ref=f1e24] [cursor=pointer]:
        - /url: /solicitudes
      - status [ref=f1e25]: Solicitud presentada. La cabecera y los conceptos quedan fijados.
      - generic [ref=f1e26]:
        - generic [ref=f1e27]:
          - paragraph [ref=f1e28]: SOL-2026-000253
          - heading "Solicitud E2E 1300b349-128e-417a-b311-00a3046bbc36" [active] [level=1] [ref=f1e29]
          - paragraph [ref=f1e30]: Creada por Solicitante de demostración
        - generic [ref=f1e31]: Presentada
      - generic [ref=f1e32]:
        - generic [ref=f1e33]:
          - region [ref=f1e34]:
            - heading "Datos de la solicitud" [level=2] [ref=f1e35]
            - paragraph [ref=f1e36]: Datos ficticios para comprobar el recorrido completo.
            - generic [ref=f1e37]:
              - generic [ref=f1e38]:
                - term [ref=f1e39]: Autor
                - definition [ref=f1e40]: Solicitante de demostración
              - generic [ref=f1e41]:
                - term [ref=f1e42]: Supervisor
                - definition [ref=f1e43]: Supervisor de demostración
              - generic [ref=f1e44]:
                - term [ref=f1e45]: Creada
                - definition [ref=f1e46]: 15/10/2026 21:52
              - generic [ref=f1e47]:
                - term [ref=f1e48]: Última actualización
                - definition [ref=f1e49]: 15/10/2026 21:52
              - generic [ref=f1e50]:
                - term [ref=f1e51]: Presentada
                - definition [ref=f1e52]: 15/10/2026 21:52
              - generic [ref=f1e53]:
                - term [ref=f1e54]: Versión
                - definition [ref=f1e55]: "4"
          - region [ref=f1e56]:
            - heading "Proveedor" [level=2] [ref=f1e57]
            - heading "Proveedor E2E 1300b349-128e-417a-b311-00a3046bbc36" [level=3] [ref=f1e58]
            - generic [ref=f1e59]:
              - generic [ref=f1e60]:
                - term [ref=f1e61]: Tipo
                - definition [ref=f1e62]: Profesional
              - generic [ref=f1e63]:
                - term [ref=f1e64]: País fiscal
                - definition [ref=f1e65]: ES
              - generic [ref=f1e66]:
                - term [ref=f1e67]: Identificador fiscal
                - definition [ref=f1e68]: FICTICIO-1300b349-128e-417a-b311-00a3046bbc36
            - paragraph [ref=f1e69]: Datos del proveedor conservados al presentar la solicitud.
        - complementary "Resumen de importes" [ref=f1e70]:
          - paragraph [ref=f1e71]: Total confirmado
          - strong [ref=f1e72]: 21,32 €
          - paragraph [ref=f1e73]: 3 conceptos · EUR
          - paragraph [ref=f1e74]: Calculado por el servidor, con redondeo por línea a dos decimales.
          - separator [ref=f1e75]
          - paragraph [ref=f1e76]: La cabecera y los conceptos están fijados desde la presentación.
      - region [ref=f1e77]:
        - heading "Conceptos" [level=2] [ref=f1e78]
        - table [ref=f1e79]:
          - caption [ref=f1e80]: Conceptos e importes confirmados por el servidor
          - rowgroup [ref=f1e81]:
            - row [ref=f1e82]:
              - columnheader "Concepto" [ref=f1e83]
              - columnheader "Cantidad" [ref=f1e84]
              - columnheader "Unidad" [ref=f1e85]
              - columnheader "Precio unitario (€)" [ref=f1e86]
              - columnheader "Importe (€)" [ref=f1e87]
          - rowgroup [ref=f1e88]:
            - row [ref=f1e89]:
              - rowheader "1. Material ficticio" [ref=f1e90]
              - cell "1.000" [ref=f1e91]
              - cell "Unidad" [ref=f1e92]
              - cell "10.0000 €" [ref=f1e93]
              - cell [ref=f1e94]:
                - strong [ref=f1e95]: 10,00 €
            - row [ref=f1e96]:
              - rowheader "2. Servicio ficticio" [ref=f1e97]
              - cell "2.500" [ref=f1e98]
              - cell "Hora" [ref=f1e99]
              - cell "4.1250 €" [ref=f1e100]
              - cell [ref=f1e101]:
                - strong [ref=f1e102]: 10,31 €
            - row [ref=f1e103]:
              - rowheader "3. Suministro ficticio" [ref=f1e104]
              - cell "3.000" [ref=f1e105]
              - cell "Unidad" [ref=f1e106]
              - cell "0.3350 €" [ref=f1e107]
              - cell [ref=f1e108]:
                - strong [ref=f1e109]: 1,01 €
      - region [ref=f1e111]:
        - generic [ref=f1e112]:
          - generic [ref=f1e113]:
            - paragraph [ref=f1e114]: TRAZABILIDAD
            - heading "Historial registrado" [level=2] [ref=f1e115]
          - link "Abrir historial completo" [ref=f1e116] [cursor=pointer]:
            - /url: /solicitudes/90f904b3-5e8d-471a-ace4-ca41727882d4/historial?page=0&size=20
        - paragraph [ref=f1e117]: Más recientes primero · Fechas mostradas en Europe/Madrid.
        - form "Filtros del historial" [ref=f1e118]:
          - generic [ref=f1e119]:
            - generic [ref=f1e120]:
              - text: Acción
              - combobox "Acción" [ref=f1e121]:
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
            - generic [ref=f1e122]:
              - text: Actor (UUID)
              - textbox "Actor (UUID)" [ref=f1e123]
            - generic [ref=f1e124]:
              - text: Desde (ISO con zona)
              - textbox "Desde (ISO con zona)" [ref=f1e125]:
                - /placeholder: 2026-10-15T00:00:00+02:00
            - generic [ref=f1e126]:
              - text: Hasta (ISO con zona)
              - textbox "Hasta (ISO con zona)" [ref=f1e127]:
                - /placeholder: 2026-10-15T23:59:59+02:00
            - generic [ref=f1e128]:
              - text: Eventos por página
              - combobox "Eventos por página" [ref=f1e129]:
                - option "1" [selected]
                - option "10"
                - option "20"
                - option "50"
                - option "100"
          - paragraph [ref=f1e130]: Fechas inclusivas. Indica Z para UTC o el desfase, por ejemplo +02:00.
          - generic [ref=f1e131]:
            - button "Aplicar filtros" [ref=f1e132] [cursor=pointer]
            - button "Restablecer filtros" [ref=f1e133] [cursor=pointer]
        - generic [ref=f1e134]:
          - status [ref=f1e135]: 5 eventos encontrados
          - list "Eventos del historial" [ref=f1e136]:
            - listitem [ref=f1e137]:
              - generic [ref=f1e138]:
                - heading "Solicitud presentada" [level=3] [ref=f1e139]
                - time [ref=f1e140]: 15/10/2026 21:52:16
              - paragraph [ref=f1e141]: Solicitante de demostración
              - paragraph [ref=f1e142]: Solicitud presentada
              - generic [ref=f1e143]:
                - generic [ref=f1e144]: BORRADOR → PRESENTADA
                - generic [ref=f1e145]: Versión 3 → 4
              - paragraph [ref=f1e146]: Evento de negocio
            - listitem [ref=f1e147]:
              - generic [ref=f1e148]:
                - heading "Borrador guardado" [level=3] [ref=f1e149]
                - time [ref=f1e150]: 15/10/2026 21:52:15
              - paragraph [ref=f1e151]: Solicitante de demostración
              - paragraph [ref=f1e152]: Borrador guardado
              - generic [ref=f1e153]:
                - generic [ref=f1e154]: BORRADOR → BORRADOR
                - generic [ref=f1e155]: Versión 2 → 3
              - paragraph [ref=f1e156]: Evento de negocio
            - listitem [ref=f1e157]:
              - generic [ref=f1e158]:
                - heading "Borrador guardado" [level=3] [ref=f1e159]
                - time [ref=f1e160]: 15/10/2026 21:52:15
              - paragraph [ref=f1e161]: Solicitante de demostración
              - paragraph [ref=f1e162]: Borrador guardado
              - generic [ref=f1e163]:
                - generic [ref=f1e164]: BORRADOR → BORRADOR
                - generic [ref=f1e165]: Versión 1 → 2
              - paragraph [ref=f1e166]: Evento de negocio
            - listitem [ref=f1e167]:
              - generic [ref=f1e168]:
                - heading "Borrador guardado" [level=3] [ref=f1e169]
                - time [ref=f1e170]: 15/10/2026 21:52:15
              - paragraph [ref=f1e171]: Solicitante de demostración
              - paragraph [ref=f1e172]: Borrador guardado
              - generic [ref=f1e173]:
                - generic [ref=f1e174]: BORRADOR → BORRADOR
                - generic [ref=f1e175]: Versión 0 → 1
              - paragraph [ref=f1e176]: Evento de negocio
            - listitem [ref=f1e177]:
              - generic [ref=f1e178]:
                - heading "Borrador creado" [level=3] [ref=f1e179]
                - time [ref=f1e180]: 15/10/2026 21:52:14
              - paragraph [ref=f1e181]: Solicitante de demostración
              - paragraph [ref=f1e182]: Borrador creado
              - generic [ref=f1e183]:
                - generic [ref=f1e184]: Sin estado anterior → BORRADOR
                - generic [ref=f1e185]: Versión — → 0
              - paragraph [ref=f1e186]: Evento de negocio
          - navigation "Paginación del historial" [ref=f1e187]:
            - button "Página anterior de eventos" [disabled] [ref=f1e188]
            - generic [ref=f1e189]: Página 1 de 1
            - button "Siguiente página de eventos" [disabled] [ref=f1e190]
          - paragraph [ref=f1e191]: Si se registran eventos nuevos durante la consulta, las páginas pueden desplazarse. Recarga para actualizar.
          - button "Actualizar historial" [ref=f1e192] [cursor=pointer]
  - contentinfo [ref=f1e193]: Gestión de Solicitudes · Espacio de trabajo
```

# Test source

```ts
  201 |       await expect(page.locator('.importe-total')).toHaveText('21,32 €');
  202 |       await expect(page.getByRole('heading', { name: asunto, exact: true })).toBeFocused();
  203 |       numero = (await page.locator('.encabezado .ceja').textContent())!.trim();
  204 |       expect(numero).toMatch(/^SOL-\d{4}-\d{6}$/);
  205 |       await page.reload();
  206 |       await expect(page.locator('.importe-total')).toHaveText('21,32 €');
  207 |       await page.getByRole('link', { name: 'Editar borrador', exact: true }).click();
  208 |       await expect(page.getByLabel('Precio unitario del concepto 2', { exact: true })).toHaveValue(
  209 |         '4.1250',
  210 |       );
  211 |     });
  212 |     await test.step('05 Dos sesiones de edición provocan VERSION_OBSOLETA real', async () => {
  213 |       const concurrente = await context.newPage();
  214 |       try {
  215 |         await concurrente.goto(`${ruta}/editar`);
  216 |         await expect(concurrente.getByLabel('Asunto *', { exact: true })).toHaveValue(asunto);
  217 |         await concurrente.getByLabel('Asunto *', { exact: true }).fill(`${asunto} remoto`);
  218 |         await concurrente.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  219 |         await expect(
  220 |           concurrente.getByRole('heading', { name: `${asunto} remoto`, exact: true }),
  221 |         ).toBeVisible();
  222 |         await page.getByLabel('Asunto *', { exact: true }).fill(`${asunto} local`);
  223 |         await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  224 |         await expect(page.getByRole('alert')).toContainText('Tus cambios siguen aquí');
  225 |         await expect(page.getByRole('alert')).toBeFocused();
  226 |         await expect(page.getByLabel('Asunto *', { exact: true })).toHaveValue(`${asunto} local`);
  227 |         await expect(page.getByLabel('Cantidad del concepto 2', { exact: true })).toHaveValue(
  228 |           '2.500',
  229 |         );
  230 |         await expect(
  231 |           page.getByRole('button', { name: 'Guardar borrador', exact: true }),
  232 |         ).toBeDisabled();
  233 |         await captura(page, 'conflicto', 1440);
  234 |       } finally {
  235 |         await concurrente.close();
  236 |       }
  237 |     });
  238 |     await test.step('06 Recupera versión actual y corrige borrador', async () => {
  239 |       await page.getByRole('button', { name: 'Descartar cambios y recargar', exact: true }).click();
  240 |       await expect(page.getByLabel('Asunto *', { exact: true })).toHaveValue(`${asunto} remoto`);
  241 |       await page.getByLabel('Asunto *', { exact: true }).fill(asunto);
  242 |       await expect(
  243 |         page.getByRole('button', { name: 'Guardar borrador', exact: true }),
  244 |       ).toBeEnabled();
  245 |     });
  246 |     await test.step('07 Selecciona proveedor activo y supervisor habilitado', async () => {
  247 |       const escriturasAntesDeBuscar = escrituras;
  248 |       await page
  249 |         .getByLabel('Buscar proveedor por nombre', { exact: true })
  250 |         .fill(`Proveedor E2E ${marca}`);
  251 |       const busquedaProveedor = page.waitForResponse(
  252 |         (r) =>
  253 |           new URL(r.url()).pathname === '/api/proveedores' &&
  254 |           new URL(r.url()).searchParams.get('denominacion') === `Proveedor E2E ${marca}`,
  255 |       );
  256 |       await page.getByLabel('Buscar proveedor por nombre', { exact: true }).press('Enter');
  257 |       expect((await busquedaProveedor).status()).toBe(200);
  258 |       await expect(page).toHaveURL((url) => url.pathname === `${ruta}/editar`);
  259 |       expect(escrituras).toBe(escriturasAntesDeBuscar);
  260 |       await expect(page.getByLabel('Proveedor', { exact: true })).toBeEnabled();
  261 |       await page.getByLabel('Proveedor', { exact: true }).selectOption(proveedorId);
  262 |       await page
  263 |         .getByLabel('Buscar supervisor por nombre', { exact: true })
  264 |         .fill(supervisor.usuario.nombreVisible);
  265 |       const busquedaSupervisor = page.waitForResponse(
  266 |         (r) =>
  267 |           new URL(r.url()).pathname === '/api/identidad/supervisores' &&
  268 |           new URL(r.url()).searchParams.get('nombre') === supervisor.usuario.nombreVisible,
  269 |       );
  270 |       await page.getByLabel('Buscar supervisor por nombre', { exact: true }).press('Enter');
  271 |       expect((await busquedaSupervisor).status()).toBe(200);
  272 |       await expect(page).toHaveURL((url) => url.pathname === `${ruta}/editar`);
  273 |       expect(escrituras).toBe(escriturasAntesDeBuscar);
  274 |       await expect(page.getByLabel('Supervisor', { exact: true })).toBeEnabled();
  275 |       await page.getByLabel('Supervisor', { exact: true }).selectOption(supervisor.usuario.id);
  276 |       await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  277 |       await expect(page.getByRole('heading', { name: asunto, exact: true })).toBeVisible();
  278 |       await expect(page.locator('dd')).toContainText([supervisor.usuario.nombreVisible]);
  279 |     });
  280 |     await test.step('08 Confirma y presenta; detalle queda inmutable', async () => {
  281 |       await page.getByRole('button', { name: 'Presentar solicitud', exact: true }).click();
  282 |       await expect(
  283 |         page.getByRole('heading', { name: 'Confirmar presentación', exact: true }),
  284 |       ).toBeFocused();
  285 |       const respuesta = page.waitForResponse(
  286 |         (r) =>
  287 |           new URL(r.url()).pathname === `/api${ruta}/presentar` && r.request().method() === 'POST',
  288 |       );
  289 |       await page.getByRole('button', { name: 'Confirmar y presentar', exact: true }).click();
  290 |       const enviada = await respuesta;
  291 |       expect(enviada.status()).toBe(200);
  292 |       const peticion = enviada.request();
  293 |       clavePresentacion = peticion.headers()['idempotency-key'];
  294 |       versionPresentada = (peticion.postDataJSON() as { version: number }).version;
  295 |       cabecerasPresentacion = {
  296 |         Authorization: peticion.headers()['authorization'],
  297 |         'Idempotency-Key': clavePresentacion,
  298 |       };
  299 |       resultadoPresentacion = (await enviada.json()) as Record<string, unknown>;
  300 |       await expect(page.locator('.estado')).toHaveText('Presentada');
> 301 |       await expect(page.locator('app-solicitud-detalle').getByRole('status')).toContainText(
      |                                                                               ^ Error: expect(locator).toContainText(expected) failed
  302 |         'Solicitud presentada.',
  303 |       );
  304 |       await expect(page.getByRole('link', { name: 'Editar borrador', exact: true })).toHaveCount(0);
  305 |       await expect(
  306 |         page.getByText('Datos del proveedor conservados al presentar la solicitud.'),
  307 |       ).toBeVisible();
  308 |     });
  309 |     await test.step('09 Repite misma clave real y comprueba idéntico resultado sin duplicar', async () => {
  310 |       const repetida = await page.request.post(`/api${ruta}/presentar`, {
  311 |         headers: await cabecerasEscritura(page.request, cabecerasPresentacion),
  312 |         data: { version: versionPresentada },
  313 |       });
  314 |       expect(repetida.status()).toBe(200);
  315 |       expect(await repetida.json()).toEqual(resultadoPresentacion);
  316 |       const lista = await page.request.get(
  317 |         `/api/solicitudes?numero=${encodeURIComponent(numero)}`,
  318 |         { headers: { Authorization: cabecerasPresentacion['Authorization'] } },
  319 |       );
  320 |       expect(lista.status()).toBe(200);
  321 |       expect(((await lista.json()) as { totalElementos: number }).totalElementos).toBe(1);
  322 |       expect(clavePresentacion).toMatch(/^[0-9a-f-]{36}$/);
  323 |     });
  324 |     await test.step('10 SUPERVISOR consulta asignada presentada sin modificar', async () => {
  325 |       const separado = await browser.newContext({ baseURL });
  326 |       try {
  327 |         const lector = await separado.newPage();
  328 |         await acceder(lector, 'SUPERVISOR');
  329 |         await lector.goto(`/solicitudes?numero=${encodeURIComponent(numero)}`);
  330 |         await expect(lector.getByRole('status')).toHaveText('1 solicitudes encontradas.');
  331 |         await lector.getByRole('link', { name: asunto, exact: true }).click();
  332 |         await expect(lector.locator('.estado')).toHaveText('Presentada');
  333 |         await expect(
  334 |           lector.getByRole('link', { name: 'Editar borrador', exact: true }),
  335 |         ).toHaveCount(0);
  336 |         await captura(lector, 'supervisor', 1440);
  337 |       } finally {
  338 |         await separado.close();
  339 |       }
  340 |     });
  341 |     await test.step('11 AUDITOR consulta solicitud y total sin escritura', async () => {
  342 |       const separado = await browser.newContext({ baseURL });
  343 |       try {
  344 |         const lector = await separado.newPage();
  345 |         await acceder(lector, 'AUDITOR');
  346 |         await lector.goto(ruta);
  347 |         await expect(lector.locator('.importe-total')).toHaveText('21,32 €');
  348 |         await expect(
  349 |           lector.getByRole('button', { name: 'Presentar solicitud', exact: true }),
  350 |         ).toHaveCount(0);
  351 |         await lector.goto(`${ruta}/editar`);
  352 |         await expect(lector).toHaveURL(/\/solicitudes$/);
  353 |       } finally {
  354 |         await separado.close();
  355 |       }
  356 |     });
  357 |     await test.step('12 SOLICITANTE ajeno no lista ni consulta la solicitud', async () => {
  358 |       const separado = await browser.newContext({ baseURL });
  359 |       try {
  360 |         const lector = await separado.newPage();
  361 |         await acceder(lector, 'SOLICITANTE', ajenoCorreo!);
  362 |         await lector.goto(`/solicitudes?numero=${encodeURIComponent(numero)}`);
  363 |         await expect(lector.getByRole('status')).toHaveText('0 solicitudes encontradas.');
  364 |         const respuesta = lector.waitForResponse(
  365 |           (r) => new URL(r.url()).pathname === `/api${ruta}` && r.request().method() === 'GET',
  366 |         );
  367 |         await lector.goto(ruta);
  368 |         expect((await respuesta).status()).toBe(404);
  369 |         await expect(lector.getByRole('alert')).toContainText('no existe o no está disponible');
  370 |         await expect(lector.getByRole('heading', { name: asunto, exact: true })).toHaveCount(0);
  371 |       } finally {
  372 |         await separado.close();
  373 |       }
  374 |     });
  375 |     await test.step('13 Responsive, teclado, rutas directas, filtros y recarga', async () => {
  376 |       for (const ancho of [360, 768, 1440]) await captura(page, 'detalle', ancho);
  377 |       await page.goto(`/solicitudes?numero=${encodeURIComponent(numero)}&estado=PRESENTADA&size=1`);
  378 |       await expect(page.getByRole('heading', { name: 'Solicitudes', exact: true })).toBeFocused();
  379 |       for (const ancho of [360, 768, 1440]) await captura(page, 'lista', ancho);
  380 |       const direccion = page.url();
  381 |       await page.reload();
  382 |       await expect(page).toHaveURL(direccion);
  383 |       await expect(page.getByLabel('Número exacto', { exact: true })).toHaveValue(numero);
  384 |       await expect(page.getByRole('link', { name: asunto, exact: true })).toBeVisible();
  385 |       await page.setViewportSize({ width: 360, height: 800 });
  386 |       await page.goto(`${ruta}/editar`);
  387 |       await expect(page.getByRole('alert')).toContainText('no es un borrador propio editable');
  388 |       await expect(page.getByRole('button', { name: 'Guardar borrador', exact: true })).toHaveCount(
  389 |         0,
  390 |       );
  391 |       await page.goto('/solicitudes/nueva');
  392 |       await expect(
  393 |         page.getByRole('heading', { name: 'Nueva solicitud', exact: true }),
  394 |       ).toBeFocused();
  395 |       await page.keyboard.press('Tab');
  396 |       await expect(page.getByLabel('Asunto *', { exact: true })).toBeFocused();
  397 |       await page.getByRole('button', { name: 'Crear borrador', exact: true }).focus();
  398 |       await page.keyboard.press('Enter');
  399 |       await expect(page.getByRole('alert')).toBeFocused();
  400 |       await expect(page.getByLabel('Asunto *', { exact: true })).toHaveAttribute(
  401 |         'aria-invalid',
```