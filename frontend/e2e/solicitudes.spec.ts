import { APIRequestContext, expect, Page, request, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { verificarAlmacenamientoOperaciones } from './operaciones-ayudas';

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
  return decodeURIComponent(cookies.find((c) => c.name === 'XSRF-TOKEN')?.value ?? '');
}
async function cabecerasEscritura(api: APIRequestContext, cabeceras: Record<string, string>) {
  // Una respuesta de autenticación puede rotar la cookie entre operaciones.
  // El CSRF se obtiene de la cookie vigente; identidad e idempotencia se conservan.
  return { ...cabeceras, 'X-XSRF-TOKEN': await csrf(api) };
}
async function sesionApi(rol: RolDemo) {
  const api = await request.newContext({ baseURL });
  await api.get('/api/autenticacion/csrf');
  const respuesta = await api.post('/api/autenticacion/iniciar-sesion', {
    data: { correo: correoRol(rol), contrasena: claveRol(rol) },
    headers: { 'X-XSRF-TOKEN': await csrf(api) },
  });
  expect(respuesta.status()).toBe(200);
  const acceso = (await respuesta.json()) as {
    accessToken: string;
    usuario: { id: string; nombreVisible: string };
  };
  return {
    api,
    usuario: acceso.usuario,
    headers: { Authorization: `Bearer ${acceso.accessToken}` },
  };
}
async function captura(page: Page, pantalla: string, ancho: number) {
  await page.setViewportSize({ width: ancho, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: join(
      process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
      `frontend-solicitudes-${pantalla}-${ancho}.png`,
    ),
    fullPage: true,
  });
}
async function concepto(
  page: Page,
  indice: number,
  descripcion: string,
  cantidad: string,
  precio: string,
) {
  await page.getByRole('button', { name: 'Añadir concepto', exact: true }).click();
  await page.getByLabel(`Descripción del concepto ${indice}`, { exact: true }).fill(descripcion);
  await page.getByLabel(`Cantidad del concepto ${indice}`, { exact: true }).fill(cantidad);
  await page.getByLabel(`Precio unitario del concepto ${indice}`, { exact: true }).fill(precio);
}
async function recorrerEditorConTeclado(page: Page, ancho: number) {
  await page.setViewportSize({ width: ancho, height: 900 });
  await expect(page.locator('.barra-resumen')).toHaveCSS('position', 'sticky');
  await page.getByRole('heading', { name: 'Editar borrador', exact: true }).focus();
  let controles = 0;
  let fin = false;
  for (let paso = 0; paso < 80; paso++) {
    await page.keyboard.press('Tab');
    const dato = await page.evaluate(() => {
      const control = document.activeElement as HTMLElement;
      const rectangulo = control.getBoundingClientRect();
      const superior = document.elementFromPoint(
        rectangulo.x + rectangulo.width / 2,
        rectangulo.y + rectangulo.height / 2,
      );
      return {
        etiqueta: control.getAttribute('aria-label') || control.id || control.textContent?.trim(),
        centroVisible: !!superior && (control === superior || control.contains(superior)),
        tipo: control.tagName,
        fin: control.tagName === 'A' && control.textContent?.trim() === 'Cancelar y volver',
      };
    });
    expect(
      dato.centroVisible,
      `${ancho}px, Tab ${paso}: ${dato.etiqueta} debe quedar visible sobre la barra`,
    ).toBe(true);
    expect(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A']).toContain(dato.tipo);
    controles++;
    if (dato.fin) {
      fin = true;
      break;
    }
  }
  expect(fin, 'La navegación llega a la última acción del editor').toBe(true);
  expect(controles).toBeGreaterThanOrEqual(20);
}

test('SCI-01–13: trece pasos completos con Angular, API y PostgreSQL reales', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  const ajenoCorreo = process.env['E2E_AJENO_CORREO'];
  expect(
    ajenoCorreo,
    'El coordinador prepara un SOLICITANTE ajeno ficticio antes de ejecutar',
  ).toBeTruthy();
  const marca = randomUUID();
  const asunto = `Solicitud E2E ${marca}`;
  const admin = await sesionApi('ADMINISTRADOR');
  const supervisor = await sesionApi('SUPERVISOR');
  let proveedorId = '';
  let ruta = '';
  let numero = '';
  let clavePresentacion = '';
  let versionPresentada = 0;
  let cabecerasPresentacion: Record<string, string> = {};
  let resultadoPresentacion: Record<string, unknown> = {};
  let escrituras = 0;
  let escriturasSinProteccion = 0;
  page.on('request', (peticion) => {
    if (
      new URL(peticion.url()).pathname.startsWith('/api/solicitudes') &&
      ['POST', 'PUT'].includes(peticion.method())
    ) {
      escrituras++;
      if (
        !peticion.headers()['authorization']?.startsWith('Bearer ') ||
        !peticion.headers()['x-xsrf-token']
      )
        escriturasSinProteccion++;
    }
  });
  try {
    const altaProveedor = await admin.api.post('/api/proveedores', {
      headers: await cabecerasEscritura(admin.api, {
        ...admin.headers,
        'Idempotency-Key': randomUUID(),
      }),
      data: {
        tipo: 'PROFESIONAL',
        denominacion: `Proveedor E2E ${marca}`,
        paisFiscal: 'ES',
        identificadorFiscal: `FICTICIO-${marca}`,
        correoContacto: null,
        telefonoContacto: null,
      },
    });
    expect(altaProveedor.status()).toBe(201);
    proveedorId = ((await altaProveedor.json()) as { id: string }).id;

    await test.step('01 SOLICITANTE crea borrador solo con asunto', async () => {
      await acceder(page, 'SOLICITANTE');
      await page.getByRole('link', { name: 'Solicitudes', exact: true }).click();
      await page.getByRole('link', { name: 'Nueva solicitud', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Nueva solicitud', exact: true }),
      ).toBeFocused();
      await page.getByLabel('Asunto *', { exact: true }).fill(asunto);
      await page.getByRole('button', { name: 'Crear borrador', exact: true }).click();
      await expect(page).toHaveURL(/\/solicitudes\/[0-9a-f-]{36}\/editar$/);
      ruta = new URL(page.url()).pathname.replace(/\/editar$/, '');
      await expect(
        page.getByRole('heading', { name: 'Editar borrador', exact: true }),
      ).toBeFocused();
      await expect(page.locator('.importe-estimado')).toHaveText('0,00 €');
    });
    await test.step('02 Añade los tres conceptos obligatorios', async () => {
      await concepto(page, 1, 'Material ficticio', '1', '10.0000');
      await concepto(page, 2, 'Servicio ficticio', '2.500', '4.1250');
      await concepto(page, 3, 'Suministro ficticio', '3', '0.3350');
      await page.getByLabel('Unidad del concepto 2', { exact: true }).selectOption('HORA');
      await page
        .getByLabel('Descripción', { exact: true })
        .fill('Datos ficticios para comprobar el recorrido completo.');
    });
    await test.step('03 Estimación HALF_UP por línea y total 21,32 EUR', async () => {
      await expect(page.locator('.importe-estimado')).toHaveText('21,32 €');
      await expect(page.locator('.importe-linea strong')).toHaveText([
        '10,00 €',
        '10,31 €',
        '1,01 €',
      ]);
      for (const ancho of [360, 768, 1440]) await captura(page, 'editor', ancho);
      // R004-UI03: no se fuerza scroll desde la prueba; solo Tab y navegación nativa.
      for (const ancho of [768, 1440]) await recorrerEditorConTeclado(page, ancho);
    });
    await test.step('04 Guarda, confirma total del servidor y recarga', async () => {
      await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
      await expect(page).toHaveURL((url) => url.pathname === ruta);
      await expect(page.locator('.importe-total')).toHaveText('21,32 €');
      await expect(page.getByRole('heading', { name: asunto, exact: true })).toBeFocused();
      numero = (await page.locator('.encabezado .ceja').textContent())!.trim();
      expect(numero).toMatch(/^SOL-\d{4}-\d{6}$/);
      await page.reload();
      await expect(page.locator('.importe-total')).toHaveText('21,32 €');
      await page.getByRole('link', { name: 'Editar borrador', exact: true }).click();
      await expect(page.getByLabel('Precio unitario del concepto 2', { exact: true })).toHaveValue(
        '4.1250',
      );
    });
    await test.step('05 Dos sesiones de edición provocan VERSION_OBSOLETA real', async () => {
      const concurrente = await context.newPage();
      try {
        await concurrente.goto(`${ruta}/editar`);
        await expect(concurrente.getByLabel('Asunto *', { exact: true })).toHaveValue(asunto);
        await concurrente.getByLabel('Asunto *', { exact: true }).fill(`${asunto} remoto`);
        await concurrente.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
        await expect(
          concurrente.getByRole('heading', { name: `${asunto} remoto`, exact: true }),
        ).toBeVisible();
        await page.getByLabel('Asunto *', { exact: true }).fill(`${asunto} local`);
        await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
        await expect(page.getByRole('alert')).toContainText('Tus cambios siguen aquí');
        await expect(page.getByRole('alert')).toBeFocused();
        await expect(page.getByLabel('Asunto *', { exact: true })).toHaveValue(`${asunto} local`);
        await expect(page.getByLabel('Cantidad del concepto 2', { exact: true })).toHaveValue(
          '2.500',
        );
        await expect(
          page.getByRole('button', { name: 'Guardar borrador', exact: true }),
        ).toBeDisabled();
        await captura(page, 'conflicto', 1440);
      } finally {
        await concurrente.close();
      }
    });
    await test.step('06 Recupera versión actual y corrige borrador', async () => {
      await page.getByRole('button', { name: 'Descartar cambios y recargar', exact: true }).click();
      await expect(page.getByLabel('Asunto *', { exact: true })).toHaveValue(`${asunto} remoto`);
      await page.getByLabel('Asunto *', { exact: true }).fill(asunto);
      await expect(
        page.getByRole('button', { name: 'Guardar borrador', exact: true }),
      ).toBeEnabled();
    });
    await test.step('07 Selecciona proveedor activo y supervisor habilitado', async () => {
      const escriturasAntesDeBuscar = escrituras;
      await page
        .getByLabel('Buscar proveedor por nombre', { exact: true })
        .fill(`Proveedor E2E ${marca}`);
      const busquedaProveedor = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === '/api/proveedores' &&
          new URL(r.url()).searchParams.get('denominacion') === `Proveedor E2E ${marca}`,
      );
      await page.getByLabel('Buscar proveedor por nombre', { exact: true }).press('Enter');
      expect((await busquedaProveedor).status()).toBe(200);
      await expect(page).toHaveURL((url) => url.pathname === `${ruta}/editar`);
      expect(escrituras).toBe(escriturasAntesDeBuscar);
      await expect(page.getByLabel('Proveedor', { exact: true })).toBeEnabled();
      await page.getByLabel('Proveedor', { exact: true }).selectOption(proveedorId);
      await page
        .getByLabel('Buscar supervisor por nombre', { exact: true })
        .fill(supervisor.usuario.nombreVisible);
      const busquedaSupervisor = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === '/api/identidad/supervisores' &&
          new URL(r.url()).searchParams.get('nombre') === supervisor.usuario.nombreVisible,
      );
      await page.getByLabel('Buscar supervisor por nombre', { exact: true }).press('Enter');
      expect((await busquedaSupervisor).status()).toBe(200);
      await expect(page).toHaveURL((url) => url.pathname === `${ruta}/editar`);
      expect(escrituras).toBe(escriturasAntesDeBuscar);
      await expect(page.getByLabel('Supervisor', { exact: true })).toBeEnabled();
      await page.getByLabel('Supervisor', { exact: true }).selectOption(supervisor.usuario.id);
      await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
      await expect(page.getByRole('heading', { name: asunto, exact: true })).toBeVisible();
      await expect(page.locator('dd')).toContainText([supervisor.usuario.nombreVisible]);
    });
    await test.step('08 Confirma y presenta; detalle queda inmutable', async () => {
      await page.getByRole('button', { name: 'Presentar solicitud', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Confirmar presentación', exact: true }),
      ).toBeFocused();
      const respuesta = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === `/api${ruta}/presentar` && r.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Confirmar y presentar', exact: true }).click();
      const enviada = await respuesta;
      expect(enviada.status()).toBe(200);
      const peticion = enviada.request();
      clavePresentacion = peticion.headers()['idempotency-key'];
      versionPresentada = (peticion.postDataJSON() as { version: number }).version;
      cabecerasPresentacion = {
        Authorization: peticion.headers()['authorization'],
        'Idempotency-Key': clavePresentacion,
      };
      resultadoPresentacion = (await enviada.json()) as Record<string, unknown>;
      await expect(page.locator('.estado')).toHaveText('Presentada');
      await expect(page.locator('app-solicitud-detalle > .exito[role="status"]')).toContainText(
        'Solicitud presentada.',
      );
      await expect(page.getByRole('link', { name: 'Editar borrador', exact: true })).toHaveCount(0);
      await expect(
        page.getByText('Datos del proveedor conservados al presentar la solicitud.'),
      ).toBeVisible();
    });
    await test.step('09 Repite misma clave real y comprueba idéntico resultado sin duplicar', async () => {
      const repetida = await page.request.post(`/api${ruta}/presentar`, {
        headers: await cabecerasEscritura(page.request, cabecerasPresentacion),
        data: { version: versionPresentada },
      });
      expect(repetida.status()).toBe(200);
      expect(await repetida.json()).toEqual(resultadoPresentacion);
      const lista = await page.request.get(
        `/api/solicitudes?numero=${encodeURIComponent(numero)}`,
        { headers: { Authorization: cabecerasPresentacion['Authorization'] } },
      );
      expect(lista.status()).toBe(200);
      expect(((await lista.json()) as { totalElementos: number }).totalElementos).toBe(1);
      expect(clavePresentacion).toMatch(/^[0-9a-f-]{36}$/);
    });
    await test.step('10 SUPERVISOR consulta asignada presentada sin modificar', async () => {
      const separado = await browser.newContext({ baseURL });
      try {
        const lector = await separado.newPage();
        await acceder(lector, 'SUPERVISOR');
        await lector.goto(`/solicitudes?numero=${encodeURIComponent(numero)}`);
        await expect(lector.getByRole('status')).toHaveText('1 solicitudes encontradas.');
        await lector.getByRole('link', { name: asunto, exact: true }).click();
        await expect(lector.locator('.estado')).toHaveText('Presentada');
        await expect(
          lector.getByRole('link', { name: 'Editar borrador', exact: true }),
        ).toHaveCount(0);
        await captura(lector, 'supervisor', 1440);
      } finally {
        await separado.close();
      }
    });
    await test.step('11 AUDITOR consulta solicitud y total sin escritura', async () => {
      const separado = await browser.newContext({ baseURL });
      try {
        const lector = await separado.newPage();
        await acceder(lector, 'AUDITOR');
        await lector.goto(ruta);
        await expect(lector.locator('.importe-total')).toHaveText('21,32 €');
        await expect(
          lector.getByRole('button', { name: 'Presentar solicitud', exact: true }),
        ).toHaveCount(0);
        await lector.goto(`${ruta}/editar`);
        await expect(lector).toHaveURL(/\/solicitudes$/);
      } finally {
        await separado.close();
      }
    });
    await test.step('12 SOLICITANTE ajeno no lista ni consulta la solicitud', async () => {
      const separado = await browser.newContext({ baseURL });
      try {
        const lector = await separado.newPage();
        await acceder(lector, 'SOLICITANTE', ajenoCorreo!);
        await lector.goto(`/solicitudes?numero=${encodeURIComponent(numero)}`);
        await expect(lector.getByRole('status')).toHaveText('0 solicitudes encontradas.');
        const respuesta = lector.waitForResponse(
          (r) => new URL(r.url()).pathname === `/api${ruta}` && r.request().method() === 'GET',
        );
        await lector.goto(ruta);
        expect((await respuesta).status()).toBe(404);
        await expect(lector.getByRole('alert')).toContainText('no existe o no está disponible');
        await expect(lector.getByRole('heading', { name: asunto, exact: true })).toHaveCount(0);
      } finally {
        await separado.close();
      }
    });
    await test.step('13 Responsive, teclado, rutas directas, filtros y recarga', async () => {
      for (const ancho of [360, 768, 1440]) await captura(page, 'detalle', ancho);
      await page.goto(`/solicitudes?numero=${encodeURIComponent(numero)}&estado=PRESENTADA&size=1`);
      await expect(page.getByRole('heading', { name: 'Solicitudes', exact: true })).toBeFocused();
      for (const ancho of [360, 768, 1440]) await captura(page, 'lista', ancho);
      const direccion = page.url();
      await page.reload();
      await expect(page).toHaveURL(direccion);
      await expect(page.getByLabel('Número exacto', { exact: true })).toHaveValue(numero);
      await expect(page.getByRole('link', { name: asunto, exact: true })).toBeVisible();
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(`${ruta}/editar`);
      await expect(page.getByRole('alert')).toContainText('no es un borrador propio editable');
      await expect(page.getByRole('button', { name: 'Guardar borrador', exact: true })).toHaveCount(
        0,
      );
      await page.goto('/solicitudes/nueva');
      await expect(
        page.getByRole('heading', { name: 'Nueva solicitud', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Asunto *', { exact: true })).toBeFocused();
      await page.getByRole('button', { name: 'Crear borrador', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('alert')).toBeFocused();
      await expect(page.getByLabel('Asunto *', { exact: true })).toHaveAttribute(
        'aria-invalid',
        'true',
      );
      await captura(page, 'alta-error', 360);
      await verificarAlmacenamientoOperaciones(page);
      expect(escrituras).toBeGreaterThanOrEqual(5);
      expect(escriturasSinProteccion).toBe(0);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      expect(
        await page
          .getByRole('button', { name: 'Crear borrador', exact: true })
          .evaluate((boton) => getComputedStyle(boton).transitionDuration),
      ).toBe('0s');
    });
  } finally {
    await admin.api.dispose();
    await supervisor.api.dispose();
  }
});

test('SCI-04 / R004-UI01: carga posiciones no contiguas, añade, guarda y recarga', async ({
  page,
}) => {
  const sesion = await sesionApi('SOLICITANTE');
  try {
    const asunto = `Posiciones ficticias ${randomUUID()}`;
    const alta = await sesion.api.post('/api/solicitudes', {
      headers: await cabecerasEscritura(sesion.api, {
        ...sesion.headers,
        'Idempotency-Key': randomUUID(),
      }),
      data: { asunto },
    });
    expect(alta.status()).toBe(201);
    const solicitud = (await alta.json()) as { id: string; version: number };
    const ruta = `/solicitudes/${solicitud.id}`;
    const entrada = {
      asunto,
      descripcion: null,
      proveedorId: null,
      supervisorId: null,
      version: solicitud.version,
      conceptos: [1, 3].map((posicion) => ({
        id: null,
        descripcion: `Línea ficticia ${posicion}`,
        cantidad: '1',
        unidad: 'UNIDAD',
        precioUnitario: '0.01',
        posicion,
      })),
    };
    const guardada = await sesion.api.put(`/api${ruta}`, {
      headers: await cabecerasEscritura(sesion.api, sesion.headers),
      data: entrada,
    });
    expect(guardada.status()).toBe(200);
    const originales = (
      (await guardada.json()) as { conceptos: { id: string; posicion: number }[] }
    ).conceptos;
    expect(originales.map((linea) => linea.posicion)).toEqual([1, 3]);
    await acceder(page, 'SOLICITANTE');
    await page.goto(`${ruta}/editar`);
    await expect(page.getByRole('heading', { name: 'Editar borrador', exact: true })).toBeFocused();
    await concepto(page, 3, 'Nueva línea ficticia', '1', '0.01');
    await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === ruta);
    await expect(page.locator('.importe-total')).toHaveText('0,03 €');
    await page.reload();
    await expect(page.locator('.importe-total')).toHaveText('0,03 €');
    const respuesta = await sesion.api.get(`/api${ruta}`, { headers: sesion.headers });
    expect(respuesta.status()).toBe(200);
    const persistidas = (
      (await respuesta.json()) as { conceptos: { id: string; posicion: number }[] }
    ).conceptos;
    expect(persistidas.map((linea) => linea.posicion)).toEqual([1, 2, 3]);
    expect(persistidas.slice(0, 2).map((linea) => linea.id)).toEqual(
      originales.map((linea) => linea.id),
    );
    expect(new Set(persistidas.map((linea) => linea.id)).size).toBe(3);
  } finally {
    await sesion.api.dispose();
  }
});
