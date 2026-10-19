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
  128 |       const catalogoProveedor = a.waitForResponse((r) => r.url().includes('/api/proveedores?'));
  129 |       await a.getByRole('button', { name: 'Buscar proveedor', exact: true }).click();
  130 |       expect((await catalogoProveedor).status()).toBe(200);
  131 |       await expect(a.getByLabel('Proveedor', { exact: true })).toBeEnabled();
  132 |       await expect(a.locator('#proveedor-seleccion option').nth(1)).toBeAttached();
  133 |       await a.getByLabel('Proveedor', { exact: true }).selectOption({ index: 1 });
  134 |       await expect(a.getByLabel('Proveedor', { exact: true })).toHaveValue(/^[0-9a-f-]{36}$/);
  135 |       const catalogoSupervisor = a.waitForResponse((r) =>
  136 |         r.url().includes('/api/identidad/supervisores?'),
  137 |       );
  138 |       await a.getByRole('button', { name: 'Buscar supervisor', exact: true }).click();
  139 |       expect((await catalogoSupervisor).status()).toBe(200);
  140 |       await expect(a.getByLabel('Supervisor', { exact: true })).toBeEnabled();
  141 |       await expect(a.locator('#supervisor-seleccion option').nth(1)).toBeAttached();
  142 |       await a.getByLabel('Supervisor', { exact: true }).selectOption({ index: 1 });
  143 |       await expect(a.getByLabel('Supervisor', { exact: true })).toHaveValue(/^[0-9a-f-]{36}$/);
  144 |       await a.getByRole('button', { name: 'Añadir concepto', exact: true }).click();
  145 |       await a
  146 |         .getByLabel('Descripción del concepto 1', { exact: true })
  147 |         .fill('Material de prueba ficticio');
  148 |       await a.getByLabel('Cantidad del concepto 1', { exact: true }).fill('2');
  149 |       await a.getByLabel('Precio unitario del concepto 1', { exact: true }).fill('12.50');
  150 |       await a.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  151 |       await expect(a).toHaveURL(new RegExp(`${rutaSolicitud}$`));
  152 |       await a.getByRole('button', { name: 'Presentar solicitud', exact: true }).click();
  153 |       await a.getByRole('button', { name: 'Confirmar y presentar', exact: true }).click();
> 154 |       await expect(a.locator('.estado').first()).toHaveText('Presentada');
      |                                                  ^ Error: expect(locator).toHaveText(expected) failed
  155 |     });
  156 | 
  157 |     await test.step('cambio de rol rota sesión y supervisor decide', async () => {
  158 |       const supervisor = await entrar(a, 'SUPERVISOR');
  159 |       expect(supervisor.usuario.roles).toEqual(['SUPERVISOR']);
  160 |       const antiguo = await contextos[0].request.get('/api/identidad/yo', {
  161 |         headers: {
  162 |           Authorization: `Bearer ${solicitante.accessToken}`,
  163 |           'X-Demo-Contexto': selector(reservas[0]),
  164 |         },
  165 |       });
  166 |       expect(antiguo.status()).toBe(401);
  167 |       await a.getByRole('link', { name: asunto, exact: true }).click();
  168 |       await a.getByRole('button', { name: 'Aprobar solicitud', exact: true }).click();
  169 |       await a.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  170 |       await a.getByRole('button', { name: 'Confirmar aprobación', exact: true }).click();
  171 |       await expect(a.locator('.estado').first()).toHaveText('Aprobada');
  172 |     });
  173 | 
  174 |     await test.step('auditor solo consulta su espacio y otra reserva no puede leer la solicitud', async () => {
  175 |       const auditor = await entrar(a, 'AUDITOR');
  176 |       expect(auditor.usuario.roles).toEqual(['AUDITOR']);
  177 |       await expect(a.locator('.estado-consulta')).toContainText('eventos encontrados');
  178 |       await a.reload();
  179 |       await expect(a).toHaveURL(/\/historial$/);
  180 |       await expect(a.locator('.estado-consulta')).toContainText('eventos encontrados');
  181 |       const auditorB = await entrar(b, 'AUDITOR');
  182 |       const ajena = await contextos[1].request.get(`/api${rutaSolicitud}`, {
  183 |         headers: {
  184 |           Authorization: `Bearer ${auditorB.accessToken}`,
  185 |           'X-Demo-Contexto': selector(reservas[1]),
  186 |         },
  187 |       });
  188 |       expect(ajena.status()).toBe(404);
  189 |       const manipulado = await contextos[1].request.get('/api/identidad/yo', {
  190 |         headers: {
  191 |           Authorization: `Bearer ${auditorB.accessToken}`,
  192 |           'X-Demo-Contexto': selector(reservas[0]),
  193 |         },
  194 |       });
  195 |       expect(manipulado.status()).toBe(401);
  196 |       const sinContexto = await contextos[1].request.get('/api/identidad/yo', {
  197 |         headers: {
  198 |           Authorization: `Bearer ${auditorB.accessToken}`,
  199 |         },
  200 |       });
  201 |       expect(sinContexto.status()).toBe(401);
  202 |     });
  203 | 
  204 |     await test.step('una pestaña antigua no adopta una cookie de otra reserva', async () => {
  205 |       const cookiesA = await contextos[0].cookies();
  206 |       const cookiesB = await contextos[1].cookies();
  207 |       const cookieAjena = cookiesB.find((cookie) => cookie.name === 'DEMO-RESERVA')!;
  208 |       await contextos[0].addCookies([cookieAjena]);
  209 |       await a.getByRole('link', { name: 'Demo', exact: true }).click();
  210 |       await expect(
  211 |         a.getByRole('button', { name: 'Reservar mi espacio', exact: true }),
  212 |       ).toBeVisible();
  213 |       expect(
  214 |         await a.evaluate((clave) => sessionStorage.getItem(clave) === null, claveContexto),
  215 |       ).toBe(true);
  216 |       await expect(
  217 |         a.getByRole('button', { name: 'Entrar como auditor', exact: true }),
  218 |       ).toBeDisabled();
  219 |       await contextos[0].addCookies(cookiesA);
  220 |     });
  221 | 
  222 |     for (let i = 0; i < reservas.length; i++) await liberar(contextos[i], reservas[i]);
  223 |   } finally {
  224 |     for (const contexto of contextos) await contexto.close();
  225 |   }
  226 | });
  227 | 
```