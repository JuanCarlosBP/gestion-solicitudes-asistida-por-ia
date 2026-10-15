# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: historial.spec.ts >> 007: diez recorridos de historial y resumen >> HA-E2E10: teclado, foco, etiquetas y capturas360/768/1440
- Location: e2e\historial.spec.ts:386:7

# Error details

```
Error: .acciones-historial button[type=submit]

expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 4.5
Received:    2.976973838968578
```

# Test source

```ts
  46  |         headers: await escritura(autor.api, autor.headers),
  47  |         data: { version: solicitud.version },
  48  |       });
  49  |       expect(enviada.status()).toBe(200);
  50  |       const version = ((await enviada.json()) as { version: number }).version;
  51  |       const clave = randomUUID();
  52  |       if (tipo === 'aprobar') {
  53  |         claveAprobacion = clave;
  54  |         versionAprobacion = version;
  55  |       }
  56  |       const decision = await supervisor.api.post(`/api/solicitudes/${solicitud.id}/${tipo}`, {
  57  |         headers: await escritura(supervisor.api, supervisor.headers, clave),
  58  |         data: {
  59  |           version,
  60  |           [tipo === 'aprobar' ? 'comentario' : 'motivo']:
  61  |             'Texto privado ficticio007 que no pertenece al historial.',
  62  |         },
  63  |       });
  64  |       expect(decision.status()).toBe(200);
  65  |       const detalle = await autor.api.get(`/api/solicitudes/${solicitud.id}`, {
  66  |         headers: autor.headers,
  67  |       });
  68  |       expect(detalle.status()).toBe(200);
  69  |       return (await detalle.json()) as DetalleSolicitud;
  70  |     }
  71  |     aprobada = await decidir('aprobar');
  72  |     rechazada = await decidir('rechazar');
  73  |     const p = await admin.api.get(`/api/proveedores/${borrador.proveedorId}`, {
  74  |       headers: admin.headers,
  75  |     });
  76  |     expect(p.status()).toBe(200);
  77  |     proveedor = (await p.json()) as Proveedor;
  78  |     const editar = await admin.api.put(`/api/proveedores/${proveedor.id}`, {
  79  |       headers: await escritura(admin.api, admin.headers),
  80  |       data: {
  81  |         tipo: proveedor.tipo,
  82  |         denominacion: `${proveedor.denominacion} actualizado`,
  83  |         paisFiscal: proveedor.paisFiscal,
  84  |         identificadorFiscal: proveedor.identificadorFiscal,
  85  |         correoContacto: null,
  86  |         telefonoContacto: null,
  87  |         version: proveedor.version,
  88  |       },
  89  |     });
  90  |     expect(editar.status()).toBe(200);
  91  |     proveedor = (await editar.json()) as Proveedor;
  92  |     for (const accion of ['desactivar', 'reactivar']) {
  93  |       const estado = await admin.api.post(`/api/proveedores/${proveedor.id}/${accion}`, {
  94  |         headers: await escritura(admin.api, admin.headers),
  95  |         data: { version: proveedor.version },
  96  |       });
  97  |       expect(estado.status()).toBe(200);
  98  |       proveedor = (await estado.json()) as Proveedor;
  99  |     }
  100 |   });
  101 |   test.afterAll(async () => {
  102 |     for (const sesion of sesiones) await sesion.api.dispose();
  103 |   });
  104 |   async function historial(page: Page, id: string, recurso = 'solicitudes') {
  105 |     await page.goto(`/${recurso}/${id}/historial`);
  106 |     await expect(page.locator('.estado-consulta')).toContainText('eventos encontrados');
  107 |   }
  108 |   async function contrastes(page: Page, selectores: string[]) {
  109 |     const resultados = await page.evaluate((selectores) => {
  110 |       function luminancia(color: string): number {
  111 |         const rgb = color
  112 |           .match(/[\d.]+/g)!
  113 |           .slice(0, 3)
  114 |           .map(Number)
  115 |           .map((c) => {
  116 |             const v = c / 255;
  117 |             return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  118 |           });
  119 |         return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  120 |       }
  121 |       return selectores.map((selector) => {
  122 |         const elemento = document.querySelector<HTMLElement>(selector);
  123 |         if (!elemento) throw new Error(`Muestra de contraste ausente: ${selector}`);
  124 |         const color = getComputedStyle(elemento).color;
  125 |         let fondo = 'rgb(255, 255, 255)',
  126 |           actual: HTMLElement | null = elemento;
  127 |         while (actual) {
  128 |           const candidato = getComputedStyle(actual).backgroundColor;
  129 |           if (candidato !== 'transparent' && candidato !== 'rgba(0, 0, 0, 0)') {
  130 |             fondo = candidato;
  131 |             break;
  132 |           }
  133 |           actual = actual.parentElement;
  134 |         }
  135 |         const l1 = luminancia(color),
  136 |           l2 = luminancia(fondo);
  137 |         return {
  138 |           selector,
  139 |           color,
  140 |           fondo,
  141 |           contraste: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05),
  142 |         };
  143 |       });
  144 |     }, selectores);
  145 |     for (const muestra of resultados)
> 146 |       expect(muestra.contraste, muestra.selector).toBeGreaterThanOrEqual(4.5);
      |                                                   ^ Error: .acciones-historial button[type=submit]
  147 |     return resultados;
  148 |   }
  149 | 
  150 |   test('HA-E2E01: autor lee timeline integrado y directo con fuentes y transición real', async ({
  151 |     page,
  152 |   }) => {
  153 |     await acceder(page, 'SOLICITANTE');
  154 |     await page.goto(`/solicitudes/${aprobada.id}`);
  155 |     const timeline = page.locator('app-historial-timeline');
  156 |     await expect(timeline.locator('.evento-historial')).toHaveCount(4);
  157 |     await expect(timeline.locator('h3').first()).toHaveText('Solicitud aprobada');
  158 |     await expect(timeline).toContainText('PRESENTADA → APROBADA');
  159 |     await expect(timeline).toContainText('Decisión registrada');
  160 |     await expect(timeline).not.toContainText('Texto privado ficticio007');
  161 |     await timeline.getByRole('link', { name: 'Abrir historial completo' }).click();
  162 |     await expect(page).toHaveURL(new RegExp(`/solicitudes/${aprobada.id}/historial\\?`));
  163 |     await expect(page.locator('.evento-historial')).toHaveCount(4);
  164 |     const antes = await autor.api.get(`/api/solicitudes/${aprobada.id}/historial`, {
  165 |       headers: autor.headers,
  166 |     });
  167 |     const idsAntes = ((await antes.json()) as PaginaHistorial).elementos.map((e) => e.id);
  168 |     const replay = await supervisor.api.post(`/api/solicitudes/${aprobada.id}/aprobar`, {
  169 |       headers: await escritura(supervisor.api, supervisor.headers, claveAprobacion),
  170 |       data: {
  171 |         version: versionAprobacion,
  172 |         comentario: 'Texto privado ficticio007 que no pertenece al historial.',
  173 |       },
  174 |     });
  175 |     expect(replay.status()).toBe(200);
  176 |     const despues = await autor.api.get(`/api/solicitudes/${aprobada.id}/historial`, {
  177 |       headers: autor.headers,
  178 |     });
  179 |     expect(((await despues.json()) as PaginaHistorial).elementos.map((e) => e.id)).toEqual(
  180 |       idsAntes,
  181 |     );
  182 |     await page.reload();
  183 |     await expect(page.locator('.evento-historial')).toHaveCount(4);
  184 |   });
  185 |   test('HA-E2E02: supervisor ve rechazo y el historial omite el motivo del detalle', async ({
  186 |     page,
  187 |   }) => {
  188 |     await acceder(page, 'SUPERVISOR');
  189 |     await page.goto(`/solicitudes/${rechazada.id}`);
  190 |     await expect(page.locator('.resultado-decision')).toContainText('Texto privado ficticio007');
  191 |     const timeline = page.locator('app-historial-timeline');
  192 |     await expect(timeline.locator('h3').first()).toHaveText('Solicitud rechazada');
  193 |     await expect(timeline).not.toContainText('Texto privado ficticio007');
  194 |     await expect(timeline).toContainText('PRESENTADA → RECHAZADA');
  195 |     await timeline.getByRole('link', { name: 'Abrir historial completo' }).click();
  196 |     await page.reload();
  197 |     await expect(page.locator('.evento-historial')).toHaveCount(4);
  198 |   });
  199 |   test('HA-E2E03: global filtra, pagina, recarga y vuelve atrás con URL persistente', async ({
  200 |     page,
  201 |   }) => {
  202 |     await acceder(page, 'AUDITOR');
  203 |     await page.getByRole('link', { name: 'Historial', exact: true }).click();
  204 |     await expect(page.locator('.estado-consulta')).toContainText('eventos encontrados');
  205 |     await page.getByLabel('Tipo de recurso', { exact: true }).selectOption('SOLICITUD');
  206 |     await page.getByLabel('Recurso (UUID)', { exact: true }).fill(aprobada.id);
  207 |     await page.getByLabel('Eventos por página', { exact: true }).selectOption('1');
  208 |     await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  209 |     await expect(page.locator('.evento-historial')).toHaveCount(1);
  210 |     await expect(page.locator('.estado-consulta')).toHaveText('4 eventos encontrados');
  211 |     const primera = await page.locator('.evento-historial h3').textContent();
  212 |     await page.getByRole('button', { name: 'Siguiente página de eventos', exact: true }).click();
  213 |     await expect(page).toHaveURL(/page=1/);
  214 |     await expect(page.locator('.evento-historial h3')).not.toHaveText(primera!);
  215 |     await page.reload();
  216 |     await expect(page.locator('.paginacion-historial')).toContainText('Página 2 de 4');
  217 |     await page.goBack();
  218 |     await expect(page.locator('.paginacion-historial')).toContainText('Página 1 de 4');
  219 |     await page.getByLabel('Acción', { exact: true }).selectOption('APROBADA');
  220 |     await page.getByLabel('Actor (UUID)', { exact: true }).fill(supervisor.usuarioId);
  221 |     await page
  222 |       .getByLabel('Desde (ISO con zona)', { exact: true })
  223 |       .fill('2020-01-01T00:00:00+02:00');
  224 |     await page.getByLabel('Hasta (ISO con zona)', { exact: true }).fill('2030-01-01T00:00:00Z');
  225 |     await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  226 |     await expect(page.locator('.estado-consulta')).toHaveText('1 eventos encontrados');
  227 |     await expect(page.locator('.evento-historial h3')).toHaveText('Solicitud aprobada');
  228 |   });
  229 |   test('HA-E2E04: administrador y auditor consultan ciclo completo de proveedor', async ({
  230 |     page,
  231 |   }) => {
  232 |     await acceder(page, 'ADMINISTRADOR');
  233 |     await page.goto(`/proveedores/${proveedor.id}`);
  234 |     await expect(page.locator('.evento-historial')).toHaveCount(4);
  235 |     await expect(page.locator('.evento-historial h3')).toHaveText([
  236 |       'Proveedor reactivado',
  237 |       'Proveedor desactivado',
  238 |       'Proveedor modificado',
  239 |       'Proveedor creado',
  240 |     ]);
  241 |     await expect(page.locator('app-historial-timeline')).not.toContainText(
  242 |       proveedor.identificadorFiscal,
  243 |     );
  244 |     await page.getByRole('link', { name: 'Abrir historial completo' }).click();
  245 |     await expect(page.locator('.evento-historial')).toHaveCount(4);
  246 |     await page.goto(`/historial?tipoRecurso=PROVEEDOR&recursoId=${proveedor.id}`);
```