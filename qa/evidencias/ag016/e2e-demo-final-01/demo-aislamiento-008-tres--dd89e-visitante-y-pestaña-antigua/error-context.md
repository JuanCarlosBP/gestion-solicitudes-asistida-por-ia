# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demo-aislamiento.spec.ts >> 008: tres espacios exclusivos, recorrido real por roles, cuarto visitante y pestaña antigua
- Location: e2e\demo-aislamiento.spec.ts:53:5

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
  104 |           proveedorPresente: Object.hasOwn(datos, 'proveedorId'),
  105 |           proveedorEsUuid:
  106 |             typeof datos['proveedorId'] === 'string' &&
  107 |             /^[0-9a-f-]{36}$/.test(datos['proveedorId']),
  108 |           proveedorEsNull: datos['proveedorId'] === null,
  109 |           supervisorPresente: Object.hasOwn(datos, 'supervisorId'),
  110 |           supervisorEsUuid:
  111 |             typeof datos['supervisorId'] === 'string' &&
  112 |             /^[0-9a-f-]{36}$/.test(datos['supervisorId']),
  113 |           supervisorEsNull: datos['supervisorId'] === null,
  114 |           conceptosCantidad: Array.isArray(datos['conceptos']) ? datos['conceptos'].length : null,
  115 |         });
  116 |       });
  117 |       paginas.push(pagina);
  118 |     }
  119 |     const [a, b, c, cuarto] = paginas;
  120 |     await test.step('tres reservas separadas y cuarto visitante recibe cupo ocupado', async () => {
  121 |       reservas.push(await reservar(a), await reservar(b), await reservar(c));
  122 |       expect(new Set(reservas.map((r) => r.espacio)).size).toBe(3);
  123 |       expect(new Set(reservas.map((r) => r.reservaId)).size).toBe(3);
  124 |       await cuarto.goto('/demo');
  125 |       const respuesta = cuarto.waitForResponse((r) => r.url().endsWith('/api/demo/reservas'));
  126 |       await cuarto.getByRole('button', { name: 'Reservar mi espacio', exact: true }).click();
  127 |       expect((await respuesta).status()).toBe(409);
  128 |       await expect(cuarto.getByRole('alert')).toContainText('Todos los espacios están ocupados');
  129 |       await expect(
  130 |         cuarto.getByRole('button', { name: 'Entrar como solicitante', exact: true }),
  131 |       ).toBeDisabled();
  132 |       expect(
  133 |         await cuarto.evaluate((clave) => sessionStorage.getItem(clave) === null, claveContexto),
  134 |       ).toBe(true);
  135 |     });
  136 | 
  137 |     await test.step('presentación usable en móvil, guías de cuatro pasos y sin credenciales almacenadas', async () => {
  138 |       await a.setViewportSize({ width: 390, height: 844 });
  139 |       expect(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  140 |       await expect(a.locator('.guia')).toHaveCount(3);
  141 |       await expect(a.locator('.guia li')).toHaveCount(12);
  142 |       await a.screenshot({
  143 |         path: join(process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results', 'frontend-demo-movil.png'),
  144 |         fullPage: true,
  145 |       });
  146 |       await a.setViewportSize({ width: 1280, height: 900 });
  147 |       await a.screenshot({
  148 |         path: join(
  149 |           process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  150 |           'frontend-demo-escritorio.png',
  151 |         ),
  152 |         fullPage: true,
  153 |       });
  154 |       const cookies = await contextos[0].cookies();
  155 |       const reserva = cookies.find((cookie) => cookie.name === 'DEMO-RESERVA');
  156 |       expect(
  157 |         Boolean(reserva?.httpOnly && reserva.sameSite === 'Strict' && reserva.path === '/api'),
  158 |       ).toBe(true);
  159 |       expect(
  160 |         await a.evaluate((clave) => {
  161 |           const publico = JSON.parse(sessionStorage.getItem(clave)!);
  162 |           return (
  163 |             Object.keys(publico).sort().join(',') === 'espacio,expiraEn,generacion,reservaId' &&
  164 |             !document.cookie.includes('DEMO-RESERVA')
  165 |           );
  166 |         }, claveContexto),
  167 |       ).toBe(true);
  168 |     });
  169 | 
  170 |     await test.step('solicitante crea, edita y presenta con catálogo preparado', async () => {
  171 |       solicitante = await entrar(a, 'SOLICITANTE');
  172 |       expect(solicitante.usuario.roles).toEqual(['SOLICITANTE']);
  173 |       await a.getByRole('link', { name: 'Nueva solicitud', exact: true }).click();
  174 |       await a.getByLabel('Asunto *', { exact: true }).fill(asunto);
  175 |       await a.getByRole('button', { name: 'Crear borrador', exact: true }).click();
  176 |       await expect(a).toHaveURL(/\/solicitudes\/[0-9a-f-]{36}\/editar$/);
  177 |       rutaSolicitud = new URL(a.url()).pathname.replace(/\/editar$/, '');
  178 |       const catalogoProveedor = a.waitForResponse((r) => r.url().includes('/api/proveedores?'));
  179 |       await a.getByRole('button', { name: 'Buscar proveedor', exact: true }).click();
  180 |       expect((await catalogoProveedor).status()).toBe(200);
  181 |       await expect(a.getByLabel('Proveedor', { exact: true })).toBeEnabled();
  182 |       await expect(a.locator('#proveedor-seleccion option').nth(1)).toBeAttached();
  183 |       await a.getByLabel('Proveedor', { exact: true }).selectOption({ index: 1 });
  184 |       await expect(a.getByLabel('Proveedor', { exact: true })).toHaveValue(/^[0-9a-f-]{36}$/);
  185 |       const catalogoSupervisor = a.waitForResponse((r) =>
  186 |         r.url().includes('/api/identidad/supervisores?'),
  187 |       );
  188 |       await a.getByRole('button', { name: 'Buscar supervisor', exact: true }).click();
  189 |       expect((await catalogoSupervisor).status()).toBe(200);
  190 |       await expect(a.getByLabel('Supervisor', { exact: true })).toBeEnabled();
  191 |       await expect(a.locator('#supervisor-seleccion option').nth(1)).toBeAttached();
  192 |       await a.getByLabel('Supervisor', { exact: true }).selectOption({ index: 1 });
  193 |       await expect(a.getByLabel('Supervisor', { exact: true })).toHaveValue(/^[0-9a-f-]{36}$/);
  194 |       await a.getByRole('button', { name: 'Añadir concepto', exact: true }).click();
  195 |       await a
  196 |         .getByLabel('Descripción del concepto 1', { exact: true })
  197 |         .fill('Material de prueba ficticio');
  198 |       await a.getByLabel('Cantidad del concepto 1', { exact: true }).fill('2');
  199 |       await a.getByLabel('Precio unitario del concepto 1', { exact: true }).fill('12.50');
  200 |       await a.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  201 |       await expect(a).toHaveURL(new RegExp(`${rutaSolicitud}$`));
  202 |       await a.getByRole('button', { name: 'Presentar solicitud', exact: true }).click();
  203 |       await a.getByRole('button', { name: 'Confirmar y presentar', exact: true }).click();
> 204 |       await expect(a.locator('.estado').first()).toHaveText('Presentada');
      |                                                  ^ Error: expect(locator).toHaveText(expected) failed
  205 |     });
  206 | 
  207 |     await test.step('cambio de rol rota sesión y supervisor decide', async () => {
  208 |       const supervisor = await entrar(a, 'SUPERVISOR');
  209 |       expect(supervisor.usuario.roles).toEqual(['SUPERVISOR']);
  210 |       const antiguo = await contextos[0].request.get('/api/identidad/yo', {
  211 |         headers: {
  212 |           Authorization: `Bearer ${solicitante.accessToken}`,
  213 |           'X-Demo-Contexto': selector(reservas[0]),
  214 |         },
  215 |       });
  216 |       expect(antiguo.status()).toBe(401);
  217 |       await a.getByRole('link', { name: asunto, exact: true }).click();
  218 |       await a.getByRole('button', { name: 'Aprobar solicitud', exact: true }).click();
  219 |       await a.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
  220 |       await a.getByRole('button', { name: 'Confirmar aprobación', exact: true }).click();
  221 |       await expect(a.locator('.estado').first()).toHaveText('Aprobada');
  222 |     });
  223 | 
  224 |     await test.step('auditor solo consulta su espacio y otra reserva no puede leer la solicitud', async () => {
  225 |       const auditor = await entrar(a, 'AUDITOR');
  226 |       expect(auditor.usuario.roles).toEqual(['AUDITOR']);
  227 |       await expect(a.locator('.estado-consulta')).toContainText('eventos encontrados');
  228 |       await a.reload();
  229 |       await expect(a).toHaveURL(/\/historial$/);
  230 |       await expect(a.locator('.estado-consulta')).toContainText('eventos encontrados');
  231 |       const auditorB = await entrar(b, 'AUDITOR');
  232 |       const ajena = await contextos[1].request.get(`/api${rutaSolicitud}`, {
  233 |         headers: {
  234 |           Authorization: `Bearer ${auditorB.accessToken}`,
  235 |           'X-Demo-Contexto': selector(reservas[1]),
  236 |         },
  237 |       });
  238 |       expect(ajena.status()).toBe(404);
  239 |       const manipulado = await contextos[1].request.get('/api/identidad/yo', {
  240 |         headers: {
  241 |           Authorization: `Bearer ${auditorB.accessToken}`,
  242 |           'X-Demo-Contexto': selector(reservas[0]),
  243 |         },
  244 |       });
  245 |       expect(manipulado.status()).toBe(401);
  246 |       const sinContexto = await contextos[1].request.get('/api/identidad/yo', {
  247 |         headers: {
  248 |           Authorization: `Bearer ${auditorB.accessToken}`,
  249 |         },
  250 |       });
  251 |       expect(sinContexto.status()).toBe(401);
  252 |     });
  253 | 
  254 |     await test.step('una pestaña antigua no adopta una cookie de otra reserva', async () => {
  255 |       const cookiesA = await contextos[0].cookies();
  256 |       const cookiesB = await contextos[1].cookies();
  257 |       const cookieAjena = cookiesB.find((cookie) => cookie.name === 'DEMO-RESERVA')!;
  258 |       await contextos[0].addCookies([cookieAjena]);
  259 |       await a.getByRole('link', { name: 'Demo', exact: true }).click();
  260 |       await expect(
  261 |         a.getByRole('button', { name: 'Reservar mi espacio', exact: true }),
  262 |       ).toBeVisible();
  263 |       expect(
  264 |         await a.evaluate((clave) => sessionStorage.getItem(clave) === null, claveContexto),
  265 |       ).toBe(true);
  266 |       await expect(
  267 |         a.getByRole('button', { name: 'Entrar como auditor', exact: true }),
  268 |       ).toBeDisabled();
  269 |       await contextos[0].addCookies(cookiesA);
  270 |     });
  271 | 
  272 |     for (let i = 0; i < reservas.length; i++) await liberar(contextos[i], reservas[i]);
  273 |   } finally {
  274 |     const rutaDiagnostico = testInfo.outputPath('diagnostico.json');
  275 |     await mkdir(dirname(rutaDiagnostico), { recursive: true });
  276 |     await writeFile(rutaDiagnostico, `${JSON.stringify(diagnostico, null, 2)}\n`, { flag: 'wx' });
  277 |     await testInfo.attach('diagnostico-formulario-sin-datos', {
  278 |       path: rutaDiagnostico,
  279 |       contentType: 'application/json',
  280 |     });
  281 |     for (const contexto of contextos) await contexto.close();
  282 |   }
  283 | });
  284 | 
```