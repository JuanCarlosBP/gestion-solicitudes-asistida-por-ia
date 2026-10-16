import { APIRequestContext, expect, Page, request } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import type { DescriptorOperacion } from '../src/app/operaciones/operacion-modelo';
import type { DetalleSolicitud } from '../src/app/solicitudes/solicitud-modelo';

export const baseURL = process.env['BASE_URL'] ?? 'http://127.0.0.1:18080';
export type RolDemo = 'ADMINISTRADOR' | 'SOLICITANTE' | 'SUPERVISOR' | 'AUDITOR';
export async function acceder(page: Page, rol: RolDemo, correo?: string) {
  await page.goto('/acceso');
  await page
    .getByLabel('Correo electrónico', { exact: true })
    .fill(correo ?? process.env[`DEMO_${rol}_CORREO`] ?? `${rol.toLowerCase()}@demo.invalid`);
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill(process.env[`DEMO_${rol}_CLAVE`] ?? `Ejemplo local ${rol.toLowerCase()} 2026`);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/mi-cuenta$/);
}
export async function csrf(api: APIRequestContext) {
  return decodeURIComponent(
    (await api.storageState()).cookies.find((cookie) => cookie.name === 'XSRF-TOKEN')?.value ?? '',
  );
}
export async function escritura(
  api: APIRequestContext,
  headers: Record<string, string>,
  clave: string = randomUUID(),
) {
  return { ...headers, 'X-XSRF-TOKEN': await csrf(api), 'Idempotency-Key': clave };
}
export async function sesionApi(rol: RolDemo) {
  const api = await request.newContext({ baseURL });
  await api.get('/api/autenticacion/csrf');
  const respuesta = await api.post('/api/autenticacion/iniciar-sesion', {
    data: {
      correo: process.env[`DEMO_${rol}_CORREO`] ?? `${rol.toLowerCase()}@demo.invalid`,
      contrasena: process.env[`DEMO_${rol}_CLAVE`] ?? `Ejemplo local ${rol.toLowerCase()} 2026`,
    },
    headers: { 'X-XSRF-TOKEN': await csrf(api) },
  });
  expect(respuesta.status()).toBe(200);
  const acceso = (await respuesta.json()) as { accessToken: string; usuario: { id: string } };
  return {
    api,
    usuarioId: acceso.usuario.id,
    headers: { Authorization: `Bearer ${acceso.accessToken}` },
  };
}
export type Sesion = Awaited<ReturnType<typeof sesionApi>>;

export async function descriptores(page: Page): Promise<DescriptorOperacion[]> {
  return page.evaluate(
    () =>
      Object.keys(localStorage)
        .filter((clave) => clave.startsWith('gs.operacion-segura.'))
        .map((clave) => JSON.parse(localStorage.getItem(clave)!)) as DescriptorOperacion[],
  );
}
export async function verificarAlmacenamientoOperaciones(page: Page) {
  const contenido = await page.evaluate(() => ({
    claves: Object.keys(localStorage),
    valores: Object.values(localStorage),
    sesion: sessionStorage.length,
  }));
  expect(contenido.sesion).toBe(0);
  for (let indice = 0; indice < contenido.claves.length; indice++) {
    expect(contenido.claves[indice]).toMatch(/^gs\.operacion-segura\.[0-9a-f]{64}\.[0-9a-f-]{36}$/);
    const dato = JSON.parse(contenido.valores[indice]) as DescriptorOperacion;
    expect(Object.keys(dato).sort()).toEqual(
      (dato.recursoId
        ? ['clave', 'operacion', 'recursoId', 'fecha']
        : ['clave', 'operacion', 'fecha']
      ).sort(),
    );
    expect(dato.clave).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof dato.fecha).toBe('number');
    expect(Date.now() - dato.fecha).toBeLessThan(24 * 60 * 60 * 1000);
    expect([
      'CREAR_PROVEEDOR',
      'DESACTIVAR_PROVEEDOR',
      'REACTIVAR_PROVEEDOR',
      'CREAR_BORRADOR',
      'PRESENTAR',
      'APROBAR',
      'RECHAZAR',
    ]).toContain(dato.operacion);
  }
}
export async function rellenarProveedor(page: Page, denominacion: string, fiscal: string) {
  await page.getByLabel('Tipo *', { exact: true }).selectOption('PROFESIONAL');
  await page.getByLabel('Denominación *', { exact: false }).fill(denominacion);
  await page.getByLabel('País fiscal *', { exact: false }).fill('ES');
  await page.getByLabel('Identificador fiscal *', { exact: false }).fill(fiscal);
}
export async function crearBorrador(page: Page, asunto: string) {
  await page.goto('/solicitudes/nueva');
  await expect(page.getByRole('heading', { name: 'Nueva solicitud', exact: true })).toBeFocused();
  await page.getByLabel('Asunto *', { exact: false }).fill(asunto);
  await page.getByRole('button', { name: 'Crear borrador', exact: true }).click();
}
export async function borradorCompleto(
  admin: Sesion,
  autor: Sesion,
  supervisor: Sesion,
  asunto: string,
) {
  const altaProveedor = await admin.api.post('/api/proveedores', {
    headers: await escritura(admin.api, admin.headers),
    data: {
      tipo: 'PROFESIONAL',
      denominacion: `Proveedor006 ${randomUUID()}`,
      paisFiscal: 'ES',
      identificadorFiscal: `FICTICIO-${randomUUID()}`,
      correoContacto: null,
      telefonoContacto: null,
    },
  });
  expect(altaProveedor.status()).toBe(201);
  const proveedor = (await altaProveedor.json()) as { id: string };
  const alta = await autor.api.post('/api/solicitudes', {
    headers: await escritura(autor.api, autor.headers),
    data: { asunto },
  });
  expect(alta.status()).toBe(201);
  const solicitud = (await alta.json()) as DetalleSolicitud;
  const guardada = await autor.api.put(`/api/solicitudes/${solicitud.id}`, {
    headers: await escritura(autor.api, autor.headers),
    data: {
      asunto,
      descripcion: null,
      proveedorId: proveedor.id,
      supervisorId: supervisor.usuarioId,
      version: solicitud.version,
      conceptos: [
        {
          id: null,
          descripcion: 'Servicio ficticio006',
          cantidad: '1',
          unidad: 'SERVICIO',
          precioUnitario: '10.0000',
          posicion: 1,
        },
      ],
    },
  });
  expect(guardada.status()).toBe(200);
  return (await guardada.json()) as DetalleSolicitud;
}
