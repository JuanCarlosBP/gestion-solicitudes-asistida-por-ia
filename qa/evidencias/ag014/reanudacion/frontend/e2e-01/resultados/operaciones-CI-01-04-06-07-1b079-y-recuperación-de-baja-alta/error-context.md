# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: operaciones.spec.ts >> CI-01/04/06/07: proveedor con respuesta perdida, mismo reintento y recuperación de baja/alta
- Location: e2e\operaciones.spec.ts:66:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 11
+ Received  +  1

  Object {
-   "activo": true,
-   "actualizadoEn": "2026-10-15T19:51:44.807434Z",
-   "correoContacto": null,
-   "creadoEn": "2026-10-15T19:51:44.807434Z",
-   "denominacion": "Proveedor006 e8ae2160-6df9-4552-941e-249a759d19db",
-   "id": "0dba4f26-4ae7-400d-8f2a-07728b42f561",
-   "identificadorFiscal": "FICTICIO-e8ae2160-6df9-4552-941e-249a759d19db",
-   "paisFiscal": "ES",
-   "telefonoContacto": null,
-   "tipo": "PROFESIONAL",
-   "version": 0,
+   "error": "ACCESO_NO_PERMITIDO",
  }
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
      - link "Historial" [ref=f1e12] [cursor=pointer]:
        - /url: /historial
      - link "Mi cuenta" [ref=f1e13] [cursor=pointer]:
        - /url: /mi-cuenta
    - generic [ref=f1e14]: Entorno local
  - main [ref=f1e15]:
    - region "Operaciones seguras" [ref=f1e17]:
      - article [ref=f1e18]:
        - generic [ref=f1e19]:
          - strong [ref=f1e20]: Alta de proveedor
          - status [ref=f1e21]: Operación completada.
        - link "Abrir resultado" [ref=f1e23] [cursor=pointer]:
          - /url: /proveedores/0dba4f26-4ae7-400d-8f2a-07728b42f561
    - region [ref=f1e25]:
      - link "Volver a proveedores" [ref=f1e26] [cursor=pointer]:
        - /url: /proveedores
      - heading "Proveedor006 e8ae2160-6df9-4552-941e-249a759d19db" [active] [level=1] [ref=f1e27]
      - status
      - generic [ref=f1e28]:
        - paragraph [ref=f1e29]: Activo
        - generic [ref=f1e30]:
          - term [ref=f1e31]: Tipo
          - definition [ref=f1e32]: Profesional
          - term [ref=f1e33]: País fiscal
          - definition [ref=f1e34]: ES
          - term [ref=f1e35]: Identificador fiscal
          - definition [ref=f1e36]: FICTICIO-e8ae2160-6df9-4552-941e-249a759d19db
          - term [ref=f1e37]: Correo de contacto
          - definition [ref=f1e38]: Sin indicar
          - term [ref=f1e39]: Teléfono de contacto
          - definition [ref=f1e40]: Sin indicar
          - term [ref=f1e41]: Creación
          - definition [ref=f1e42]: 15/10/2026 21:51
          - term [ref=f1e43]: Última actualización
          - definition [ref=f1e44]: 15/10/2026 21:51
        - generic [ref=f1e45]:
          - link "Editar proveedor" [ref=f1e46] [cursor=pointer]:
            - /url: /proveedores/0dba4f26-4ae7-400d-8f2a-07728b42f561/editar
          - button "Desactivar proveedor" [ref=f1e47] [cursor=pointer]
      - region [ref=f1e49]:
        - generic [ref=f1e50]:
          - generic [ref=f1e51]:
            - paragraph [ref=f1e52]: TRAZABILIDAD
            - heading "Historial registrado" [level=2] [ref=f1e53]
          - link "Abrir historial completo" [ref=f1e54] [cursor=pointer]:
            - /url: /proveedores/0dba4f26-4ae7-400d-8f2a-07728b42f561/historial?page=0&size=20
        - paragraph [ref=f1e55]: Más recientes primero · Fechas mostradas en Europe/Madrid.
        - form "Filtros del historial" [ref=f1e56]:
          - generic [ref=f1e57]:
            - generic [ref=f1e58]:
              - text: Acción
              - combobox "Acción" [ref=f1e59]:
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
            - generic [ref=f1e60]:
              - text: Actor (UUID)
              - textbox "Actor (UUID)" [ref=f1e61]
            - generic [ref=f1e62]:
              - text: Desde (ISO con zona)
              - textbox "Desde (ISO con zona)" [ref=f1e63]:
                - /placeholder: 2026-10-15T00:00:00+02:00
            - generic [ref=f1e64]:
              - text: Hasta (ISO con zona)
              - textbox "Hasta (ISO con zona)" [ref=f1e65]:
                - /placeholder: 2026-10-15T23:59:59+02:00
            - generic [ref=f1e66]:
              - text: Eventos por página
              - combobox "Eventos por página" [ref=f1e67]:
                - option "1" [selected]
                - option "10"
                - option "20"
                - option "50"
                - option "100"
          - paragraph [ref=f1e68]: Fechas inclusivas. Indica Z para UTC o el desfase, por ejemplo +02:00.
          - generic [ref=f1e69]:
            - button "Aplicar filtros" [ref=f1e70] [cursor=pointer]
            - button "Restablecer filtros" [ref=f1e71] [cursor=pointer]
        - generic [ref=f1e72]:
          - status [ref=f1e73]: 1 eventos encontrados
          - list "Eventos del historial" [ref=f1e74]:
            - listitem [ref=f1e75]:
              - generic [ref=f1e76]:
                - heading "Proveedor creado" [level=3] [ref=f1e77]
                - time [ref=f1e78]: 15/10/2026 21:51:44
              - paragraph [ref=f1e79]: Administrador de demostración
              - paragraph [ref=f1e80]: Proveedor creado
              - generic [ref=f1e81]:
                - generic [ref=f1e82]: Sin estado anterior → ACTIVO
                - generic [ref=f1e83]: Versión — → 0
              - paragraph [ref=f1e84]: Evento de negocio
          - navigation "Paginación del historial" [ref=f1e85]:
            - button "Página anterior de eventos" [disabled] [ref=f1e86]
            - generic [ref=f1e87]: Página 1 de 1
            - button "Siguiente página de eventos" [disabled] [ref=f1e88]
          - paragraph [ref=f1e89]: Si se registran eventos nuevos durante la consulta, las páginas pueden desplazarse. Recarga para actualizar.
          - button "Actualizar historial" [ref=f1e90] [cursor=pointer]
  - contentinfo [ref=f1e91]: Gestión de Solicitudes · Espacio de trabajo
```

# Test source

```ts
  18  | } from './operaciones-ayudas';
  19  | import {
  20  |   reiniciarBackend,
  21  |   restaurarSupervisor,
  22  |   sqlFixture,
  23  |   uuidFixture,
  24  | } from './operaciones-entorno';
  25  | 
  26  | const panel = (page: Page) =>
  27  |   page.getByRole('region', { name: 'Operaciones seguras', exact: true });
  28  | function senal() {
  29  |   let resolver!: () => void;
  30  |   const promesa = new Promise<void>((resolve) => {
  31  |     resolver = resolve;
  32  |   });
  33  |   return { promesa, resolver };
  34  | }
  35  | async function recuperar(page: Page, operacion: string) {
  36  |   const consultar = panel(page).getByRole('button', {
  37  |     name: `Consultar resultado: ${operacion}`,
  38  |     exact: true,
  39  |   });
  40  |   await consultar.focus();
  41  |   await expect(consultar).toBeFocused();
  42  |   await page.keyboard.press('Enter');
  43  |   await expect(
  44  |     panel(page).getByRole('status').filter({ hasText: 'Resultado recuperado' }).last(),
  45  |   ).toBeVisible();
  46  |   await expect(
  47  |     panel(page).getByRole('link', { name: 'Abrir resultado', exact: true }).last(),
  48  |   ).toBeFocused();
  49  | }
  50  | async function captura(page: Page, nombre: string) {
  51  |   for (const ancho of [360, 768, 1440]) {
  52  |     await page.setViewportSize({ width: ancho, height: 900 });
  53  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
  54  |       true,
  55  |     );
  56  |     await page.screenshot({
  57  |       path: join(
  58  |         process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  59  |         `frontend006-${nombre}-${ancho}.png`,
  60  |       ),
  61  |       fullPage: true,
  62  |     });
  63  |   }
  64  | }
  65  | 
  66  | test('CI-01/04/06/07: proveedor con respuesta perdida, mismo reintento y recuperación de baja/alta', async ({
  67  |   page,
  68  | }) => {
  69  |   test.setTimeout(120000);
  70  |   await acceder(page, 'ADMINISTRADOR');
  71  |   await page.goto('/proveedores/nuevo');
  72  |   await expect(page.getByRole('heading', { name: 'Nuevo proveedor', exact: true })).toBeFocused();
  73  |   const marca = randomUUID();
  74  |   await rellenarProveedor(page, `Proveedor006 ${marca}`, `FICTICIO-${marca}`);
  75  |   let original!: Proveedor;
  76  |   let clave = '';
  77  |   let headers: Record<string, string> = {};
  78  |   let cuerpo: unknown;
  79  |   await page.route(
  80  |     '**/api/proveedores',
  81  |     async (ruta) => {
  82  |       if (ruta.request().method() !== 'POST') return ruta.continue();
  83  |       clave = ruta.request().headers()['idempotency-key'];
  84  |       headers = { Authorization: ruta.request().headers()['authorization'] };
  85  |       cuerpo = ruta.request().postDataJSON();
  86  |       const respuesta = await ruta.fetch();
  87  |       expect(respuesta.status()).toBe(201);
  88  |       original = (await respuesta.json()) as Proveedor;
  89  |       await ruta.abort('failed');
  90  |     },
  91  |     { times: 1 },
  92  |   );
  93  |   await page.getByRole('button', { name: 'Guardar proveedor', exact: true }).click();
  94  |   await expect(panel(page).getByRole('status')).toContainText('pendiente');
  95  |   expect((await descriptores(page))[0].clave).toBe(clave);
  96  |   await verificarAlmacenamientoOperaciones(page);
  97  |   await captura(page, 'proveedor-pendiente');
  98  |   const repetida = page.waitForResponse(
  99  |     (respuesta) =>
  100 |       respuesta.request().method() === 'POST' &&
  101 |       new URL(respuesta.url()).pathname === '/api/proveedores',
  102 |   );
  103 |   await page.getByRole('button', { name: 'Guardar proveedor', exact: true }).click();
  104 |   const respuesta = await repetida;
  105 |   expect(respuesta.request().headers()['idempotency-key']).toBe(clave);
  106 |   expect(await respuesta.json()).toEqual(original);
  107 |   await expect(page).toHaveURL(new RegExp(`/proveedores/${original.id}$`));
  108 |   expect(await descriptores(page)).toEqual([]);
  109 |   const lista = await page.request.get(
  110 |     `/api/proveedores?denominacion=${encodeURIComponent(`Proveedor006 ${marca}`)}`,
  111 |     { headers },
  112 |   );
  113 |   expect(((await lista.json()) as { totalElementos: number }).totalElementos).toBe(1);
  114 |   const replay = await page.request.post('/api/proveedores', {
  115 |     headers: await escritura(page.request, headers, clave),
  116 |     data: cuerpo,
  117 |   });
> 118 |   expect(await replay.json()).toEqual(original);
      |                               ^ Error: expect(received).toEqual(expected) // deep equality
  119 |   for (const [accion, etiqueta, estado] of [
  120 |     ['desactivar', 'Desactivar proveedor', 'Inactivo'],
  121 |     ['reactivar', 'Reactivar proveedor', 'Activo'],
  122 |   ] as const) {
  123 |     await page.route(
  124 |       `**/api/proveedores/${original.id}/${accion}`,
  125 |       async (ruta) => {
  126 |         expect(ruta.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
  127 |         expect((await ruta.fetch()).status()).toBe(200);
  128 |         await ruta.abort('failed');
  129 |       },
  130 |       { times: 1 },
  131 |     );
  132 |     await page.getByRole('button', { name: etiqueta, exact: true }).click();
  133 |     await expect(panel(page).locator('[data-estado=PENDIENTE]')).toHaveCount(1);
  134 |     await recuperar(
  135 |       page,
  136 |       accion === 'desactivar' ? 'Desactivación de proveedor' : 'Reactivación de proveedor',
  137 |     );
  138 |     await page.reload();
  139 |     await expect(page.locator('app-proveedor-detalle .estado')).toHaveText(estado);
  140 |     expect(await descriptores(page)).toEqual([]);
  141 |   }
  142 | });
  143 | 
  144 | for (const tipo of ['proveedor', 'solicitud'] as const) {
  145 |   test(`CI-04/07: alta de ${tipo} confirmada después del error bloquea el formulario anterior y permite una intención nueva`, async ({
  146 |     page,
  147 |     context,
  148 |   }) => {
  149 |     test.setTimeout(120000);
  150 |     const proveedor = tipo === 'proveedor';
  151 |     const endpoint = proveedor ? '/api/proveedores' : '/api/solicitudes';
  152 |     const rutaNueva = proveedor ? '/proveedores/nuevo' : '/solicitudes/nueva';
  153 |     const operacion = proveedor ? 'Alta de proveedor' : 'Alta de solicitud';
  154 |     const guardar = () =>
  155 |       page.getByRole('button', {
  156 |         name: proveedor ? 'Guardar proveedor' : 'Crear borrador',
  157 |         exact: true,
  158 |       });
  159 |     await acceder(page, proveedor ? 'ADMINISTRADOR' : 'SOLICITANTE');
  160 |     let enviados = 0;
  161 |     page.on('request', (peticion) => {
  162 |       if (peticion.method() === 'POST' && new URL(peticion.url()).pathname === endpoint) enviados++;
  163 |     });
  164 |     for (const modo of ['manual', 'otra-pestana'] as const) {
  165 |       await page.goto(rutaNueva);
  166 |       const marca = randomUUID();
  167 |       const nombre = `Intención006 ${tipo} ${marca}`;
  168 |       if (proveedor) await rellenarProveedor(page, nombre, `FICTICIO-${marca}`);
  169 |       else await page.getByLabel('Asunto *', { exact: false }).fill(nombre);
  170 |       let original!: { id: string };
  171 |       let clave = '';
  172 |       await page.route(
  173 |         `**${endpoint}`,
  174 |         async (ruta) => {
  175 |           if (ruta.request().method() !== 'POST') return ruta.continue();
  176 |           clave = ruta.request().headers()['idempotency-key'];
  177 |           const respuesta = await ruta.fetch();
  178 |           expect(respuesta.status()).toBe(201);
  179 |           original = await respuesta.json();
  180 |           await ruta.abort('failed');
  181 |         },
  182 |         { times: 1 },
  183 |       );
  184 |       const antes = enviados;
  185 |       await guardar().click();
  186 |       await expect(panel(page).locator('[data-estado=PENDIENTE]')).toHaveCount(1);
  187 |       await expect(guardar()).toBeEnabled();
  188 |       if (modo === 'manual') await recuperar(page, operacion);
  189 |       else {
  190 |         const segunda = await context.newPage();
  191 |         await segunda.goto('/mi-cuenta');
  192 |         await expect(panel(segunda).getByRole('status')).toContainText('Resultado recuperado');
  193 |         await expect(panel(page).getByRole('status')).toContainText('Resultado recuperado');
  194 |         await segunda.close();
  195 |       }
  196 |       await expect(guardar()).toBeDisabled();
  197 |       const enlace = page.locator('a.resultado-alta');
  198 |       await expect(enlace).toHaveAttribute('href', `${endpoint.slice(4)}/${original.id}`);
  199 |       if (proveedor)
  200 |         await page
  201 |           .getByLabel('Identificador fiscal *', { exact: false })
  202 |           .fill(`OTRO-${randomUUID()}`);
  203 |       else
  204 |         await page
  205 |           .getByLabel('Asunto *', { exact: false })
  206 |           .fill(`Entrada distinta ${randomUUID()}`);
  207 |       await page.locator('form').dispatchEvent('submit');
  208 |       await expect(guardar()).toBeDisabled();
  209 |       expect(enviados).toBe(antes + 1);
  210 |       expect(await descriptores(page)).toEqual([]);
  211 |       await captura(page, `alta-${tipo}-${modo}-confirmada`);
  212 |       await enlace.click();
  213 |       await page
  214 |         .getByRole('link', {
  215 |           name: proveedor ? 'Volver a proveedores' : 'Volver a solicitudes',
  216 |           exact: true,
  217 |         })
  218 |         .click();
```