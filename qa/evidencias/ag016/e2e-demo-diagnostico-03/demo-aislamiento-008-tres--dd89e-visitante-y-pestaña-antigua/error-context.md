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
  90  |             'ERROR_NO_CLASIFICADO',
  91  |         });
  92  |       });
  93  |       pagina.on('request', (peticion) => {
  94  |         if (
  95  |           peticion.method() !== 'PUT' ||
  96  |           !/\/api\/solicitudes\/[0-9a-f-]{36}$/.test(peticion.url())
  97  |         )
  98  |           return;
  99  |         const datos = peticion.postDataJSON() as Record<string, unknown>;
  100 |         diagnostico.push({
  101 |           tipo: 'put-borrador-campos',
  102 |           visitante: i,
  103 |           proveedorPresente: Object.hasOwn(datos, 'proveedorId'),
  104 |           proveedorEsUuid:
  105 |             typeof datos['proveedorId'] === 'string' &&
  106 |             /^[0-9a-f-]{36}$/.test(datos['proveedorId']),
  107 |           proveedorEsNull: datos['proveedorId'] === null,
  108 |           supervisorPresente: Object.hasOwn(datos, 'supervisorId'),
  109 |           supervisorEsUuid:
  110 |             typeof datos['supervisorId'] === 'string' &&
  111 |             /^[0-9a-f-]{36}$/.test(datos['supervisorId']),
  112 |           supervisorEsNull: datos['supervisorId'] === null,
  113 |           conceptosCantidad: Array.isArray(datos['conceptos']) ? datos['conceptos'].length : null,
  114 |         });
  115 |       });
  116 |       paginas.push(pagina);
  117 |     }
  118 |     const [a, b, c, cuarto] = paginas;
  119 |     await test.step('tres reservas separadas y cuarto visitante recibe cupo ocupado', async () => {
  120 |       reservas.push(await reservar(a), await reservar(b), await reservar(c));
  121 |       expect(new Set(reservas.map((r) => r.espacio)).size).toBe(3);
  122 |       expect(new Set(reservas.map((r) => r.reservaId)).size).toBe(3);
  123 |       await cuarto.goto('/demo');
  124 |       const respuesta = cuarto.waitForResponse((r) => r.url().endsWith('/api/demo/reservas'));
  125 |       await cuarto.getByRole('button', { name: 'Reservar mi espacio', exact: true }).click();
  126 |       expect((await respuesta).status()).toBe(409);
  127 |       await expect(cuarto.getByRole('alert')).toContainText('Todos los espacios están ocupados');
  128 |       await expect(
  129 |         cuarto.getByRole('button', { name: 'Entrar como solicitante', exact: true }),
  130 |       ).toBeDisabled();
  131 |       expect(
  132 |         await cuarto.evaluate((clave) => sessionStorage.getItem(clave) === null, claveContexto),
  133 |       ).toBe(true);
  134 |     });
  135 | 
  136 |     await test.step('presentación usable en móvil, guías de cuatro pasos y sin credenciales almacenadas', async () => {
  137 |       await a.setViewportSize({ width: 390, height: 844 });
  138 |       expect(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  139 |       await expect(a.locator('.guia')).toHaveCount(3);
  140 |       await expect(a.locator('.guia li')).toHaveCount(12);
  141 |       await a.screenshot({
  142 |         path: join(process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results', 'frontend-demo-movil.png'),
  143 |         fullPage: true,
  144 |       });
  145 |       await a.setViewportSize({ width: 1280, height: 900 });
  146 |       await a.screenshot({
  147 |         path: join(
  148 |           process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  149 |           'frontend-demo-escritorio.png',
  150 |         ),
  151 |         fullPage: true,
  152 |       });
  153 |       const cookies = await contextos[0].cookies();
  154 |       const reserva = cookies.find((cookie) => cookie.name === 'DEMO-RESERVA');
  155 |       expect(
  156 |         Boolean(reserva?.httpOnly && reserva.sameSite === 'Strict' && reserva.path === '/api'),
  157 |       ).toBe(true);
  158 |       expect(
  159 |         await a.evaluate((clave) => {
  160 |           const publico = JSON.parse(sessionStorage.getItem(clave)!);
  161 |           return (
  162 |             Object.keys(publico).sort().join(',') === 'espacio,expiraEn,generacion,reservaId' &&
  163 |             !document.cookie.includes('DEMO-RESERVA')
  164 |           );
  165 |         }, claveContexto),
  166 |       ).toBe(true);
  167 |     });
  168 | 
  169 |     await test.step('solicitante crea, edita y presenta con catálogo preparado', async () => {
  170 |       solicitante = await entrar(a, 'SOLICITANTE');
  171 |       expect(solicitante.usuario.roles).toEqual(['SOLICITANTE']);
  172 |       await a.getByRole('link', { name: 'Nueva solicitud', exact: true }).click();
  173 |       await a.getByLabel('Asunto *', { exact: true }).fill(asunto);
  174 |       await a.getByRole('button', { name: 'Crear borrador', exact: true }).click();
  175 |       await expect(a).toHaveURL(/\/solicitudes\/[0-9a-f-]{36}\/editar$/);
  176 |       rutaSolicitud = new URL(a.url()).pathname.replace(/\/editar$/, '');
  177 |       const catalogoProveedor = a.waitForResponse((r) => r.url().includes('/api/proveedores?'));
  178 |       await a.getByRole('button', { name: 'Buscar proveedor', exact: true }).click();
  179 |       expect((await catalogoProveedor).status()).toBe(200);
  180 |       await expect(a.getByLabel('Proveedor', { exact: true })).toBeEnabled();
  181 |       await expect(a.locator('#proveedor-seleccion option').nth(1)).toBeAttached();
  182 |       await a.getByLabel('Proveedor', { exact: true }).selectOption({ index: 1 });
  183 |       await expect(a.getByLabel('Proveedor', { exact: true })).toHaveValue(/^[0-9a-f-]{36}$/);
  184 |       const catalogoSupervisor = a.waitForResponse((r) =>
  185 |         r.url().includes('/api/identidad/supervisores?'),
  186 |       );
  187 |       await a.getByRole('button', { name: 'Buscar supervisor', exact: true }).click();
  188 |       expect((await catalogoSupervisor).status()).toBe(200);
  189 |       await expect(a.getByLabel('Supervisor', { exact: true })).toBeEnabled();
> 190 |       await expect(a.locator('#supervisor-seleccion option').nth(1)).toBeAttached();
      |                                                  ^ Error: expect(locator).toHaveText(expected) failed
  191 |       await a.getByLabel('Supervisor', { exact: true }).selectOption({ index: 1 });
  192 |       await expect(a.getByLabel('Supervisor', { exact: true })).toHaveValue(/^[0-9a-f-]{36}$/);
  193 |       await a.getByRole('button', { name: 'Añadir concepto', exact: true }).click();
  194 |       await a
  195 |         .getByLabel('Descripción del concepto 1', { exact: true })
  196 |         .fill('Material de prueba ficticio');
  197 |       await a.getByLabel('Cantidad del concepto 1', { exact: true }).fill('2');
  198 |       await a.getByLabel('Precio unitario del concepto 1', { exact: true }).fill('12.50');
  199 |       await a.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  200 |       await expect(a).toHaveURL(new RegExp(`${rutaSolicitud}$`));
  201 |       await a.getByRole('button', { name: 'Presentar solicitud', exact: true }).click();
  202 |       await a.getByRole('button', { name: 'Confirmar y presentar', exact: true }).click();
  203 |       await expect(a.locator('.estado').first()).toHaveText('Presentada');
  204 |     });
  205 | 
  206 |     await test.step('cambio de rol rota sesión y supervisor decide', async () => {
  207 |       const supervisor = await entrar(a, 'SUPERVISOR');
  208 |       expect(supervisor.usuario.roles).toEqual(['SUPERVISOR']);
  209 |       const antiguo = await contextos[0].request.get('/api/identidad/yo', {
  210 |         headers: {
  211 |           Authorization: `Bearer ${solicitante.accessToken}`,
  212 |           'X-Demo-Contexto': selector(reservas[0]),
  213 |         },
  214 |       });
  215 |       expect(antiguo.status()).toBe(401);
  216 |       await a.getByRole('link', { name: asunto, exact: true }).click();
  217 |       await a.getByRole('button', { name: 'Aprobar solicitud', exact: true }).click();
  218 |       await a.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  219 |       await a.getByRole('button', { name: 'Confirmar aprobación', exact: true }).click();
  220 |       await expect(a.locator('.estado').first()).toHaveText('Aprobada');
  221 |     });
  222 | 
  223 |     await test.step('auditor solo consulta su espacio y otra reserva no puede leer la solicitud', async () => {
  224 |       const auditor = await entrar(a, 'AUDITOR');
  225 |       expect(auditor.usuario.roles).toEqual(['AUDITOR']);
  226 |       await expect(a.locator('.estado-consulta')).toContainText('eventos encontrados');
  227 |       await a.reload();
  228 |       await expect(a).toHaveURL(/\/historial$/);
  229 |       await expect(a.locator('.estado-consulta')).toContainText('eventos encontrados');
  230 |       const auditorB = await entrar(b, 'AUDITOR');
  231 |       const ajena = await contextos[1].request.get(`/api${rutaSolicitud}`, {
  232 |         headers: {
  233 |           Authorization: `Bearer ${auditorB.accessToken}`,
  234 |           'X-Demo-Contexto': selector(reservas[1]),
  235 |         },
  236 |       });
  237 |       expect(ajena.status()).toBe(404);
  238 |       const manipulado = await contextos[1].request.get('/api/identidad/yo', {
  239 |         headers: {
  240 |           Authorization: `Bearer ${auditorB.accessToken}`,
  241 |           'X-Demo-Contexto': selector(reservas[0]),
  242 |         },
  243 |       });
  244 |       expect(manipulado.status()).toBe(401);
  245 |       const sinContexto = await contextos[1].request.get('/api/identidad/yo', {
  246 |         headers: {
  247 |           Authorization: `Bearer ${auditorB.accessToken}`,
  248 |         },
  249 |       });
  250 |       expect(sinContexto.status()).toBe(401);
  251 |     });
  252 | 
  253 |     await test.step('una pestaña antigua no adopta una cookie de otra reserva', async () => {
  254 |       const cookiesA = await contextos[0].cookies();
  255 |       const cookiesB = await contextos[1].cookies();
  256 |       const cookieAjena = cookiesB.find((cookie) => cookie.name === 'DEMO-RESERVA')!;
  257 |       await contextos[0].addCookies([cookieAjena]);
  258 |       await a.getByRole('link', { name: 'Demo', exact: true }).click();
  259 |       await expect(
  260 |         a.getByRole('button', { name: 'Reservar mi espacio', exact: true }),
  261 |       ).toBeVisible();
  262 |       expect(
  263 |         await a.evaluate((clave) => sessionStorage.getItem(clave) === null, claveContexto),
  264 |       ).toBe(true);
  265 |       await expect(
  266 |         a.getByRole('button', { name: 'Entrar como auditor', exact: true }),
  267 |       ).toBeDisabled();
  268 |       await contextos[0].addCookies(cookiesA);
  269 |     });
  270 | 
  271 |     for (let i = 0; i < reservas.length; i++) await liberar(contextos[i], reservas[i]);
  272 |   } finally {
  273 |     await testInfo.attach('diagnostico-formulario-sin-datos', {
  274 |       body: Buffer.from(JSON.stringify(diagnostico, null, 2)),
  275 |       contentType: 'application/json',
  276 |     });
  277 |     for (const contexto of contextos) await contexto.close();
  278 |   }
  279 | });
  280 | 
```