# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: solicitudes.spec.ts >> SCI-01–13: trece pasos completos con Angular, API y PostgreSQL reales
- Location: e2e\solicitudes.spec.ts:107:5

# Error details

```
Error: El coordinador prepara un SOLICITANTE ajeno ficticio antes de ejecutar

expect(received).toBeTruthy()

Received: undefined
```

# Test source

```ts
  17  |   await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  18  |   await expect(page).toHaveURL(/\/mi-cuenta$/);
  19  | }
  20  | async function csrf(api: APIRequestContext): Promise<string> {
  21  |   const cookies = (await api.storageState()).cookies;
  22  |   return decodeURIComponent(cookies.find((c) => c.name === 'XSRF-TOKEN')?.value ?? '');
  23  | }
  24  | async function cabecerasEscritura(api: APIRequestContext, cabeceras: Record<string, string>) {
  25  |   // Una respuesta de autenticación puede rotar la cookie entre operaciones.
  26  |   // El CSRF se obtiene de la cookie vigente; identidad e idempotencia se conservan.
  27  |   return { ...cabeceras, 'X-XSRF-TOKEN': await csrf(api) };
  28  | }
  29  | async function sesionApi(rol: RolDemo) {
  30  |   const api = await request.newContext({ baseURL });
  31  |   await api.get('/api/autenticacion/csrf');
  32  |   const respuesta = await api.post('/api/autenticacion/iniciar-sesion', {
  33  |     data: { correo: correoRol(rol), contrasena: claveRol(rol) },
  34  |     headers: { 'X-XSRF-TOKEN': await csrf(api) },
  35  |   });
  36  |   expect(respuesta.status()).toBe(200);
  37  |   const acceso = (await respuesta.json()) as {
  38  |     accessToken: string;
  39  |     usuario: { id: string; nombreVisible: string };
  40  |   };
  41  |   return {
  42  |     api,
  43  |     usuario: acceso.usuario,
  44  |     headers: { Authorization: `Bearer ${acceso.accessToken}` },
  45  |   };
  46  | }
  47  | async function captura(page: Page, pantalla: string, ancho: number) {
  48  |   await page.setViewportSize({ width: ancho, height: 900 });
  49  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  50  |   await page.screenshot({
  51  |     path: join(
  52  |       process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  53  |       `frontend-solicitudes-${pantalla}-${ancho}.png`,
  54  |     ),
  55  |     fullPage: true,
  56  |   });
  57  | }
  58  | async function concepto(
  59  |   page: Page,
  60  |   indice: number,
  61  |   descripcion: string,
  62  |   cantidad: string,
  63  |   precio: string,
  64  | ) {
  65  |   await page.getByRole('button', { name: 'Añadir concepto', exact: true }).click();
  66  |   await page.getByLabel(`Descripción del concepto ${indice}`, { exact: true }).fill(descripcion);
  67  |   await page.getByLabel(`Cantidad del concepto ${indice}`, { exact: true }).fill(cantidad);
  68  |   await page.getByLabel(`Precio unitario del concepto ${indice}`, { exact: true }).fill(precio);
  69  | }
  70  | async function recorrerEditorConTeclado(page: Page, ancho: number) {
  71  |   await page.setViewportSize({ width: ancho, height: 900 });
  72  |   await expect(page.locator('.barra-resumen')).toHaveCSS('position', 'sticky');
  73  |   await page.getByRole('heading', { name: 'Editar borrador', exact: true }).focus();
  74  |   let controles = 0;
  75  |   let fin = false;
  76  |   for (let paso = 0; paso < 80; paso++) {
  77  |     await page.keyboard.press('Tab');
  78  |     const dato = await page.evaluate(() => {
  79  |       const control = document.activeElement as HTMLElement;
  80  |       const rectangulo = control.getBoundingClientRect();
  81  |       const superior = document.elementFromPoint(
  82  |         rectangulo.x + rectangulo.width / 2,
  83  |         rectangulo.y + rectangulo.height / 2,
  84  |       );
  85  |       return {
  86  |         etiqueta: control.getAttribute('aria-label') || control.id || control.textContent?.trim(),
  87  |         centroVisible: !!superior && (control === superior || control.contains(superior)),
  88  |         tipo: control.tagName,
  89  |         fin: control.tagName === 'A' && control.textContent?.trim() === 'Cancelar y volver',
  90  |       };
  91  |     });
  92  |     expect(
  93  |       dato.centroVisible,
  94  |       `${ancho}px, Tab ${paso}: ${dato.etiqueta} debe quedar visible sobre la barra`,
  95  |     ).toBe(true);
  96  |     expect(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A']).toContain(dato.tipo);
  97  |     controles++;
  98  |     if (dato.fin) {
  99  |       fin = true;
  100 |       break;
  101 |     }
  102 |   }
  103 |   expect(fin, 'La navegación llega a la última acción del editor').toBe(true);
  104 |   expect(controles).toBeGreaterThanOrEqual(20);
  105 | }
  106 | 
  107 | test('SCI-01–13: trece pasos completos con Angular, API y PostgreSQL reales', async ({
  108 |   page,
  109 |   context,
  110 |   browser,
  111 | }) => {
  112 |   test.setTimeout(180000);
  113 |   const ajenoCorreo = process.env['E2E_AJENO_CORREO'];
  114 |   expect(
  115 |     ajenoCorreo,
  116 |     'El coordinador prepara un SOLICITANTE ajeno ficticio antes de ejecutar',
> 117 |   ).toBeTruthy();
      |     ^ Error: El coordinador prepara un SOLICITANTE ajeno ficticio antes de ejecutar
  118 |   const marca = randomUUID();
  119 |   const asunto = `Solicitud E2E ${marca}`;
  120 |   const admin = await sesionApi('ADMINISTRADOR');
  121 |   const supervisor = await sesionApi('SUPERVISOR');
  122 |   let proveedorId = '';
  123 |   let ruta = '';
  124 |   let numero = '';
  125 |   let clavePresentacion = '';
  126 |   let versionPresentada = 0;
  127 |   let cabecerasPresentacion: Record<string, string> = {};
  128 |   let resultadoPresentacion: Record<string, unknown> = {};
  129 |   let escrituras = 0;
  130 |   let escriturasSinProteccion = 0;
  131 |   page.on('request', (peticion) => {
  132 |     if (
  133 |       new URL(peticion.url()).pathname.startsWith('/api/solicitudes') &&
  134 |       ['POST', 'PUT'].includes(peticion.method())
  135 |     ) {
  136 |       escrituras++;
  137 |       if (
  138 |         !peticion.headers()['authorization']?.startsWith('Bearer ') ||
  139 |         !peticion.headers()['x-xsrf-token']
  140 |       )
  141 |         escriturasSinProteccion++;
  142 |     }
  143 |   });
  144 |   try {
  145 |     const altaProveedor = await admin.api.post('/api/proveedores', {
  146 |       headers: await cabecerasEscritura(admin.api, {
  147 |         ...admin.headers,
  148 |         'Idempotency-Key': randomUUID(),
  149 |       }),
  150 |       data: {
  151 |         tipo: 'PROFESIONAL',
  152 |         denominacion: `Proveedor E2E ${marca}`,
  153 |         paisFiscal: 'ES',
  154 |         identificadorFiscal: `FICTICIO-${marca}`,
  155 |         correoContacto: null,
  156 |         telefonoContacto: null,
  157 |       },
  158 |     });
  159 |     expect(altaProveedor.status()).toBe(201);
  160 |     proveedorId = ((await altaProveedor.json()) as { id: string }).id;
  161 | 
  162 |     await test.step('01 SOLICITANTE crea borrador solo con asunto', async () => {
  163 |       await acceder(page, 'SOLICITANTE');
  164 |       await page.getByRole('link', { name: 'Solicitudes', exact: true }).click();
  165 |       await page.getByRole('link', { name: 'Nueva solicitud', exact: true }).click();
  166 |       await expect(
  167 |         page.getByRole('heading', { name: 'Nueva solicitud', exact: true }),
  168 |       ).toBeFocused();
  169 |       await page.getByLabel('Asunto *', { exact: true }).fill(asunto);
  170 |       await page.getByRole('button', { name: 'Crear borrador', exact: true }).click();
  171 |       await expect(page).toHaveURL(/\/solicitudes\/[0-9a-f-]{36}\/editar$/);
  172 |       ruta = new URL(page.url()).pathname.replace(/\/editar$/, '');
  173 |       await expect(
  174 |         page.getByRole('heading', { name: 'Editar borrador', exact: true }),
  175 |       ).toBeFocused();
  176 |       await expect(page.locator('.importe-estimado')).toHaveText('0,00 €');
  177 |     });
  178 |     await test.step('02 Añade los tres conceptos obligatorios', async () => {
  179 |       await concepto(page, 1, 'Material ficticio', '1', '10.0000');
  180 |       await concepto(page, 2, 'Servicio ficticio', '2.500', '4.1250');
  181 |       await concepto(page, 3, 'Suministro ficticio', '3', '0.3350');
  182 |       await page.getByLabel('Unidad del concepto 2', { exact: true }).selectOption('HORA');
  183 |       await page
  184 |         .getByLabel('Descripción', { exact: true })
  185 |         .fill('Datos ficticios para comprobar el recorrido completo.');
  186 |     });
  187 |     await test.step('03 Estimación HALF_UP por línea y total 21,32 EUR', async () => {
  188 |       await expect(page.locator('.importe-estimado')).toHaveText('21,32 €');
  189 |       await expect(page.locator('.importe-linea strong')).toHaveText([
  190 |         '10,00 €',
  191 |         '10,31 €',
  192 |         '1,01 €',
  193 |       ]);
  194 |       for (const ancho of [360, 768, 1440]) await captura(page, 'editor', ancho);
  195 |       // R004-UI03: no se fuerza scroll desde la prueba; solo Tab y navegación nativa.
  196 |       for (const ancho of [768, 1440]) await recorrerEditorConTeclado(page, ancho);
  197 |     });
  198 |     await test.step('04 Guarda, confirma total del servidor y recarga', async () => {
  199 |       await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  200 |       await expect(page).toHaveURL((url) => url.pathname === ruta);
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
```