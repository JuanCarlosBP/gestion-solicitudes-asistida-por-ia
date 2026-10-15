import { expect, Page, Route, test } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Proveedor } from '../src/app/proveedores/proveedor-modelo';
import type { DetalleSolicitud } from '../src/app/solicitudes/solicitud-modelo';
import {
  acceder,
  baseURL,
  borradorCompleto,
  crearBorrador,
  csrf,
  descriptores,
  escritura,
  rellenarProveedor,
  sesionApi,
  verificarAlmacenamientoOperaciones,
} from './operaciones-ayudas';
import {
  reiniciarBackend,
  restaurarSupervisor,
  sqlFixture,
  uuidFixture,
} from './operaciones-entorno';

const panel = (page: Page) =>
  page.getByRole('region', { name: 'Operaciones seguras', exact: true });
function senal() {
  let resolver!: () => void;
  const promesa = new Promise<void>((resolve) => {
    resolver = resolve;
  });
  return { promesa, resolver };
}
async function recuperar(page: Page, operacion: string) {
  const consultar = panel(page).getByRole('button', {
    name: `Consultar resultado: ${operacion}`,
    exact: true,
  });
  await consultar.focus();
  await expect(consultar).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    panel(page).getByRole('status').filter({ hasText: 'Resultado recuperado' }).last(),
  ).toBeVisible();
  await expect(
    panel(page).getByRole('link', { name: 'Abrir resultado', exact: true }).last(),
  ).toBeFocused();
}
async function captura(page: Page, nombre: string) {
  for (const ancho of [360, 768, 1440]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: join(
        process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
        `frontend006-${nombre}-${ancho}.png`,
      ),
      fullPage: true,
    });
  }
}

test('CI-01/04/06/07: proveedor con respuesta perdida, mismo reintento y recuperación de baja/alta', async ({
  page,
}) => {
  test.setTimeout(120000);
  await acceder(page, 'ADMINISTRADOR');
  await page.goto('/proveedores/nuevo');
  await expect(page.getByRole('heading', { name: 'Nuevo proveedor', exact: true })).toBeFocused();
  const marca = randomUUID();
  await rellenarProveedor(page, `Proveedor006 ${marca}`, `FICTICIO-${marca}`);
  let original!: Proveedor;
  let clave = '';
  let headers: Record<string, string> = {};
  let cuerpo: unknown;
  await page.route(
    '**/api/proveedores',
    async (ruta) => {
      if (ruta.request().method() !== 'POST') return ruta.continue();
      clave = ruta.request().headers()['idempotency-key'];
      headers = { Authorization: ruta.request().headers()['authorization'] };
      cuerpo = ruta.request().postDataJSON();
      const respuesta = await ruta.fetch();
      expect(respuesta.status()).toBe(201);
      original = (await respuesta.json()) as Proveedor;
      await ruta.abort('failed');
    },
    { times: 1 },
  );
  await page.getByRole('button', { name: 'Guardar proveedor', exact: true }).click();
  await expect(panel(page).getByRole('status')).toContainText('pendiente');
  expect((await descriptores(page))[0].clave).toBe(clave);
  await verificarAlmacenamientoOperaciones(page);
  await captura(page, 'proveedor-pendiente');
  const repetida = page.waitForResponse(
    (respuesta) =>
      respuesta.request().method() === 'POST' &&
      new URL(respuesta.url()).pathname === '/api/proveedores',
  );
  await page.getByRole('button', { name: 'Guardar proveedor', exact: true }).click();
  const respuesta = await repetida;
  expect(respuesta.request().headers()['idempotency-key']).toBe(clave);
  expect(await respuesta.json()).toEqual(original);
  await expect(page).toHaveURL(new RegExp(`/proveedores/${original.id}$`));
  expect(await descriptores(page)).toEqual([]);
  const lista = await page.request.get(
    `/api/proveedores?denominacion=${encodeURIComponent(`Proveedor006 ${marca}`)}`,
    { headers },
  );
  expect(((await lista.json()) as { totalElementos: number }).totalElementos).toBe(1);
  const replay = await page.request.post('/api/proveedores', {
    headers: await escritura(page.request, headers, clave),
    data: cuerpo,
  });
  expect(await replay.json()).toEqual(original);
  for (const [accion, etiqueta, estado] of [
    ['desactivar', 'Desactivar proveedor', 'Inactivo'],
    ['reactivar', 'Reactivar proveedor', 'Activo'],
  ] as const) {
    await page.route(
      `**/api/proveedores/${original.id}/${accion}`,
      async (ruta) => {
        expect(ruta.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
        expect((await ruta.fetch()).status()).toBe(200);
        await ruta.abort('failed');
      },
      { times: 1 },
    );
    await page.getByRole('button', { name: etiqueta, exact: true }).click();
    await expect(panel(page).locator('[data-estado=PENDIENTE]')).toHaveCount(1);
    await recuperar(
      page,
      accion === 'desactivar' ? 'Desactivación de proveedor' : 'Reactivación de proveedor',
    );
    await page.reload();
    await expect(page.locator('app-proveedor-detalle .estado')).toHaveText(estado);
    expect(await descriptores(page)).toEqual([]);
  }
});

for (const tipo of ['proveedor', 'solicitud'] as const) {
  test(`CI-04/07: alta de ${tipo} confirmada después del error bloquea el formulario anterior y permite una intención nueva`, async ({
    page,
    context,
  }) => {
    test.setTimeout(120000);
    const proveedor = tipo === 'proveedor';
    const endpoint = proveedor ? '/api/proveedores' : '/api/solicitudes';
    const rutaNueva = proveedor ? '/proveedores/nuevo' : '/solicitudes/nueva';
    const operacion = proveedor ? 'Alta de proveedor' : 'Alta de solicitud';
    const guardar = () =>
      page.getByRole('button', {
        name: proveedor ? 'Guardar proveedor' : 'Crear borrador',
        exact: true,
      });
    await acceder(page, proveedor ? 'ADMINISTRADOR' : 'SOLICITANTE');
    let enviados = 0;
    page.on('request', (peticion) => {
      if (peticion.method() === 'POST' && new URL(peticion.url()).pathname === endpoint) enviados++;
    });
    for (const modo of ['manual', 'otra-pestana'] as const) {
      await page.goto(rutaNueva);
      const marca = randomUUID();
      const nombre = `Intención006 ${tipo} ${marca}`;
      if (proveedor) await rellenarProveedor(page, nombre, `FICTICIO-${marca}`);
      else await page.getByLabel('Asunto *', { exact: false }).fill(nombre);
      let original!: { id: string };
      let clave = '';
      await page.route(
        `**${endpoint}`,
        async (ruta) => {
          if (ruta.request().method() !== 'POST') return ruta.continue();
          clave = ruta.request().headers()['idempotency-key'];
          const respuesta = await ruta.fetch();
          expect(respuesta.status()).toBe(201);
          original = await respuesta.json();
          await ruta.abort('failed');
        },
        { times: 1 },
      );
      const antes = enviados;
      await guardar().click();
      await expect(panel(page).locator('[data-estado=PENDIENTE]')).toHaveCount(1);
      await expect(guardar()).toBeEnabled();
      if (modo === 'manual') await recuperar(page, operacion);
      else {
        const segunda = await context.newPage();
        await segunda.goto('/mi-cuenta');
        await expect(panel(segunda).getByRole('status')).toContainText('Resultado recuperado');
        await expect(panel(page).getByRole('status')).toContainText('Resultado recuperado');
        await segunda.close();
      }
      await expect(guardar()).toBeDisabled();
      const enlace = page.locator('a.resultado-alta');
      await expect(enlace).toHaveAttribute('href', `${endpoint.slice(4)}/${original.id}`);
      if (proveedor)
        await page
          .getByLabel('Identificador fiscal *', { exact: false })
          .fill(`OTRO-${randomUUID()}`);
      else
        await page
          .getByLabel('Asunto *', { exact: false })
          .fill(`Entrada distinta ${randomUUID()}`);
      await page.locator('form').dispatchEvent('submit');
      await expect(guardar()).toBeDisabled();
      expect(enviados).toBe(antes + 1);
      expect(await descriptores(page)).toEqual([]);
      await captura(page, `alta-${tipo}-${modo}-confirmada`);
      await enlace.click();
      await page
        .getByRole('link', {
          name: proveedor ? 'Volver a proveedores' : 'Volver a solicitudes',
          exact: true,
        })
        .click();
      await page
        .getByRole('link', { name: proveedor ? 'Nuevo proveedor' : 'Nueva solicitud', exact: true })
        .click();
      // Navegación SPA: el servicio conserva el resultado anterior en memoria.
      await expect(panel(page).getByRole('status')).toContainText('Resultado recuperado');
      const nuevaMarca = randomUUID();
      if (proveedor)
        await rellenarProveedor(page, `Nueva intención ${nuevaMarca}`, `FICTICIO-${nuevaMarca}`);
      else
        await page.getByLabel('Asunto *', { exact: false }).fill(`Nueva intención ${nuevaMarca}`);
      await expect(guardar()).toBeEnabled();
      const nuevaRespuesta = page.waitForResponse(
        (respuesta) =>
          respuesta.request().method() === 'POST' && new URL(respuesta.url()).pathname === endpoint,
      );
      await guardar().click();
      const nueva = await nuevaRespuesta;
      expect(nueva.status()).toBe(201);
      expect(nueva.request().headers()['idempotency-key']).not.toBe(clave);
      expect(enviados).toBe(antes + 2);
      await expect(page).toHaveURL(
        proveedor ? /\/proveedores\/[0-9a-f-]{36}$/ : /\/solicitudes\/[0-9a-f-]{36}\/editar$/,
      );
    }
  });
}

test('CI-06/07: alta de solicitud se recupera al recargar y al reabrir sin duplicar', async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await acceder(page, 'SOLICITANTE');
  for (const modo of ['recarga', 'reapertura'] as const) {
    let original!: DetalleSolicitud;
    let post = 0;
    const interceptar = async (ruta: Route) => {
      if (ruta.request().method() !== 'POST') return ruta.continue();
      post++;
      const respuesta = await ruta.fetch();
      expect(respuesta.status()).toBe(201);
      original = (await respuesta.json()) as DetalleSolicitud;
      await ruta.abort('failed');
    };
    await page.route('**/api/solicitudes', interceptar, { times: 1 });
    await crearBorrador(page, `Recuperación ${modo} ${randomUUID()}`);
    await expect(panel(page).getByRole('status')).toContainText('pendiente');
    await verificarAlmacenamientoOperaciones(page);
    const anterior = await descriptores(page);
    expect(anterior).toHaveLength(1);
    if (modo === 'recarga') await page.reload();
    else {
      await page.close();
      page = await context.newPage();
      await page.goto('/solicitudes/nueva');
    }
    await expect(panel(page).getByRole('status')).toContainText('Resultado recuperado');
    expect(post).toBe(1);
    expect(await descriptores(page)).toEqual([]);
    await panel(page).getByRole('link', { name: 'Abrir resultado', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/solicitudes/${original.id}$`));
    await expect(page.getByRole('heading', { name: original.asunto, exact: true })).toBeVisible();
    await captura(page, `borrador-${modo}`);
  }
});

test('CI-04/06/07: presentar y decidir recuperan commit perdido con replay inmutable', async ({
  browser,
}) => {
  test.setTimeout(180000);
  const admin = await sesionApi('ADMINISTRADOR');
  const autor = await sesionApi('SOLICITANTE');
  const supervisor = await sesionApi('SUPERVISOR');
  const contextoAutor = await browser.newContext({ baseURL });
  const contextoSupervisor = await browser.newContext({ baseURL });
  try {
    const paginaAutor = await contextoAutor.newPage();
    const paginaSupervisor = await contextoSupervisor.newPage();
    await acceder(paginaAutor, 'SOLICITANTE');
    await acceder(paginaSupervisor, 'SUPERVISOR');
    for (const accion of ['aprobar', 'rechazar'] as const) {
      const detalle = await borradorCompleto(
        admin,
        autor,
        supervisor,
        `Decisión recuperada ${randomUUID()}`,
      );
      const ruta = `/api/solicitudes/${detalle.id}`;
      await paginaAutor.goto(`/solicitudes/${detalle.id}`);
      let clavePresentar = '';
      let resultadoPresentar: unknown;
      await paginaAutor.route(
        `**${ruta}/presentar`,
        async (interceptada) => {
          clavePresentar = interceptada.request().headers()['idempotency-key'];
          const respuesta = await interceptada.fetch();
          expect(respuesta.status()).toBe(200);
          resultadoPresentar = await respuesta.json();
          await interceptada.abort('failed');
        },
        { times: 1 },
      );
      await paginaAutor.getByRole('button', { name: 'Presentar solicitud', exact: true }).click();
      await paginaAutor.getByRole('button', { name: 'Confirmar y presentar', exact: true }).click();
      await expect(panel(paginaAutor).locator('[data-estado=PENDIENTE]')).toHaveCount(1);
      await recuperar(paginaAutor, 'Presentación de solicitud');
      await paginaSupervisor.goto(`/solicitudes/${detalle.id}`);
      await paginaSupervisor
        .getByRole('button', {
          name: accion === 'aprobar' ? 'Aprobar solicitud' : 'Rechazar solicitud',
          exact: true,
        })
        .click();
      if (accion === 'rechazar')
        await paginaSupervisor
          .getByLabel('Motivo de rechazo *', { exact: true })
          .fill('Motivo ficticio para recuperación006.');
      await paginaSupervisor.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
      let claveDecision = '';
      let entrada: unknown;
      let resultado: unknown;
      await paginaSupervisor.route(
        `**${ruta}/${accion}`,
        async (interceptada) => {
          claveDecision = interceptada.request().headers()['idempotency-key'];
          entrada = interceptada.request().postDataJSON();
          const respuesta = await interceptada.fetch();
          expect(respuesta.status()).toBe(200);
          resultado = await respuesta.json();
          await interceptada.abort('failed');
        },
        { times: 1 },
      );
      await paginaSupervisor
        .getByRole('button', {
          name: accion === 'aprobar' ? 'Confirmar aprobación' : 'Confirmar rechazo',
          exact: true,
        })
        .click();
      await expect(panel(paginaSupervisor).locator('[data-estado=PENDIENTE]')).toHaveCount(1);
      await verificarAlmacenamientoOperaciones(paginaSupervisor);
      await paginaSupervisor.reload();
      await expect(panel(paginaSupervisor).getByRole('status')).toContainText(
        'Resultado recuperado',
      );
      await expect(paginaSupervisor.locator('.encabezado .estado')).toHaveText(
        accion === 'aprobar' ? 'Aprobada' : 'Rechazada',
      );
      expect(await descriptores(paginaSupervisor)).toEqual([]);
      const replay = await supervisor.api.post(`${ruta}/${accion}`, {
        headers: await escritura(supervisor.api, supervisor.headers, claveDecision),
        data: entrada,
      });
      expect(replay.status()).toBe(200);
      expect(await replay.json()).toEqual(resultado);
      const presentacionHistorica = await autor.api.post(`${ruta}/presentar`, {
        headers: await escritura(autor.api, autor.headers, clavePresentar),
        data: { version: detalle.version },
      });
      expect(await presentacionHistorica.json()).toEqual(resultadoPresentar);
    }
  } finally {
    await contextoAutor.close();
    await contextoSupervisor.close();
    await admin.api.dispose();
    await autor.api.dispose();
    await supervisor.api.dispose();
  }
});

test('CI-07: dos pestañas, 400 tardío y commit con respuesta perdida mantienen la única clave', async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await acceder(page, 'SOLICITANTE');
  const segunda = await context.newPage();
  await segunda.goto('/solicitudes/nueva');
  await expect(
    segunda.getByRole('heading', { name: 'Nueva solicitud', exact: true }),
  ).toBeFocused();
  const rechazada = senal();
  const liberar = senal();
  let claveA = '';
  let claveB = '';
  let original!: DetalleSolicitud;
  const asunto = `Dos pestañas006 ${randomUUID()}`;
  await page.route(
    '**/api/solicitudes',
    async (ruta) => {
      if (ruta.request().method() !== 'POST') return ruta.continue();
      claveA = ruta.request().headers()['idempotency-key'];
      const respuesta = await ruta.fetch({ postData: JSON.stringify({ asunto: 'x' }) });
      expect(respuesta.status()).toBe(400);
      rechazada.resolver();
      await liberar.promesa;
      await ruta.fulfill({ response: respuesta });
    },
    { times: 1 },
  );
  await crearBorrador(page, asunto);
  await rechazada.promesa;
  await segunda.route(
    '**/api/solicitudes',
    async (ruta) => {
      if (ruta.request().method() !== 'POST') return ruta.continue();
      claveB = ruta.request().headers()['idempotency-key'];
      const respuesta = await ruta.fetch();
      expect(respuesta.status()).toBe(201);
      original = (await respuesta.json()) as DetalleSolicitud;
      await ruta.abort('failed');
      liberar.resolver();
    },
    { times: 1 },
  );
  await segunda.getByLabel('Asunto *', { exact: false }).fill(asunto);
  await segunda.getByRole('button', { name: 'Crear borrador', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Revisa');
  await expect(panel(segunda).locator('[data-estado=PENDIENTE]')).toHaveCount(1);
  expect(claveB).toBe(claveA);
  expect((await descriptores(page))[0].clave).toBe(claveA);
  const replay = page.waitForResponse(
    (respuesta) =>
      respuesta.request().method() === 'POST' &&
      new URL(respuesta.url()).pathname === '/api/solicitudes',
  );
  await page.getByRole('button', { name: 'Crear borrador', exact: true }).click();
  const respuesta = await replay;
  expect(respuesta.request().headers()['idempotency-key']).toBe(claveA);
  expect(await respuesta.json()).toEqual(original);
  await expect(page).toHaveURL(new RegExp(`/solicitudes/${original.id}/editar$`));
  await expect.poll(() => descriptores(page)).toEqual([]);
  const consulta = await page.request.get(`/api/solicitudes?asunto=${encodeURIComponent(asunto)}`, {
    headers: { Authorization: respuesta.request().headers()['authorization'] },
  });
  expect(((await consulta.json()) as { totalElementos: number }).totalElementos).toBe(1);
  await segunda.close();
});

test('CI-05/07: permiso revocado antes de recuperar y replay no concede acceso', async ({
  page,
}) => {
  test.setTimeout(120000);
  const admin = await sesionApi('ADMINISTRADOR');
  const autor = await sesionApi('SOLICITANTE');
  const supervisor = await sesionApi('SUPERVISOR');
  let retirado = false;
  try {
    const detalle = await borradorCompleto(
      admin,
      autor,
      supervisor,
      `Revocación006 ${randomUUID()}`,
    );
    const ruta = `/api/solicitudes/${detalle.id}`;
    const presentada = await autor.api.post(`${ruta}/presentar`, {
      headers: await escritura(autor.api, autor.headers),
      data: { version: detalle.version },
    });
    expect(presentada.status()).toBe(200);
    const version = ((await presentada.json()) as { version: number }).version;
    await acceder(page, 'SUPERVISOR');
    await page.goto(`/solicitudes/${detalle.id}`);
    await page.getByRole('button', { name: 'Aprobar solicitud', exact: true }).click();
    await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
    let clave = '';
    await page.route(
      `**${ruta}/aprobar`,
      async (interceptada) => {
        clave = interceptada.request().headers()['idempotency-key'];
        expect((await interceptada.fetch()).status()).toBe(200);
        await interceptada.abort('failed');
      },
      { times: 1 },
    );
    await page.getByRole('button', { name: 'Confirmar aprobación', exact: true }).click();
    await expect(panel(page).locator('[data-estado=PENDIENTE]')).toHaveCount(1);
    expect(
      await sqlFixture(
        `SELECT count(*) FROM gestion.usuarios_roles WHERE usuario_id='${uuidFixture(supervisor.usuarioId)}' AND rol='SUPERVISOR'`,
      ),
    ).toBe('1');
    retirado = true;
    await sqlFixture(
      `DELETE FROM gestion.usuarios_roles WHERE usuario_id='${uuidFixture(supervisor.usuarioId)}' AND rol='SUPERVISOR'`,
    );
    const consulta = page.waitForResponse((respuesta) =>
      respuesta.url().endsWith(`/api/operaciones-idempotentes/${clave}`),
    );
    await panel(page)
      .getByRole('button', { name: 'Consultar resultado: Aprobación de solicitud', exact: true })
      .click();
    expect((await consulta).status()).toBe(404);
    await expect(panel(page).getByRole('status')).toContainText(
      'No se ha localizado un resultado visible',
    );
    expect((await descriptores(page))[0].clave).toBe(clave);
    await expect(
      panel(page).getByRole('link', { name: 'Abrir resultado', exact: true }),
    ).toHaveCount(0);
    const replay = await supervisor.api.post(`${ruta}/aprobar`, {
      headers: await escritura(supervisor.api, supervisor.headers, clave),
      data: { version, comentario: null },
    });
    expect(replay.status()).toBe(403);
    expect(await replay.json()).toEqual({ error: 'ACCESO_NO_PERMITIDO' });
    await restaurarSupervisor(supervisor.usuarioId);
    retirado = false;
    await recuperar(page, 'Aprobación de solicitud');
    expect(await descriptores(page)).toEqual([]);
  } finally {
    if (retirado) await restaurarSupervisor(supervisor.usuarioId);
    await admin.api.dispose();
    await autor.api.dispose();
    await supervisor.api.dispose();
  }
});

test('CI-06/07: reinicio real conserva resultado de alta y descriptor recuperable', async ({
  page,
}) => {
  test.setTimeout(150000);
  await acceder(page, 'SOLICITANTE');
  let original!: DetalleSolicitud;
  await page.route(
    '**/api/solicitudes',
    async (ruta) => {
      if (ruta.request().method() !== 'POST') return ruta.continue();
      const respuesta = await ruta.fetch();
      expect(respuesta.status()).toBe(201);
      original = (await respuesta.json()) as DetalleSolicitud;
      await ruta.abort('failed');
    },
    { times: 1 },
  );
  await crearBorrador(page, `Reinicio real006 ${randomUUID()}`);
  await expect(panel(page).locator('[data-estado=PENDIENTE]')).toHaveCount(1);
  const anterior = await descriptores(page);
  await reiniciarBackend();
  await expect
    .poll(
      async () => {
        try {
          return (await page.request.get('/api/salud', { timeout: 3000 })).status();
        } catch {
          return 0;
        }
      },
      { timeout: 60000, intervals: [250, 500, 1000] },
    )
    .toBe(200);
  expect(await descriptores(page)).toEqual(anterior);
  await page.reload();
  await expect(panel(page).getByRole('status')).toContainText('Resultado recuperado');
  expect(await descriptores(page)).toEqual([]);
  await panel(page).getByRole('link', { name: 'Abrir resultado', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/solicitudes/${original.id}$`));
  await expect(page.getByRole('heading', { name: original.asunto, exact: true })).toBeVisible();
});

test('CI-07/09: bloqueo PostgreSQL real produce progreso acotado en segunda pestaña', async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const admin = await sesionApi('ADMINISTRADOR');
  let bloqueo: Promise<string> | undefined;
  const aplicacion = `e2e006_${randomUUID().replaceAll('-', '')}`;
  const bloqueoListo = senal();
  const diagnostico: unknown[] = [];
  try {
    const alta = await admin.api.post('/api/proveedores', {
      headers: await escritura(admin.api, admin.headers),
      data: {
        tipo: 'PROFESIONAL',
        denominacion: `Progreso006 ${randomUUID()}`,
        paisFiscal: 'ES',
        identificadorFiscal: `FICTICIO-${randomUUID()}`,
        correoContacto: null,
        telefonoContacto: null,
      },
    });
    expect(alta.status()).toBe(201);
    const proveedor = (await alta.json()) as Proveedor;
    page.on('response', async (respuesta) => {
      if (respuesta.url().endsWith(`/api/proveedores/${proveedor.id}/desactivar`))
        diagnostico.push({
          paso: 'post',
          status: respuesta.status(),
          codigo: ((await respuesta.json()) as { error?: string }).error,
        });
    });
    await acceder(page, 'ADMINISTRADOR');
    await page.goto(`/proveedores/${proveedor.id}`);
    const segunda = await context.newPage();
    await segunda.goto(`/proveedores/${proveedor.id}`);
    await expect(
      segunda.getByRole('button', { name: 'Desactivar proveedor', exact: true }),
    ).toBeVisible();
    await page.route(
      `**/api/proveedores/${proveedor.id}/desactivar`,
      async (ruta) => {
        const clave = uuidFixture(ruta.request().headers()['idempotency-key']);
        const originales = await ruta.request().allHeaders();
        const cookieOriginal = originales['cookie']
          ?.split(';')
          .map((valor) => valor.trim())
          .find((valor) => valor.startsWith('XSRF-TOKEN='))
          ?.slice('XSRF-TOKEN='.length);
        diagnostico.push({
          paso: 'peticion-original',
          cabeceraPresente: !!originales['x-xsrf-token'],
          cookieOriginalPresente: !!cookieOriginal,
          csrfOriginalCoincide:
            originales['x-xsrf-token'] === decodeURIComponent(cookieOriginal ?? ''),
        });
        diagnostico.push({
          paso: 'antes-bloqueo',
          csrfCoincide: ruta.request().headers()['x-xsrf-token'] === (await csrf(page.request)),
        });
        const advisory = createHash('sha256')
          .update(`${admin.usuarioId}:${clave}`)
          .digest()
          .readBigInt64BE()
          .toString();
        bloqueo = sqlFixture(
          `BEGIN; SET LOCAL application_name='${aplicacion}'; SELECT pg_advisory_xact_lock(${advisory}); SELECT pg_sleep(6); COMMIT;`,
        );
        await expect
          .poll(
            () =>
              sqlFixture(
                `SELECT count(*) FROM pg_stat_activity WHERE application_name='${aplicacion}' AND wait_event='PgSleep'`,
              ),
            { timeout: 3000, intervals: [50, 100] },
          )
          .toBe('1');
        diagnostico.push({
          paso: 'despues-bloqueo',
          csrfCoincide: ruta.request().headers()['x-xsrf-token'] === (await csrf(page.request)),
        });
        // La pausa de DevTools permite que otra pestaña rote la cookie mientras
        // la cabecera ya está construida. Enviar el par ORIGINAL reproduce la
        // petición producida por Angular, sin fabricar ni renovar credenciales.
        expect(originales['x-xsrf-token']).toBe(decodeURIComponent(cookieOriginal ?? ''));
        const respuestaPendiente = ruta.fetch({ headers: originales });
        bloqueoListo.resolver();
        await ruta.fulfill({ response: await respuestaPendiente });
      },
      { times: 1 },
    );
    const primeraPeticion = page.waitForRequest(
      (peticion) =>
        peticion.method() === 'POST' &&
        peticion.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
    );
    const primeraRespuesta = page.waitForResponse(
      (respuesta) =>
        respuesta.request().method() === 'POST' &&
        respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
    );
    await page.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
    const primera = await primeraPeticion;
    await bloqueoListo.promesa;
    const clave = primera.headers()['idempotency-key'];
    await expect
      .poll(
        async () => {
          const consulta = await admin.api.get(`/api/operaciones-idempotentes/${clave}`, {
            headers: admin.headers,
          });
          diagnostico.push({
            paso: 'consulta',
            status: consulta.status(),
            codigo: ((await consulta.json()) as { error?: string }).error,
          });
          return consulta.status() === 200
            ? ((await consulta.json()) as { estado: string }).estado
            : '';
        },
        { timeout: 2000, intervals: [50, 100] },
      )
      .toBe('EN_PROGRESO');
    await expect(
      panel(segunda).getByRole('button', {
        name: 'Consultar resultado: Desactivación de proveedor',
        exact: true,
      }),
    ).toBeVisible();
    await panel(segunda)
      .getByRole('button', { name: 'Consultar resultado: Desactivación de proveedor', exact: true })
      .click();
    await expect(panel(segunda).getByRole('status')).toContainText('Operación pendiente.');
    const inicio = performance.now();
    const segundaRespuesta = segunda.waitForResponse(
      (respuesta) =>
        respuesta.request().method() === 'POST' &&
        respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
    );
    await segunda.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
    const respuesta = await segundaRespuesta;
    const observadoMs = Math.round(performance.now() - inicio);
    diagnostico.push({
      paso: 'espera-duplicado',
      observadoMs,
      status: respuesta.status(),
      esperaMaximaServidorMs: 3000,
    });
    expect(respuesta.request().headers()['idempotency-key']).toBe(
      primera.headers()['idempotency-key'],
    );
    expect(respuesta.status()).toBe(409);
    expect(respuesta.headers()['retry-after']).toBe('1');
    expect(await respuesta.json()).toEqual({ error: 'OPERACION_EN_PROGRESO' });
    await expect(panel(segunda).locator('[data-estado=PENDIENTE]')).toHaveCount(1);
    await test.info().attach('espera-observada', {
      body: JSON.stringify({
        escenario: 'duplicado con advisory lock PostgreSQL de6s',
        observadoMs,
        resultado: 409,
      }),
      contentType: 'application/json',
    });
    expect((await primeraRespuesta).status()).toBe(409);
    await bloqueo;
    const reintento = page.waitForResponse(
      (respuesta) =>
        respuesta.request().method() === 'POST' &&
        respuesta.url().endsWith(`/proveedores/${proveedor.id}/desactivar`),
    );
    await page.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
    const reintentada = await reintento;
    expect(reintentada.status()).toBe(200);
    expect(reintentada.request().headers()['idempotency-key']).toBe(clave);
    await expect(panel(segunda).getByRole('status')).toContainText('Resultado recuperado');
    const final = await admin.api.get(`/api/proveedores/${proveedor.id}`, {
      headers: admin.headers,
    });
    expect(await final.json()).toMatchObject({ version: proveedor.version + 1, activo: false });
    expect(await descriptores(segunda)).toEqual([]);
    await captura(segunda, 'progreso-recuperado');
    await segunda.close();
  } finally {
    if (bloqueo) await bloqueo;
    const diagnosticoRuta = test.info().outputPath('diagnostico-progreso.json');
    await writeFile(diagnosticoRuta, JSON.stringify(diagnostico));
    await test
      .info()
      .attach('diagnostico-progreso', { path: diagnosticoRuta, contentType: 'application/json' });
    await admin.api.dispose();
  }
});
