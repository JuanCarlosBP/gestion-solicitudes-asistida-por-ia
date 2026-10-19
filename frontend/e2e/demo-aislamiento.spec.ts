import { BrowserContext, expect, Page, Request as PeticionNavegador, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { PresentacionDemo, ReservaDemo, RolDemo } from '../src/app/demo/demo-modelo';
import type { Acceso } from '../src/app/identidad/identidad-modelo';

const claveContexto = 'gs.demo.contexto.v1';
const selector = (r: ReservaDemo) => `${r.espacio}:${r.generacion}:${r.reservaId}`;
const destino: Record<RolDemo, RegExp> = {
  SOLICITANTE: /\/solicitudes$/,
  SUPERVISOR: /\/aprobaciones$/,
  AUDITOR: /\/historial$/,
};

async function reservar(
  page: Page,
  registrar: (dato: Record<string, unknown>) => void,
): Promise<ReservaDemo> {
  const presentacion = page.waitForResponse(
    (r) => r.url().endsWith('/api/demo') && r.request().method() === 'GET',
  );
  await page.goto('/demo');
  const configuracion = (await (await presentacion).json()) as PresentacionDemo;
  await expect(
    page.getByRole('heading', { name: 'Prueba el recorrido de una solicitud', exact: true }),
  ).toBeVisible();
  const respuesta = page.waitForResponse(
    (r) => r.url().endsWith('/api/demo/reservas') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Reservar mi espacio', exact: true }).focus();
  await page.keyboard.press('Enter');
  const creada = await respuesta;
  expect(creada.status()).toBe(201);
  await expect(
    page.getByRole('button', { name: 'Entrar como solicitante', exact: true }),
  ).toBeEnabled();
  const reserva = (await creada.json()) as ReservaDemo;
  const ahoraCliente = await page.evaluate(() => Date.now());
  registrar({
    tipo: 'contador-reserva',
    duracionMinutos: configuracion.duracionMinutos,
    expiraEn: reserva.expiraEn,
    fechaCliente: new Date(ahoraCliente).toISOString(),
    fechaHttp: await creada.headerValue('date'),
    restantesSinAcotarMs: Date.parse(reserva.expiraEn) - ahoraCliente,
    texto: await page.locator('.tiempo strong').textContent(),
  });
  expect(configuracion.duracionMinutos).toBe(60);
  await expect(page.locator('.tiempo strong')).toHaveText('60 min');
  await expect(page.locator('.tiempo')).not.toContainText('61 min');
  return reserva;
}

async function entrar(page: Page, rol: RolDemo): Promise<Acceso> {
  await page.getByRole('link', { name: 'Demo', exact: true }).click();
  const respuesta = page.waitForResponse((r) => r.url().endsWith('/api/demo/acceso'));
  await page.getByRole('button', { name: `Entrar como ${rol.toLowerCase()}`, exact: true }).click();
  const acceso = await respuesta;
  expect(acceso.status()).toBe(200);
  await expect(page).toHaveURL(destino[rol]);
  return (await acceso.json()) as Acceso;
}

async function liberar(contexto: BrowserContext, reserva: ReservaDemo): Promise<void> {
  await contexto.request.get('/api/autenticacion/csrf');
  const csrf = (await contexto.cookies()).find((c) => c.name === 'XSRF-TOKEN')?.value ?? '';
  const resultado = await contexto.request.post('/api/demo/reserva/liberar', {
    headers: { 'X-Demo-Contexto': selector(reserva), 'X-XSRF-TOKEN': decodeURIComponent(csrf) },
  });
  expect(resultado.status()).toBe(204);
}

test('008: tres espacios exclusivos, recorrido real por roles, cuarto visitante y pestaña antigua', async ({
  browser,
  baseURL,
}, testInfo) => {
  test.setTimeout(180000);
  const contextos: BrowserContext[] = [];
  const reservas: ReservaDemo[] = [];
  const paginas: Page[] = [];
  const diagnostico: Record<string, unknown>[] = [];
  const registrar = (dato: Record<string, unknown>) =>
    diagnostico.push({ fecha: new Date().toISOString(), ...dato });
  const catalogos = new WeakMap<PeticionNavegador, { referencia: string; ordinal: number }>();
  const asunto = `Demo008 ficticia ${randomUUID()}`;
  let rutaSolicitud = '';
  let solicitante: Acceso;
  try {
    for (let i = 0; i < 4; i++) {
      const contexto = await browser.newContext({ baseURL });
      contextos.push(contexto);
      const pagina = await contexto.newPage();
      const ordinales: Record<string, number> = { proveedor: 0, supervisor: 0, detalle: 0 };
      await pagina.addInitScript(() => {
        const eventos: Record<string, unknown>[] = [];
        (
          window as unknown as { __ag016Diagnostico: Record<string, unknown>[] }
        ).__ag016Diagnostico = eventos;
        for (const tipo of ['click', 'change']) {
          document.addEventListener(
            tipo,
            (evento) => {
              const control = evento.target;
              if (!(control instanceof HTMLElement)) return;
              const contenedor = control.closest('.selector-referencia');
              if (!contenedor) return;
              const selector = contenedor.querySelector('select');
              if (
                !selector ||
                !['proveedor-seleccion', 'supervisor-seleccion'].includes(selector.id)
              )
                return;
              if (tipo === 'change' && control !== selector) return;
              if (tipo === 'click' && control.tagName !== 'BUTTON') return;
              eventos.push({
                fecha: new Date().toISOString(),
                tipo: `dom-${tipo}`,
                referencia: selector.id === 'proveedor-seleccion' ? 'proveedor' : 'supervisor',
                buscandoDOM: contenedor.getAttribute('aria-busy') === 'true',
                selectorDeshabilitado: selector.disabled,
                seleccionEsUuid: /^[0-9a-f-]{36}$/.test(selector.value),
              });
            },
            true,
          );
        }
      });
      pagina.on('pageerror', (error) => {
        registrar({
          tipo: 'pageerror',
          visitante: i,
          nombre: error.name,
          causa:
            error.message.match(/(?:[A-Za-z_$][\w$]*\.)+[A-Za-z_$][\w$]* is not a function/)?.[0] ??
            error.message.match(/NG\d{4,5}/)?.[0] ??
            'ERROR_NO_CLASIFICADO',
        });
      });
      pagina.on('console', (mensaje) => {
        if (mensaje.type() !== 'error') return;
        registrar({
          tipo: 'console-error',
          visitante: i,
          causa:
            mensaje
              .text()
              .match(/(?:[A-Za-z_$][\w$]*\.)+[A-Za-z_$][\w$]* is not a function/)?.[0] ??
            mensaje.text().match(/NG\d{4,5}/)?.[0] ??
            'ERROR_NO_CLASIFICADO',
        });
      });
      pagina.on('request', (peticion) => {
        const ruta = new URL(peticion.url()).pathname;
        if (peticion.method() === 'GET') {
          const referencia =
            ruta === '/api/proveedores'
              ? 'proveedor'
              : ruta === '/api/identidad/supervisores'
                ? 'supervisor'
                : /^\/api\/solicitudes\/[0-9a-f-]{36}$/.test(ruta)
                  ? 'detalle'
                  : null;
          if (referencia) {
            const consulta = { referencia, ordinal: ++ordinales[referencia] };
            catalogos.set(peticion, consulta);
            registrar({ tipo: 'consulta-inicio', visitante: i, ...consulta });
          }
        }
        if (
          peticion.method() !== 'PUT' ||
          !/\/api\/solicitudes\/[0-9a-f-]{36}$/.test(peticion.url())
        )
          return;
        const datos = peticion.postDataJSON() as Record<string, unknown>;
        registrar({
          tipo: 'put-borrador-campos',
          visitante: i,
          proveedorPresente: Object.hasOwn(datos, 'proveedorId'),
          proveedorEsUuid:
            typeof datos['proveedorId'] === 'string' &&
            /^[0-9a-f-]{36}$/.test(datos['proveedorId']),
          proveedorEsNull: datos['proveedorId'] === null,
          supervisorPresente: Object.hasOwn(datos, 'supervisorId'),
          supervisorEsUuid:
            typeof datos['supervisorId'] === 'string' &&
            /^[0-9a-f-]{36}$/.test(datos['supervisorId']),
          supervisorEsNull: datos['supervisorId'] === null,
          conceptosCantidad: Array.isArray(datos['conceptos']) ? datos['conceptos'].length : null,
        });
      });
      pagina.on('response', (respuesta) => {
        const consulta = catalogos.get(respuesta.request());
        if (!consulta) return;
        registrar({
          tipo: 'consulta-cabeceras',
          visitante: i,
          ...consulta,
          status: respuesta.status(),
        });
        void respuesta
          .finished()
          .then((error) =>
            registrar({
              tipo: 'consulta-fin',
              visitante: i,
              ...consulta,
              transporteCorrecto: error === null,
            }),
          )
          .catch(() => registrar({ tipo: 'consulta-fin-error', visitante: i, ...consulta }));
      });
      paginas.push(pagina);
    }
    const [a, b, c, cuarto] = paginas;
    await test.step('tres reservas separadas y cuarto visitante recibe cupo ocupado', async () => {
      reservas.push(
        await reservar(a, registrar),
        await reservar(b, registrar),
        await reservar(c, registrar),
      );
      expect(new Set(reservas.map((r) => r.espacio)).size).toBe(3);
      expect(new Set(reservas.map((r) => r.reservaId)).size).toBe(3);
      await cuarto.goto('/demo');
      const respuesta = cuarto.waitForResponse((r) => r.url().endsWith('/api/demo/reservas'));
      await cuarto.getByRole('button', { name: 'Reservar mi espacio', exact: true }).click();
      expect((await respuesta).status()).toBe(409);
      await expect(cuarto.getByRole('alert')).toContainText('Todos los espacios están ocupados');
      await expect(
        cuarto.getByRole('button', { name: 'Entrar como solicitante', exact: true }),
      ).toBeDisabled();
      expect(
        await cuarto.evaluate((clave) => sessionStorage.getItem(clave) === null, claveContexto),
      ).toBe(true);
    });

    await test.step('presentación usable en móvil, guías de cuatro pasos y sin credenciales almacenadas', async () => {
      await a.setViewportSize({ width: 390, height: 844 });
      expect(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(a.locator('.guia')).toHaveCount(3);
      await expect(a.locator('.guia li')).toHaveCount(12);
      await expect(a.locator('.tiempo strong')).toHaveText('60 min');
      await a.screenshot({
        path: join(process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results', 'frontend-demo-movil.png'),
        fullPage: true,
      });
      await a.setViewportSize({ width: 1280, height: 900 });
      await expect(a.locator('.tiempo strong')).toHaveText('60 min');
      await a.screenshot({
        path: join(
          process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
          'frontend-demo-escritorio.png',
        ),
        fullPage: true,
      });
      const cookies = await contextos[0].cookies();
      const reserva = cookies.find((cookie) => cookie.name === 'DEMO-RESERVA');
      expect(
        Boolean(reserva?.httpOnly && reserva.sameSite === 'Strict' && reserva.path === '/api'),
      ).toBe(true);
      expect(
        await a.evaluate((clave) => {
          const publico = JSON.parse(sessionStorage.getItem(clave)!);
          return (
            Object.keys(publico).sort().join(',') === 'espacio,expiraEn,generacion,reservaId' &&
            !document.cookie.includes('DEMO-RESERVA')
          );
        }, claveContexto),
      ).toBe(true);
    });

    await test.step('solicitante crea, edita y presenta con catálogo preparado', async () => {
      solicitante = await entrar(a, 'SOLICITANTE');
      expect(solicitante.usuario.roles).toEqual(['SOLICITANTE']);
      await a.getByRole('link', { name: 'Nueva solicitud', exact: true }).click();
      await a.getByLabel('Asunto *', { exact: true }).fill(asunto);
      await a.getByRole('button', { name: 'Crear borrador', exact: true }).click();
      await expect(a).toHaveURL(/\/solicitudes\/[0-9a-f-]{36}\/editar$/);
      rutaSolicitud = new URL(a.url()).pathname.replace(/\/editar$/, '');
      const opcionProveedor = a.locator('#proveedor-seleccion option').nth(1);
      await expect(opcionProveedor).toBeAttached();
      const proveedorId = (await opcionProveedor.getAttribute('value'))!;
      expect(proveedorId).toMatch(/^[0-9a-f-]{36}$/);
      const nombreProveedor = (await opcionProveedor.textContent())!.trim();
      await a.getByLabel('Buscar proveedor por nombre', { exact: true }).fill(nombreProveedor);
      const catalogoProveedor = a.waitForResponse((r) => {
        const url = new URL(r.url());
        return (
          url.pathname === '/api/proveedores' &&
          url.searchParams.get('denominacion') === nombreProveedor
        );
      });
      await a.getByRole('button', { name: 'Buscar proveedor', exact: true }).click();
      const proveedorRespuesta = await catalogoProveedor;
      registrar({
        tipo: 'espera-resuelta',
        visitante: 0,
        ...catalogos.get(proveedorRespuesta.request()),
      });
      expect(proveedorRespuesta.status()).toBe(200);
      expect(await proveedorRespuesta.finished()).toBeNull();
      await expect(a.getByLabel('Proveedor', { exact: true })).toBeEnabled();
      await a.getByLabel('Proveedor', { exact: true }).selectOption(proveedorId);
      await expect(a.getByLabel('Proveedor', { exact: true })).toHaveValue(proveedorId);
      const opcionSupervisor = a.locator('#supervisor-seleccion option').nth(1);
      await expect(opcionSupervisor).toBeAttached();
      const supervisorId = (await opcionSupervisor.getAttribute('value'))!;
      expect(supervisorId).toMatch(/^[0-9a-f-]{36}$/);
      const nombreSupervisor = (await opcionSupervisor.textContent())!.trim();
      await a.getByLabel('Buscar supervisor por nombre', { exact: true }).fill(nombreSupervisor);
      const catalogoSupervisor = a.waitForResponse((r) => {
        const url = new URL(r.url());
        return (
          url.pathname === '/api/identidad/supervisores' &&
          url.searchParams.get('nombre') === nombreSupervisor
        );
      });
      await a.getByRole('button', { name: 'Buscar supervisor', exact: true }).click();
      const supervisorRespuesta = await catalogoSupervisor;
      registrar({
        tipo: 'espera-resuelta',
        visitante: 0,
        ...catalogos.get(supervisorRespuesta.request()),
      });
      expect(supervisorRespuesta.status()).toBe(200);
      expect(await supervisorRespuesta.finished()).toBeNull();
      await expect(a.getByLabel('Supervisor', { exact: true })).toBeEnabled();
      await a.getByLabel('Supervisor', { exact: true }).selectOption(supervisorId);
      await expect(a.getByLabel('Supervisor', { exact: true })).toHaveValue(supervisorId);
      await a.getByRole('button', { name: 'Añadir concepto', exact: true }).click();
      await a
        .getByLabel('Descripción del concepto 1', { exact: true })
        .fill('Material de prueba ficticio');
      await a.getByLabel('Cantidad del concepto 1', { exact: true }).fill('2');
      await a.getByLabel('Precio unitario del concepto 1', { exact: true }).fill('12.50');
      const guardado = a.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === `/api${rutaSolicitud}` && r.request().method() === 'PUT',
      );
      await a.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
      const respuestaGuardado = await guardado;
      expect(respuestaGuardado.status()).toBe(200);
      const persistida = (await respuestaGuardado.json()) as {
        proveedorId: string | null;
        supervisorId: string | null;
      };
      expect(persistida.proveedorId).toBe(proveedorId);
      expect(persistida.supervisorId).toBe(supervisorId);
      await expect(a).toHaveURL(new RegExp(`${rutaSolicitud}$`));
      await a.getByRole('button', { name: 'Presentar solicitud', exact: true }).click();
      await a.getByRole('button', { name: 'Confirmar y presentar', exact: true }).click();
      await expect(a.locator('.estado').first()).toHaveText('Presentada');
    });

    await test.step('cambio de rol rota sesión y supervisor decide', async () => {
      const supervisor = await entrar(a, 'SUPERVISOR');
      expect(supervisor.usuario.roles).toEqual(['SUPERVISOR']);
      const antiguo = await contextos[0].request.get('/api/identidad/yo', {
        headers: {
          Authorization: `Bearer ${solicitante.accessToken}`,
          'X-Demo-Contexto': selector(reservas[0]),
        },
      });
      expect(antiguo.status()).toBe(401);
      await a.getByRole('link', { name: asunto, exact: true }).click();
      await a.getByRole('button', { name: 'Aprobar solicitud', exact: true }).click();
      await a.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
      await a.getByRole('button', { name: 'Confirmar aprobación', exact: true }).click();
      await expect(a.locator('.estado').first()).toHaveText('Aprobada');
    });

    await test.step('auditor solo consulta su espacio y otra reserva no puede leer la solicitud', async () => {
      const auditor = await entrar(a, 'AUDITOR');
      expect(auditor.usuario.roles).toEqual(['AUDITOR']);
      await expect(a.locator('.estado-consulta')).toContainText('eventos encontrados');
      await a.reload();
      await expect(a).toHaveURL(/\/historial$/);
      await expect(a.locator('.estado-consulta')).toContainText('eventos encontrados');
      const auditorB = await entrar(b, 'AUDITOR');
      const ajena = await contextos[1].request.get(`/api${rutaSolicitud}`, {
        headers: {
          Authorization: `Bearer ${auditorB.accessToken}`,
          'X-Demo-Contexto': selector(reservas[1]),
        },
      });
      expect(ajena.status()).toBe(404);
      const manipulado = await contextos[1].request.get('/api/identidad/yo', {
        headers: {
          Authorization: `Bearer ${auditorB.accessToken}`,
          'X-Demo-Contexto': selector(reservas[0]),
        },
      });
      expect(manipulado.status()).toBe(401);
      const sinContexto = await contextos[1].request.get('/api/identidad/yo', {
        headers: {
          Authorization: `Bearer ${auditorB.accessToken}`,
        },
      });
      expect(sinContexto.status()).toBe(401);
    });

    await test.step('una pestaña antigua no adopta una cookie de otra reserva', async () => {
      const cookiesA = await contextos[0].cookies();
      const cookiesB = await contextos[1].cookies();
      const cookieAjena = cookiesB.find((cookie) => cookie.name === 'DEMO-RESERVA')!;
      await contextos[0].addCookies([cookieAjena]);
      await a.getByRole('link', { name: 'Demo', exact: true }).click();
      await expect(
        a.getByRole('button', { name: 'Reservar mi espacio', exact: true }),
      ).toBeVisible();
      expect(
        await a.evaluate((clave) => sessionStorage.getItem(clave) === null, claveContexto),
      ).toBe(true);
      await expect(
        a.getByRole('button', { name: 'Entrar como auditor', exact: true }),
      ).toBeDisabled();
      await contextos[0].addCookies(cookiesA);
    });

    for (let i = 0; i < reservas.length; i++) await liberar(contextos[i], reservas[i]);
  } finally {
    for (let i = 0; i < paginas.length; i++) {
      const eventos = await paginas[i].evaluate(
        () =>
          (window as unknown as { __ag016Diagnostico?: Record<string, unknown>[] })
            .__ag016Diagnostico ?? [],
      );
      for (const evento of eventos) registrar({ ...evento, visitante: i });
    }
    diagnostico.sort((a, b) => String(a['fecha']).localeCompare(String(b['fecha'])));
    const rutaDiagnostico = testInfo.outputPath('diagnostico.json');
    await mkdir(dirname(rutaDiagnostico), { recursive: true });
    await writeFile(rutaDiagnostico, `${JSON.stringify(diagnostico, null, 2)}\n`, { flag: 'wx' });
    await testInfo.attach('diagnostico-formulario-sin-datos', {
      path: rutaDiagnostico,
      contentType: 'application/json',
    });
    for (const contexto of contextos) await contexto.close();
  }
});
