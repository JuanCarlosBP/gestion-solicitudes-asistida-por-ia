import { APIRequestContext, expect, Page, request, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { DetalleSolicitud, ResultadoDecision } from '../src/app/solicitudes/solicitud-modelo';

type RolDemo = 'ADMINISTRADOR' | 'SOLICITANTE' | 'SUPERVISOR' | 'AUDITOR';
const baseURL = process.env['BASE_URL'] ?? 'http://127.0.0.1:18080';
const correoRol = (rol: RolDemo) =>
  process.env[`DEMO_${rol}_CORREO`] ?? `${rol.toLowerCase()}@demo.invalid`;
const claveRol = (rol: RolDemo) =>
  process.env[`DEMO_${rol}_CLAVE`] ?? `Ejemplo local ${rol.toLowerCase()} 2026`;

async function acceder(page: Page, rol: RolDemo, correo = correoRol(rol)) {
  await page.goto('/acceso');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(claveRol(rol));
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/mi-cuenta$/);
}
async function csrf(api: APIRequestContext): Promise<string> {
  const cookies = (await api.storageState()).cookies;
  return decodeURIComponent(cookies.find((cookie) => cookie.name === 'XSRF-TOKEN')?.value ?? '');
}
async function escritura(api: APIRequestContext, headers: Record<string, string>) {
  return { ...headers, 'X-XSRF-TOKEN': await csrf(api) };
}
async function sesionApi(rol: RolDemo, correo = correoRol(rol)) {
  const api = await request.newContext({ baseURL });
  await api.get('/api/autenticacion/csrf');
  const respuesta = await api.post('/api/autenticacion/iniciar-sesion', {
    data: { correo, contrasena: claveRol(rol) },
    headers: { 'X-XSRF-TOKEN': await csrf(api) },
  });
  expect(respuesta.status()).toBe(200);
  const acceso = (await respuesta.json()) as {
    accessToken: string;
    usuario: { id: string; nombreVisible: string };
  };
  return {
    api,
    usuario: { id: acceso.usuario.id, nombreVisible: acceso.usuario.nombreVisible },
    headers: { Authorization: `Bearer ${acceso.accessToken}` },
  };
}
type Sesion = Awaited<ReturnType<typeof sesionApi>>;
async function consultar(sesion: Sesion, id: string): Promise<DetalleSolicitud> {
  const respuesta = await sesion.api.get(`/api/solicitudes/${id}`, { headers: sesion.headers });
  expect(respuesta.status()).toBe(200);
  return (await respuesta.json()) as DetalleSolicitud;
}
async function presentada(admin: Sesion, autor: Sesion, supervisor: Sesion, asunto: string) {
  const proveedor = await admin.api.post('/api/proveedores', {
    headers: await escritura(admin.api, { ...admin.headers, 'Idempotency-Key': randomUUID() }),
    data: {
      tipo: 'PROFESIONAL',
      denominacion: `Proveedor aprobaciones ${randomUUID()}`,
      paisFiscal: 'ES',
      identificadorFiscal: `FICTICIO-${randomUUID()}`,
      correoContacto: null,
      telefonoContacto: null,
    },
  });
  expect(proveedor.status()).toBe(201);
  const proveedorId = ((await proveedor.json()) as { id: string }).id;
  const alta = await autor.api.post('/api/solicitudes', {
    headers: await escritura(autor.api, { ...autor.headers, 'Idempotency-Key': randomUUID() }),
    data: { asunto },
  });
  expect(alta.status()).toBe(201);
  const borrador = (await alta.json()) as DetalleSolicitud;
  const ruta = `/api/solicitudes/${borrador.id}`;
  const guardado = await autor.api.put(ruta, {
    headers: await escritura(autor.api, autor.headers),
    data: {
      asunto,
      descripcion: 'Solicitud ficticia para verificar decisiones con persistencia real.',
      proveedorId,
      supervisorId: supervisor.usuario.id,
      version: borrador.version,
      conceptos: [
        {
          id: null,
          descripcion: 'Servicio ficticio',
          cantidad: '2.500',
          unidad: 'HORA',
          precioUnitario: '4.1250',
          posicion: 1,
        },
        {
          id: null,
          descripcion: 'Material ficticio',
          cantidad: '3',
          unidad: 'UNIDAD',
          precioUnitario: '0.3350',
          posicion: 2,
        },
      ],
    },
  });
  expect(guardado.status()).toBe(200);
  const version = ((await guardado.json()) as DetalleSolicitud).version;
  const envio = await autor.api.post(`${ruta}/presentar`, {
    headers: await escritura(autor.api, { ...autor.headers, 'Idempotency-Key': randomUUID() }),
    data: { version },
  });
  expect(envio.status()).toBe(200);
  const detalle = await consultar(autor, borrador.id);
  expect(detalle.estado).toBe('PRESENTADA');
  expect(detalle.importeTotal).toBe('11.32');
  return detalle;
}
async function captura(page: Page, nombre: string, ancho: number) {
  await page.setViewportSize({ width: ancho, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: join(
      process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
      `frontend005-${nombre}-${ancho}.png`,
    ),
    fullPage: true,
  });
}
async function focoVisible(page: Page) {
  expect(
    await page.evaluate(() => {
      const control = document.activeElement as HTMLElement;
      const rect = control.getBoundingClientRect();
      const superior = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return !!superior && (control === superior || control.contains(superior));
    }),
  ).toBe(true);
}
async function tecladoDecision(
  page: Page,
  asunto: string,
  ancho: number,
  tipo: 'aprobación' | 'rechazo',
) {
  // Volver a revisar devuelve el foco al campo después del siguiente render.
  // Esperar ese efecto evita que interrumpa el recorrido que empieza en el título.
  await expect(page.locator('#texto-decision')).toBeFocused();
  await page.setViewportSize({ width: ancho, height: 900 });
  const titulo = page.getByRole('heading', { name: asunto, exact: true });
  await titulo.focus();
  await expect(titulo).toBeFocused();
  for (const control of [
    page.getByRole('button', { name: 'Aprobar solicitud', exact: true }),
    page.getByRole('button', { name: 'Rechazar solicitud', exact: true }),
    page.locator('#texto-decision'),
    page.getByRole('button', { name: 'Revisar decisión', exact: true }),
  ]) {
    await page.keyboard.press('Tab');
    await expect(control).toBeFocused();
    await focoVisible(page);
  }
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: `Confirmar ${tipo}`, exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: `Confirmar ${tipo}`, exact: true })).toBeFocused();
  await focoVisible(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Volver a revisar', exact: true })).toBeFocused();
  await focoVisible(page);
  await captura(page, `confirmacion-${tipo}`, ancho);
  await page.keyboard.press('Enter');
  await expect(page.locator('#texto-decision')).toBeFocused();
}
async function comprobarLectura(
  page: Page,
  detalle: DetalleSolicitud,
  estado: string,
  texto: string,
) {
  await page.goto(`/solicitudes/${detalle.id}`);
  await expect(page.getByRole('heading', { name: detalle.asunto, exact: true })).toBeVisible();
  await expect(page.locator('.encabezado .estado')).toHaveText(estado);
  await expect(page.locator('.resultado-decision')).toContainText(texto);
  await expect(page.locator('app-solicitud-decision')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Editar borrador', exact: true })).toHaveCount(0);
}
function fixturesExternos() {
  const ajeno = process.env['E2E_AJENO_CORREO'];
  const multiple = process.env['E2E_MULTIPLE_CORREO'];
  expect(ajeno, 'El coordinador debe proporcionar un SOLICITANTE ajeno ficticio').toBeTruthy();
  expect(
    multiple,
    'El coordinador debe proporcionar la cuenta ficticia de cuatro roles',
  ).toBeTruthy();
  return { ajeno: ajeno!, multiple: multiple! };
}

test('AP-01/03/04/06/07/08: aprobación confirmada, replay y lectores autorizados reales', async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  const externos = fixturesExternos();
  const sesiones: Sesion[] = [];
  try {
    const admin = await sesionApi('ADMINISTRADOR');
    sesiones.push(admin);
    const autor = await sesionApi('SOLICITANTE');
    sesiones.push(autor);
    const supervisor = await sesionApi('SUPERVISOR');
    sesiones.push(supervisor);
    const detalle = await presentada(admin, autor, supervisor, `Aprobación E2E ${randomUUID()}`);
    const ruta = `/api/solicitudes/${detalle.id}`;
    const comentario = 'Aprobación ficticia: conceptos y presupuesto revisados.';
    let resultado: ResultadoDecision;
    let cabeceras: Record<string, string> = {};
    let cuerpo: Record<string, unknown> = {};
    await test.step('Bandeja asignada y detalle conservan conceptos, total y proveedor', async () => {
      await acceder(page, 'SUPERVISOR');
      await page.getByRole('link', { name: 'Aprobaciones', exact: true }).click();
      await page.getByLabel('Asunto contiene', { exact: true }).fill(detalle.asunto);
      await page.getByRole('button', { name: 'Buscar', exact: true }).click();
      await expect(page.locator('.solicitud-tarjeta')).toHaveCount(1);
      for (const ancho of [360, 768, 1440]) await captura(page, 'bandeja', ancho);
      await page.getByRole('link', { name: detalle.asunto, exact: true }).click();
      await expect(page.locator('.importe-total')).toHaveText('11,32 €');
      await expect(
        page.getByRole('button', { name: 'Aprobar solicitud', exact: true }),
      ).toBeVisible();
    });
    await test.step('Validación, revisión y confirmación explícita con teclado', async () => {
      let peticiones = 0;
      const contar = (peticion: import('@playwright/test').Request) => {
        if (peticion.method() === 'POST' && peticion.url().endsWith('/aprobar')) peticiones++;
      };
      page.on('request', contar);
      await page.getByRole('button', { name: 'Aprobar solicitud', exact: true }).click();
      await page
        .getByLabel('Comentario de aprobación (opcional)', { exact: true })
        .fill('x'.repeat(501));
      await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
      await expect(page.locator('#decision-error')).toHaveText(
        'El comentario admite hasta 500 caracteres.',
      );
      await page
        .getByLabel('Comentario de aprobación (opcional)', { exact: true })
        .fill(comentario);
      await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
      await page.getByRole('button', { name: 'Volver a revisar', exact: true }).click();
      for (const ancho of [360, 768, 1440])
        await tecladoDecision(page, detalle.asunto, ancho, 'aprobación');
      expect(peticiones).toBe(0);
      page.off('request', contar);
      await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
      const respuestaPendiente = page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().endsWith(`${ruta}/aprobar`),
      );
      await page.getByRole('button', { name: 'Confirmar aprobación', exact: true }).click();
      const respuesta = await respuestaPendiente;
      expect(respuesta.status()).toBe(200);
      resultado = (await respuesta.json()) as ResultadoDecision;
      cabeceras = {
        Authorization: respuesta.request().headers()['authorization'],
        'Idempotency-Key': respuesta.request().headers()['idempotency-key'],
      };
      expect(respuesta.request().headers()['x-xsrf-token']).toBeTruthy();
      expect(cabeceras['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
      cuerpo = respuesta.request().postDataJSON() as Record<string, unknown>;
      expect(cuerpo).toEqual({ version: detalle.version, comentario });
      await expect(page.locator('.encabezado .estado')).toHaveText('Aprobada');
      await expect(page.getByRole('heading', { name: detalle.asunto, exact: true })).toBeFocused();
      for (const ancho of [360, 768, 1440]) await captura(page, 'aprobada', ancho);
    });
    await test.step('Replay exacto, clave incompatible y nueva decisión final', async () => {
      const repetida = await page.request.post(`${ruta}/aprobar`, {
        headers: await escritura(page.request, cabeceras),
        data: cuerpo,
      });
      expect(repetida.status()).toBe(200);
      expect(await repetida.json()).toEqual(resultado!);
      const incompatible = await page.request.post(`${ruta}/rechazar`, {
        headers: await escritura(page.request, cabeceras),
        data: { version: detalle.version, motivo: 'Rechazo ficticio incompatible' },
      });
      expect(incompatible.status()).toBe(409);
      expect(((await incompatible.json()) as { error: string }).error).toBe(
        'CLAVE_IDEMPOTENCIA_REUTILIZADA',
      );
      const nueva = await page.request.post(`${ruta}/aprobar`, {
        headers: await escritura(page.request, { ...cabeceras, 'Idempotency-Key': randomUUID() }),
        data: { version: resultado!.version, comentario: null },
      });
      expect(nueva.status()).toBe(409);
      expect(((await nueva.json()) as { error: string }).error).toBe('SOLICITUD_NO_DECIDIBLE');
      const final = await consultar(autor, detalle.id);
      expect(final.version).toBe(detalle.version + 1);
      expect(final.conceptos).toEqual(detalle.conceptos);
      expect(final.proveedor).toEqual(detalle.proveedor);
      expect(final.supervisorId).toBe(detalle.supervisorId);
      expect(final.decision).toMatchObject({
        tipo: 'APROBAR',
        actor: supervisor.usuario,
        comentario,
        motivo: null,
      });
      expect(final.decididoEn).toBe(resultado!.decididoEn);
      await page.reload();
      await expect(page.locator('.resultado-decision')).toContainText(comentario);
    });
    await test.step('Resultado visible a autor, auditor y administrador; tercero denegado', async () => {
      for (const rol of ['SOLICITANTE', 'AUDITOR', 'ADMINISTRADOR'] as RolDemo[]) {
        const contexto = await browser.newContext({ baseURL });
        try {
          const lector = await contexto.newPage();
          await acceder(lector, rol);
          await expect(lector.getByRole('link', { name: 'Aprobaciones', exact: true })).toHaveCount(
            0,
          );
          await comprobarLectura(lector, detalle, 'Aprobada', comentario);
          await lector.goto('/aprobaciones');
          await expect(lector).toHaveURL(/\/solicitudes$/);
        } finally {
          await contexto.close();
        }
      }
      const contexto = await browser.newContext({ baseURL });
      try {
        const tercero = await contexto.newPage();
        await acceder(tercero, 'SOLICITANTE', externos.ajeno);
        const lectura = tercero.waitForResponse((r) => r.url().endsWith(ruta));
        await tercero.goto(`/solicitudes/${detalle.id}`);
        expect((await lectura).status()).toBe(404);
        await expect(tercero.getByRole('alert')).toContainText('no existe o no está disponible');
        await expect(tercero.locator('.resultado-decision')).toHaveCount(0);
      } finally {
        await contexto.close();
      }
      await page.goto(`/aprobaciones?asunto=${encodeURIComponent(detalle.asunto)}`);
      await expect(page.locator('.solicitud-tarjeta')).toHaveCount(0);
      await expect(page.locator('.resultado-consulta')).toContainText('0 solicitudes');
    });
  } finally {
    for (const sesion of sesiones) await sesion.api.dispose();
  }
});

test('AP-02/03/07/08: multirrol restringido, rechazo validado y motivo visible', async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  const externos = fixturesExternos();
  const sesiones: Sesion[] = [];
  try {
    const admin = await sesionApi('ADMINISTRADOR');
    sesiones.push(admin);
    const autor = await sesionApi('SOLICITANTE');
    sesiones.push(autor);
    const supervisor = await sesionApi('SUPERVISOR');
    sesiones.push(supervisor);
    const multiple = await sesionApi('SOLICITANTE', externos.multiple);
    sesiones.push(multiple);
    const marca = `Multirrol E2E ${randomUUID()}`;
    const asignada = await presentada(admin, autor, multiple, `${marca} asignada`);
    const ajena = await presentada(admin, autor, supervisor, `${marca} ajena`);
    const propia = await presentada(admin, multiple, supervisor, `${marca} propia`);
    const motivo = 'Motivo ficticio: falta justificar el servicio <b>sin interpretar HTML</b>.';
    await test.step('Bandeja fuerza actor y PRESENTADA incluso con filtros de dirección', async () => {
      await acceder(page, 'SOLICITANTE', externos.multiple);
      const consulta = page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/api/solicitudes' && r.request().method() === 'GET',
      );
      await page.goto(
        `/aprobaciones?estado=RECHAZADA&supervisor=${supervisor.usuario.id}&asunto=${encodeURIComponent(marca)}`,
      );
      const respuesta = await consulta;
      expect(respuesta.status()).toBe(200);
      const parametros = new URL(respuesta.url()).searchParams;
      expect(parametros.get('estado')).toBe('PRESENTADA');
      expect(parametros.get('supervisor')).toBe(multiple.usuario.id);
      const pagina = (await respuesta.json()) as {
        elementos: DetalleSolicitud[];
        totalElementos: number;
      };
      expect(pagina.totalElementos).toBe(1);
      expect(pagina.elementos.map((s) => s.id)).toEqual([asignada.id]);
      await expect(page.getByLabel('Estado', { exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Supervisor (UUID)', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('link', { name: asignada.asunto, exact: true })).toBeVisible();
    });
    await test.step('Multirrol no decide ajena ni propia; administrador solo tampoco decide', async () => {
      for (const detalle of [ajena, propia]) {
        await page.goto(`/solicitudes/${detalle.id}`);
        await expect(
          page.getByRole('heading', { name: detalle.asunto, exact: true }),
        ).toBeVisible();
        await expect(page.locator('app-solicitud-decision')).toHaveCount(0);
        const rechazo = await multiple.api.post(`/api/solicitudes/${detalle.id}/aprobar`, {
          headers: await escritura(multiple.api, {
            ...multiple.headers,
            'Idempotency-Key': randomUUID(),
          }),
          data: { version: detalle.version, comentario: null },
        });
        expect(rechazo.status()).toBe(403);
      }
      const rechazoAdmin = await admin.api.post(`/api/solicitudes/${asignada.id}/aprobar`, {
        headers: await escritura(admin.api, { ...admin.headers, 'Idempotency-Key': randomUUID() }),
        data: { version: asignada.version, comentario: null },
      });
      expect(rechazoAdmin.status()).toBe(403);
      const contexto = await browser.newContext({ baseURL });
      try {
        const ajeno = await contexto.newPage();
        await acceder(ajeno, 'SUPERVISOR');
        const respuesta = ajeno.waitForResponse((r) =>
          r.url().endsWith(`/api/solicitudes/${asignada.id}`),
        );
        await ajeno.goto(`/solicitudes/${asignada.id}`);
        expect((await respuesta).status()).toBe(404);
        await expect(ajeno.locator('app-solicitud-decision')).toHaveCount(0);
      } finally {
        await contexto.close();
      }
    });
    await test.step('Rechazo exige motivo válido y confirmación con teclado', async () => {
      await page.goto(`/solicitudes/${asignada.id}`);
      await page.getByRole('button', { name: 'Rechazar solicitud', exact: true }).click();
      const campo = page.getByLabel('Motivo de rechazo *', { exact: true });
      await expect(campo).toBeFocused();
      for (const invalido of ['', 'Corto', 'x'.repeat(1001)]) {
        await campo.fill(invalido);
        await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
        await expect(campo).toHaveAttribute('aria-invalid', 'true');
        await expect(
          page.getByRole('button', { name: 'Confirmar rechazo', exact: true }),
        ).toHaveCount(0);
      }
      await campo.fill(motivo);
      await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
      await page.getByRole('button', { name: 'Volver a revisar', exact: true }).click();
      for (const ancho of [360, 768, 1440])
        await tecladoDecision(page, asignada.asunto, ancho, 'rechazo');
      await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
      const respuesta = page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          r.url().endsWith(`/api/solicitudes/${asignada.id}/rechazar`),
      );
      await page.getByRole('button', { name: 'Confirmar rechazo', exact: true }).click();
      expect((await respuesta).status()).toBe(200);
      await expect(page.locator('.encabezado .estado')).toHaveText('Rechazada');
      await expect(page.locator('.resultado-decision')).toContainText(motivo);
      await expect(page.locator('.resultado-decision b')).toHaveCount(0);
      for (const ancho of [360, 768, 1440]) await captura(page, 'rechazada', ancho);
      const final = await consultar(autor, asignada.id);
      expect(final.decision).toMatchObject({
        tipo: 'RECHAZAR',
        actor: multiple.usuario,
        motivo,
        comentario: null,
      });
      expect(final.conceptos).toEqual(asignada.conceptos);
      expect(final.proveedor).toEqual(asignada.proveedor);
    });
    await test.step('Motivo persiste y es visible a autor, auditor y administrador', async () => {
      await page.reload();
      await expect(page.locator('.resultado-decision')).toContainText(motivo);
      for (const rol of ['SOLICITANTE', 'AUDITOR', 'ADMINISTRADOR'] as RolDemo[]) {
        const contexto = await browser.newContext({ baseURL });
        try {
          const lector = await contexto.newPage();
          await acceder(lector, rol);
          await comprobarLectura(lector, asignada, 'Rechazada', motivo);
          await lector.goto(`/solicitudes?estado=RECHAZADA&asunto=${encodeURIComponent(marca)}`);
          await expect(lector.locator('.solicitud-tarjeta')).toHaveCount(1);
          await expect(lector.locator('.solicitud-tarjeta .estado')).toHaveText('Rechazada');
        } finally {
          await contexto.close();
        }
      }
      await page.goto(`/aprobaciones?asunto=${encodeURIComponent(marca)}`);
      await expect(page.locator('.resultado-consulta')).toContainText('0 solicitudes');
    });
  } finally {
    for (const sesion of sesiones) await sesion.api.dispose();
  }
});

test('AP-05/08: versión obsoleta y dos pestañas reales conservan la única decisión ganadora', async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  fixturesExternos();
  const sesiones: Sesion[] = [];
  try {
    const admin = await sesionApi('ADMINISTRADOR');
    sesiones.push(admin);
    const autor = await sesionApi('SOLICITANTE');
    sesiones.push(autor);
    const supervisor = await sesionApi('SUPERVISOR');
    sesiones.push(supervisor);
    const detalle = await presentada(admin, autor, supervisor, `Concurrencia E2E ${randomUUID()}`);
    const ruta = `/api/solicitudes/${detalle.id}`;
    const obsoleta = await supervisor.api.post(`${ruta}/aprobar`, {
      headers: await escritura(supervisor.api, {
        ...supervisor.headers,
        'Idempotency-Key': randomUUID(),
      }),
      data: { version: detalle.version - 1, comentario: null },
    });
    expect(obsoleta.status()).toBe(409);
    expect(((await obsoleta.json()) as { error: string }).error).toBe('VERSION_OBSOLETA');
    await acceder(page, 'SUPERVISOR');
    await page.goto(`/solicitudes/${detalle.id}`);
    const segunda = await context.newPage();
    await segunda.goto(`/solicitudes/${detalle.id}`);
    const motivo = 'Motivo ficticio conservado tras conflicto entre sesiones.';
    await page.getByRole('button', { name: 'Aprobar solicitud', exact: true }).click();
    await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
    await segunda.getByRole('button', { name: 'Rechazar solicitud', exact: true }).click();
    await segunda.getByLabel('Motivo de rechazo *', { exact: true }).fill(motivo);
    await segunda.getByRole('button', { name: 'Revisar decisión', exact: true }).click();
    const primeraRespuesta = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().endsWith(`${ruta}/aprobar`),
    );
    const segundaRespuesta = segunda.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().endsWith(`${ruta}/rechazar`),
    );
    await Promise.all([
      page.getByRole('button', { name: 'Confirmar aprobación', exact: true }).click(),
      segunda.getByRole('button', { name: 'Confirmar rechazo', exact: true }).click(),
    ]);
    const respuestas = await Promise.all([primeraRespuesta, segundaRespuesta]);
    expect(respuestas.map((r) => r.status()).sort()).toEqual([200, 409]);
    const indiceGanador = respuestas[0].status() === 200 ? 0 : 1;
    const ganadora = indiceGanador === 0 ? page : segunda;
    const perdedora = indiceGanador === 0 ? segunda : page;
    const estado = indiceGanador === 0 ? 'APROBADA' : 'RECHAZADA';
    const etiqueta = indiceGanador === 0 ? 'Aprobada' : 'Rechazada';
    const conflicto = respuestas[1 - indiceGanador];
    expect(((await conflicto.json()) as { error: string }).error).toBe('SOLICITUD_NO_DECIDIBLE');
    await expect(ganadora.locator('.encabezado .estado')).toHaveText(etiqueta);
    await expect(perdedora.getByRole('alert')).toContainText('ya no está pendiente de decisión');
    await expect(perdedora.locator('#texto-decision')).toHaveValue(
      indiceGanador === 0 ? motivo : '',
    );
    await expect(
      perdedora.getByRole('button', { name: 'Aprobar solicitud', exact: true }),
    ).toBeDisabled();
    await expect(
      perdedora.getByRole('button', { name: 'Rechazar solicitud', exact: true }),
    ).toBeDisabled();
    await captura(perdedora, 'conflicto', 768);
    await perdedora.getByRole('button', { name: 'Recargar estado actual', exact: true }).click();
    await expect(perdedora.locator('.encabezado .estado')).toHaveText(etiqueta);
    await expect(perdedora.locator('app-solicitud-decision')).toHaveCount(0);
    const final = await consultar(autor, detalle.id);
    expect(final.estado).toBe(estado);
    expect(final.version).toBe(detalle.version + 1);
    expect(final.decision?.tipo).toBe(indiceGanador === 0 ? 'APROBAR' : 'RECHAZAR');
    expect(final.conceptos).toEqual(detalle.conceptos);
    expect(final.proveedor).toEqual(detalle.proveedor);
    await segunda.close();
  } finally {
    for (const sesion of sesiones) await sesion.api.dispose();
  }
});
