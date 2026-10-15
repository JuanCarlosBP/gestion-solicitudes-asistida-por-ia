# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: solicitudes.spec.ts >> SCI-01–13: trece pasos completos con Angular, API y PostgreSQL reales
- Location: e2e\solicitudes.spec.ts:65:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 403
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
    - generic [ref=f1e15]:
      - link "Volver a solicitudes" [ref=f1e16] [cursor=pointer]:
        - /url: /solicitudes
      - status [ref=f1e17]: Solicitud presentada. La cabecera y los conceptos quedan fijados.
      - generic [ref=f1e18]:
        - generic [ref=f1e19]:
          - paragraph [ref=f1e20]: SOL-2026-000017
          - heading "Solicitud E2E bf26ff14-cfbc-428d-8fed-c643486550e8" [active] [level=1] [ref=f1e21]
          - paragraph [ref=f1e22]: Creada por Solicitante de demostración
        - generic [ref=f1e23]: Presentada
      - generic [ref=f1e24]:
        - generic [ref=f1e25]:
          - region [ref=f1e26]:
            - heading "Datos de la solicitud" [level=2] [ref=f1e27]
            - paragraph [ref=f1e28]: Datos ficticios para comprobar el recorrido completo.
            - generic [ref=f1e29]:
              - generic [ref=f1e30]:
                - term [ref=f1e31]: Autor
                - definition [ref=f1e32]: Solicitante de demostración
              - generic [ref=f1e33]:
                - term [ref=f1e34]: Supervisor
                - definition [ref=f1e35]: Supervisor de demostración
              - generic [ref=f1e36]:
                - term [ref=f1e37]: Creada
                - definition [ref=f1e38]: 15/10/2026 00:00
              - generic [ref=f1e39]:
                - term [ref=f1e40]: Última actualización
                - definition [ref=f1e41]: 15/10/2026 00:00
              - generic [ref=f1e42]:
                - term [ref=f1e43]: Presentada
                - definition [ref=f1e44]: 15/10/2026 00:00
              - generic [ref=f1e45]:
                - term [ref=f1e46]: Versión
                - definition [ref=f1e47]: "4"
          - region [ref=f1e48]:
            - heading "Proveedor" [level=2] [ref=f1e49]
            - heading "Proveedor E2E bf26ff14-cfbc-428d-8fed-c643486550e8" [level=3] [ref=f1e50]
            - generic [ref=f1e51]:
              - generic [ref=f1e52]:
                - term [ref=f1e53]: Tipo
                - definition [ref=f1e54]: Profesional
              - generic [ref=f1e55]:
                - term [ref=f1e56]: País fiscal
                - definition [ref=f1e57]: ES
              - generic [ref=f1e58]:
                - term [ref=f1e59]: Identificador fiscal
                - definition [ref=f1e60]: FICTICIO-bf26ff14-cfbc-428d-8fed-c643486550e8
            - paragraph [ref=f1e61]: Datos del proveedor conservados al presentar la solicitud.
        - complementary "Resumen de importes" [ref=f1e62]:
          - paragraph [ref=f1e63]: Total confirmado
          - strong [ref=f1e64]: 21,32 €
          - paragraph [ref=f1e65]: 3 conceptos · EUR
          - paragraph [ref=f1e66]: Calculado por el servidor, con redondeo por línea a dos decimales.
          - separator [ref=f1e67]
          - paragraph [ref=f1e68]: La cabecera y los conceptos están fijados desde la presentación.
      - region [ref=f1e69]:
        - heading "Conceptos" [level=2] [ref=f1e70]
        - table [ref=f1e71]:
          - caption [ref=f1e72]: Conceptos e importes confirmados por el servidor
          - rowgroup [ref=f1e73]:
            - row [ref=f1e74]:
              - columnheader "Concepto" [ref=f1e75]
              - columnheader "Cantidad" [ref=f1e76]
              - columnheader "Unidad" [ref=f1e77]
              - columnheader "Precio unitario (€)" [ref=f1e78]
              - columnheader "Importe (€)" [ref=f1e79]
          - rowgroup [ref=f1e80]:
            - row [ref=f1e81]:
              - rowheader "1. Material ficticio" [ref=f1e82]
              - cell "1.000" [ref=f1e83]
              - cell "Unidad" [ref=f1e84]
              - cell "10.0000 €" [ref=f1e85]
              - cell [ref=f1e86]:
                - strong [ref=f1e87]: 10,00 €
            - row [ref=f1e88]:
              - rowheader "2. Servicio ficticio" [ref=f1e89]
              - cell "2.500" [ref=f1e90]
              - cell "Hora" [ref=f1e91]
              - cell "4.1250 €" [ref=f1e92]
              - cell [ref=f1e93]:
                - strong [ref=f1e94]: 10,31 €
            - row [ref=f1e95]:
              - rowheader "3. Suministro ficticio" [ref=f1e96]
              - cell "3.000" [ref=f1e97]
              - cell "Unidad" [ref=f1e98]
              - cell "0.3350 €" [ref=f1e99]
              - cell [ref=f1e100]:
                - strong [ref=f1e101]: 1,01 €
  - contentinfo [ref=f1e102]: Gestión de Solicitudes · Espacio de trabajo
```

# Test source

```ts
  166 |       const concurrente = await context.newPage();
  167 |       try {
  168 |         await concurrente.goto(`${ruta}/editar`);
  169 |         await expect(concurrente.getByLabel('Asunto *', { exact: true })).toHaveValue(asunto);
  170 |         await concurrente.getByLabel('Asunto *', { exact: true }).fill(`${asunto} remoto`);
  171 |         await concurrente.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  172 |         await expect(
  173 |           concurrente.getByRole('heading', { name: `${asunto} remoto`, exact: true }),
  174 |         ).toBeVisible();
  175 |         await page.getByLabel('Asunto *', { exact: true }).fill(`${asunto} local`);
  176 |         await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  177 |         await expect(page.getByRole('alert')).toContainText('Tus cambios siguen aquí');
  178 |         await expect(page.getByRole('alert')).toBeFocused();
  179 |         await expect(page.getByLabel('Asunto *', { exact: true })).toHaveValue(`${asunto} local`);
  180 |         await expect(page.getByLabel('Cantidad del concepto 2', { exact: true })).toHaveValue(
  181 |           '2.500',
  182 |         );
  183 |         await expect(
  184 |           page.getByRole('button', { name: 'Guardar borrador', exact: true }),
  185 |         ).toBeDisabled();
  186 |         await captura(page, 'conflicto', 1440);
  187 |       } finally {
  188 |         await concurrente.close();
  189 |       }
  190 |     });
  191 |     await test.step('06 Recupera versión actual y corrige borrador', async () => {
  192 |       await page.getByRole('button', { name: 'Descartar cambios y recargar', exact: true }).click();
  193 |       await expect(page.getByLabel('Asunto *', { exact: true })).toHaveValue(`${asunto} remoto`);
  194 |       await page.getByLabel('Asunto *', { exact: true }).fill(asunto);
  195 |       await expect(
  196 |         page.getByRole('button', { name: 'Guardar borrador', exact: true }),
  197 |       ).toBeEnabled();
  198 |     });
  199 |     await test.step('07 Selecciona proveedor activo y supervisor habilitado', async () => {
  200 |       const escriturasAntesDeBuscar = escrituras;
  201 |       await page
  202 |         .getByLabel('Buscar proveedor por nombre', { exact: true })
  203 |         .fill(`Proveedor E2E ${marca}`);
  204 |       const busquedaProveedor = page.waitForResponse(
  205 |         (r) =>
  206 |           new URL(r.url()).pathname === '/api/proveedores' &&
  207 |           new URL(r.url()).searchParams.get('denominacion') === `Proveedor E2E ${marca}`,
  208 |       );
  209 |       await page.getByLabel('Buscar proveedor por nombre', { exact: true }).press('Enter');
  210 |       expect((await busquedaProveedor).status()).toBe(200);
  211 |       await expect(page).toHaveURL((url) => url.pathname === `${ruta}/editar`);
  212 |       expect(escrituras).toBe(escriturasAntesDeBuscar);
  213 |       await expect(page.getByLabel('Proveedor', { exact: true })).toBeEnabled();
  214 |       await page.getByLabel('Proveedor', { exact: true }).selectOption(proveedorId);
  215 |       await page
  216 |         .getByLabel('Buscar supervisor por nombre', { exact: true })
  217 |         .fill(supervisor.usuario.nombreVisible);
  218 |       const busquedaSupervisor = page.waitForResponse(
  219 |         (r) =>
  220 |           new URL(r.url()).pathname === '/api/identidad/supervisores' &&
  221 |           new URL(r.url()).searchParams.get('nombre') === supervisor.usuario.nombreVisible,
  222 |       );
  223 |       await page.getByLabel('Buscar supervisor por nombre', { exact: true }).press('Enter');
  224 |       expect((await busquedaSupervisor).status()).toBe(200);
  225 |       await expect(page).toHaveURL((url) => url.pathname === `${ruta}/editar`);
  226 |       expect(escrituras).toBe(escriturasAntesDeBuscar);
  227 |       await expect(page.getByLabel('Supervisor', { exact: true })).toBeEnabled();
  228 |       await page.getByLabel('Supervisor', { exact: true }).selectOption(supervisor.usuario.id);
  229 |       await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  230 |       await expect(page.getByRole('heading', { name: asunto, exact: true })).toBeVisible();
  231 |       await expect(page.locator('dd')).toContainText([supervisor.usuario.nombreVisible]);
  232 |     });
  233 |     await test.step('08 Confirma y presenta; detalle queda inmutable', async () => {
  234 |       await page.getByRole('button', { name: 'Presentar solicitud', exact: true }).click();
  235 |       await expect(
  236 |         page.getByRole('heading', { name: 'Confirmar presentación', exact: true }),
  237 |       ).toBeFocused();
  238 |       const respuesta = page.waitForResponse(
  239 |         (r) =>
  240 |           new URL(r.url()).pathname === `/api${ruta}/presentar` && r.request().method() === 'POST',
  241 |       );
  242 |       await page.getByRole('button', { name: 'Confirmar y presentar', exact: true }).click();
  243 |       const enviada = await respuesta;
  244 |       expect(enviada.status()).toBe(200);
  245 |       const peticion = enviada.request();
  246 |       clavePresentacion = peticion.headers()['idempotency-key'];
  247 |       versionPresentada = (peticion.postDataJSON() as { version: number }).version;
  248 |       cabecerasPresentacion = {
  249 |         Authorization: peticion.headers()['authorization'],
  250 |         'X-XSRF-TOKEN': peticion.headers()['x-xsrf-token'],
  251 |         'Idempotency-Key': clavePresentacion,
  252 |       };
  253 |       resultadoPresentacion = (await enviada.json()) as Record<string, unknown>;
  254 |       await expect(page.locator('.estado')).toHaveText('Presentada');
  255 |       await expect(page.getByRole('status')).toContainText('Solicitud presentada.');
  256 |       await expect(page.getByRole('link', { name: 'Editar borrador', exact: true })).toHaveCount(0);
  257 |       await expect(
  258 |         page.getByText('Datos del proveedor conservados al presentar la solicitud.'),
  259 |       ).toBeVisible();
  260 |     });
  261 |     await test.step('09 Repite misma clave real y comprueba idéntico resultado sin duplicar', async () => {
  262 |       const repetida = await page.request.post(`/api${ruta}/presentar`, {
  263 |         headers: cabecerasPresentacion,
  264 |         data: { version: versionPresentada },
  265 |       });
> 266 |       expect(repetida.status()).toBe(200);
      |                                 ^ Error: expect(received).toBe(expected) // Object.is equality
  267 |       expect(await repetida.json()).toEqual(resultadoPresentacion);
  268 |       const lista = await page.request.get(
  269 |         `/api/solicitudes?numero=${encodeURIComponent(numero)}`,
  270 |         { headers: { Authorization: cabecerasPresentacion['Authorization'] } },
  271 |       );
  272 |       expect(lista.status()).toBe(200);
  273 |       expect(((await lista.json()) as { totalElementos: number }).totalElementos).toBe(1);
  274 |       expect(clavePresentacion).toMatch(/^[0-9a-f-]{36}$/);
  275 |     });
  276 |     await test.step('10 SUPERVISOR consulta asignada presentada sin modificar', async () => {
  277 |       const separado = await browser.newContext({ baseURL });
  278 |       try {
  279 |         const lector = await separado.newPage();
  280 |         await acceder(lector, 'SUPERVISOR');
  281 |         await lector.goto(`/solicitudes?numero=${encodeURIComponent(numero)}`);
  282 |         await expect(lector.getByRole('status')).toHaveText('1 solicitudes encontradas.');
  283 |         await lector.getByRole('link', { name: asunto, exact: true }).click();
  284 |         await expect(lector.locator('.estado')).toHaveText('Presentada');
  285 |         await expect(
  286 |           lector.getByRole('link', { name: 'Editar borrador', exact: true }),
  287 |         ).toHaveCount(0);
  288 |         await captura(lector, 'supervisor', 1440);
  289 |       } finally {
  290 |         await separado.close();
  291 |       }
  292 |     });
  293 |     await test.step('11 AUDITOR consulta solicitud y total sin escritura', async () => {
  294 |       const separado = await browser.newContext({ baseURL });
  295 |       try {
  296 |         const lector = await separado.newPage();
  297 |         await acceder(lector, 'AUDITOR');
  298 |         await lector.goto(ruta);
  299 |         await expect(lector.locator('.importe-total')).toHaveText('21,32 €');
  300 |         await expect(
  301 |           lector.getByRole('button', { name: 'Presentar solicitud', exact: true }),
  302 |         ).toHaveCount(0);
  303 |         await lector.goto(`${ruta}/editar`);
  304 |         await expect(lector).toHaveURL(/\/solicitudes$/);
  305 |       } finally {
  306 |         await separado.close();
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
```