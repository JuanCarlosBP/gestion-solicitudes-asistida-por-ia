# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demo-aislamiento.spec.ts >> 008: tres espacios exclusivos, recorrido real por roles, cuarto visitante y pestaña antigua
- Location: e2e\demo-aislamiento.spec.ts:52:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('.estado').first()
Expected: "Presentada"
Received: "Borrador"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" locator('.estado').first() with timeout 5000ms
  - waiting for locator('.estado').first()
    14 × locator resolved to <span class="estado" _ngcontent-ng-c2404591878="">Borrador</span>
       - unexpected value "Borrador"

```

```yaml
- text: Borrador
```

# Test source

```ts
  44  |   await contexto.request.get('/api/autenticacion/csrf');
  45  |   const csrf = (await contexto.cookies()).find((c) => c.name === 'XSRF-TOKEN')?.value ?? '';
  46  |   const resultado = await contexto.request.post('/api/demo/reserva/liberar', {
  47  |     headers: { 'X-Demo-Contexto': selector(reserva), 'X-XSRF-TOKEN': decodeURIComponent(csrf) },
  48  |   });
  49  |   expect(resultado.status()).toBe(204);
  50  | }
  51  | 
  52  | test('008: tres espacios exclusivos, recorrido real por roles, cuarto visitante y pestaña antigua', async ({
  53  |   browser,
  54  |   baseURL,
  55  | }) => {
  56  |   test.setTimeout(180000);
  57  |   const contextos: BrowserContext[] = [];
  58  |   const reservas: ReservaDemo[] = [];
  59  |   const paginas: Page[] = [];
  60  |   const asunto = `Demo008 ficticia ${randomUUID()}`;
  61  |   let rutaSolicitud = '';
  62  |   let solicitante: Acceso;
  63  |   try {
  64  |     for (let i = 0; i < 4; i++) {
  65  |       const contexto = await browser.newContext({ baseURL });
  66  |       contextos.push(contexto);
  67  |       paginas.push(await contexto.newPage());
  68  |     }
  69  |     const [a, b, c, cuarto] = paginas;
  70  |     await test.step('tres reservas separadas y cuarto visitante recibe cupo ocupado', async () => {
  71  |       reservas.push(await reservar(a), await reservar(b), await reservar(c));
  72  |       expect(new Set(reservas.map((r) => r.espacio)).size).toBe(3);
  73  |       expect(new Set(reservas.map((r) => r.reservaId)).size).toBe(3);
  74  |       await cuarto.goto('/demo');
  75  |       const respuesta = cuarto.waitForResponse((r) => r.url().endsWith('/api/demo/reservas'));
  76  |       await cuarto.getByRole('button', { name: 'Reservar mi espacio', exact: true }).click();
  77  |       expect((await respuesta).status()).toBe(409);
  78  |       await expect(cuarto.getByRole('alert')).toContainText('Todos los espacios están ocupados');
  79  |       await expect(
  80  |         cuarto.getByRole('button', { name: 'Entrar como solicitante', exact: true }),
  81  |       ).toBeDisabled();
  82  |       expect(
  83  |         await cuarto.evaluate((clave) => sessionStorage.getItem(clave) === null, claveContexto),
  84  |       ).toBe(true);
  85  |     });
  86  | 
  87  |     await test.step('presentación usable en móvil, guías de cuatro pasos y sin credenciales almacenadas', async () => {
  88  |       await a.setViewportSize({ width: 390, height: 844 });
  89  |       expect(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  90  |       await expect(a.locator('.guia')).toHaveCount(3);
  91  |       await expect(a.locator('.guia li')).toHaveCount(12);
  92  |       await a.screenshot({
  93  |         path: join(process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results', 'frontend-demo-movil.png'),
  94  |         fullPage: true,
  95  |       });
  96  |       await a.setViewportSize({ width: 1280, height: 900 });
  97  |       await a.screenshot({
  98  |         path: join(
  99  |           process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  100 |           'frontend-demo-escritorio.png',
  101 |         ),
  102 |         fullPage: true,
  103 |       });
  104 |       const cookies = await contextos[0].cookies();
  105 |       const reserva = cookies.find((cookie) => cookie.name === 'DEMO-RESERVA');
  106 |       expect(
  107 |         Boolean(reserva?.httpOnly && reserva.sameSite === 'Strict' && reserva.path === '/api'),
  108 |       ).toBe(true);
  109 |       expect(
  110 |         await a.evaluate((clave) => {
  111 |           const publico = JSON.parse(sessionStorage.getItem(clave)!);
  112 |           return (
  113 |             Object.keys(publico).sort().join(',') === 'espacio,expiraEn,generacion,reservaId' &&
  114 |             !document.cookie.includes('DEMO-RESERVA')
  115 |           );
  116 |         }, claveContexto),
  117 |       ).toBe(true);
  118 |     });
  119 | 
  120 |     await test.step('solicitante crea, edita y presenta con catálogo preparado', async () => {
  121 |       solicitante = await entrar(a, 'SOLICITANTE');
  122 |       expect(solicitante.usuario.roles).toEqual(['SOLICITANTE']);
  123 |       await a.getByRole('link', { name: 'Nueva solicitud', exact: true }).click();
  124 |       await a.getByLabel('Asunto *', { exact: true }).fill(asunto);
  125 |       await a.getByRole('button', { name: 'Crear borrador', exact: true }).click();
  126 |       await expect(a).toHaveURL(/\/solicitudes\/[0-9a-f-]{36}\/editar$/);
  127 |       rutaSolicitud = new URL(a.url()).pathname.replace(/\/editar$/, '');
  128 |       await a.getByRole('button', { name: 'Buscar proveedor', exact: true }).click();
  129 |       await expect(a.locator('#proveedor-seleccion option').nth(1)).toBeAttached();
  130 |       await a.getByLabel('Proveedor', { exact: true }).selectOption({ index: 1 });
  131 |       await a.getByRole('button', { name: 'Buscar supervisor', exact: true }).click();
  132 |       await expect(a.locator('#supervisor-seleccion option').nth(1)).toBeAttached();
  133 |       await a.getByLabel('Supervisor', { exact: true }).selectOption({ index: 1 });
  134 |       await a.getByRole('button', { name: 'Añadir concepto', exact: true }).click();
  135 |       await a
  136 |         .getByLabel('Descripción del concepto 1', { exact: true })
  137 |         .fill('Material de prueba ficticio');
  138 |       await a.getByLabel('Cantidad del concepto 1', { exact: true }).fill('2');
  139 |       await a.getByLabel('Precio unitario del concepto 1', { exact: true }).fill('12.50');
  140 |       await a.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  141 |       await expect(a).toHaveURL(new RegExp(`${rutaSolicitud}$`));
  142 |       await a.getByRole('button', { name: 'Presentar solicitud', exact: true }).click();
  143 |       await a.getByRole('button', { name: 'Confirmar y presentar', exact: true }).click();
> 144 |       await expect(a.locator('.estado').first()).toHaveText('Presentada');
      |                                                  ^ Error: expect(locator).toHaveText(expected) failed
  145 |     });
  146 | 
  147 |     await test.step('cambio de rol rota sesión y supervisor decide', async () => {
  148 |       const supervisor = await entrar(a, 'SUPERVISOR');
  149 |       expect(supervisor.usuario.roles).toEqual(['SUPERVISOR']);
  150 |       const antiguo = await contextos[0].request.get('/api/identidad/yo', {
  151 |         headers: {
  152 |           Authorization: `Bearer ${solicitante.accessToken}`,
  153 |           'X-Demo-Contexto': selector(reservas[0]),
  154 |         },
  155 |       });
  156 |       expect(antiguo.status()).toBe(401);
  157 |       await a.getByRole('link', { name: asunto, exact: true }).click();
  158 |       await a.getByRole('button', { name: 'Aprobar solicitud', exact: true }).click();
  159 |       await a.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  160 |       await a.getByRole('button', { name: 'Confirmar aprobación', exact: true }).click();
  161 |       await expect(a.locator('.estado').first()).toHaveText('Aprobada');
  162 |     });
  163 | 
  164 |     await test.step('auditor solo consulta su espacio y otra reserva no puede leer la solicitud', async () => {
  165 |       const auditor = await entrar(a, 'AUDITOR');
  166 |       expect(auditor.usuario.roles).toEqual(['AUDITOR']);
  167 |       await expect(a.locator('.estado-consulta')).toContainText('eventos encontrados');
  168 |       await a.reload();
  169 |       await expect(a).toHaveURL(/\/historial$/);
  170 |       await expect(a.locator('.estado-consulta')).toContainText('eventos encontrados');
  171 |       const auditorB = await entrar(b, 'AUDITOR');
  172 |       const ajena = await contextos[1].request.get(`/api${rutaSolicitud}`, {
  173 |         headers: {
  174 |           Authorization: `Bearer ${auditorB.accessToken}`,
  175 |           'X-Demo-Contexto': selector(reservas[1]),
  176 |         },
  177 |       });
  178 |       expect(ajena.status()).toBe(404);
  179 |       const manipulado = await contextos[1].request.get('/api/identidad/yo', {
  180 |         headers: {
  181 |           Authorization: `Bearer ${auditorB.accessToken}`,
  182 |           'X-Demo-Contexto': selector(reservas[0]),
  183 |         },
  184 |       });
  185 |       expect(manipulado.status()).toBe(401);
  186 |       const sinContexto = await contextos[1].request.get('/api/identidad/yo', {
  187 |         headers: {
  188 |           Authorization: `Bearer ${auditorB.accessToken}`,
  189 |         },
  190 |       });
  191 |       expect(sinContexto.status()).toBe(401);
  192 |     });
  193 | 
  194 |     await test.step('una pestaña antigua no adopta una cookie de otra reserva', async () => {
  195 |       const cookiesA = await contextos[0].cookies();
  196 |       const cookiesB = await contextos[1].cookies();
  197 |       const cookieAjena = cookiesB.find((cookie) => cookie.name === 'DEMO-RESERVA')!;
  198 |       await contextos[0].addCookies([cookieAjena]);
  199 |       await a.getByRole('link', { name: 'Demo', exact: true }).click();
  200 |       await expect(
  201 |         a.getByRole('button', { name: 'Reservar mi espacio', exact: true }),
  202 |       ).toBeVisible();
  203 |       expect(
  204 |         await a.evaluate((clave) => sessionStorage.getItem(clave) === null, claveContexto),
  205 |       ).toBe(true);
  206 |       await expect(
  207 |         a.getByRole('button', { name: 'Entrar como auditor', exact: true }),
  208 |       ).toBeDisabled();
  209 |       await contextos[0].addCookies(cookiesA);
  210 |     });
  211 | 
  212 |     for (let i = 0; i < reservas.length; i++) await liberar(contextos[i], reservas[i]);
  213 |   } finally {
  214 |     for (const contexto of contextos) await contexto.close();
  215 |   }
  216 | });
  217 | 
```