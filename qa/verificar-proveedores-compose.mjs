import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { prepararDirectorioEvidencias, raizProyecto, rutaDelProyecto } from './rutas-evidencia.mjs';

// Solo datos ficticios en loopback; no escribir credenciales, cuerpos ni logs completos.
const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:18080');
if (base.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)
    || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
  throw new Error('La comprobación requiere HTTP loopback sin credenciales ni parámetros.');
}
const evidencia = prepararDirectorioEvidencias();
const entorno = rutaDelProyecto(process.env.QA_ENTORNO || 'infraestructura/.env.example');
const ejecutar = promisify(execFile);
const compose = ['compose', '--env-file', entorno, '-f', 'infraestructura/compose.yaml'];
const controles = [];
const sesiones = [];
const marcador = `QA-AG011-${randomUUID()}`;
const camposPublicos = ['activo', 'actualizadoEn', 'correoContacto', 'creadoEn', 'denominacion',
  'id', 'identificadorFiscal', 'paisFiscal', 'telefonoContacto', 'tipo', 'version'];

function comprobar(condicion, criterio) {
  if (!condicion) throw new Error(`Criterio incumplido: ${criterio}`);
  controles.push({ criterio, resultado: 'PASS' });
}

async function pedir(ruta, { sesion, metodo = 'GET', cuerpo, xsrf = true } = {}) {
  const headers = {};
  // 006 exige una identidad de intento también para altas y cambios de estado.
  if (metodo === 'POST' && /^\/api\/proveedores(?:\/|$)/.test(ruta)) headers['Idempotency-Key'] = randomUUID();
  if (sesion?.cookies.size) headers.Cookie = [...sesion.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  if (sesion?.acceso) headers.Authorization = `Bearer ${sesion.acceso}`;
  if (metodo !== 'GET' && xsrf && sesion?.cookies.has('XSRF-TOKEN')) {
    headers['X-XSRF-TOKEN'] = decodeURIComponent(sesion.cookies.get('XSRF-TOKEN'));
  }
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  const respuesta = await fetch(new URL(ruta, base), { method: metodo, headers,
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(10000), redirect: 'error' });
  for (const cookie of respuesta.headers.getSetCookie()) {
    const par = cookie.split(';')[0];
    const i = par.indexOf('=');
    const nombre = par.slice(0, i), valor = par.slice(i + 1);
    if (!valor || /max-age=0(?:;|$)/i.test(cookie)) sesion?.cookies.delete(nombre);
    else sesion?.cookies.set(nombre, valor);
  }
  const texto = await respuesta.text();
  return { estado: respuesta.status, cabeceras: respuesta.headers, json: texto ? JSON.parse(texto) : null };
}

async function login(rol) {
  const sesion = { cookies: new Map(), rol };
  await pedir('/api/autenticacion/csrf', { sesion });
  const respuesta = await pedir('/api/autenticacion/iniciar-sesion', { sesion, metodo: 'POST',
    cuerpo: { correo: `${rol.toLowerCase()}@demo.invalid`, contrasena: `Ejemplo local ${rol.toLowerCase()} 2026` } });
  comprobar(respuesta.estado === 200, `Login ficticio ${rol}`);
  sesion.acceso = respuesta.json.accessToken;
  sesiones.push(sesion);
  return sesion;
}

function datos(sufijo = '') {
  return { tipo: 'PERSONA_JURIDICA', denominacion: `${marcador} Ficticio Álamo${sufijo}`,
    paisFiscal: 'ES', identificadorFiscal: `${marcador}${sufijo}`, correoContacto: 'catalogo-ficticio@demo.invalid',
    telefonoContacto: '+00 000 000 000' };
}

function editable(proveedor) {
  return Object.fromEntries(['tipo', 'denominacion', 'paisFiscal', 'identificadorFiscal',
    'correoContacto', 'telefonoContacto', 'version'].map((campo) => [campo, proveedor[campo]]));
}

async function esperarSalud() {
  const limite = Date.now() + 60000;
  while (Date.now() < limite) {
    try { if ((await pedir('/api/salud')).estado === 200) return; } catch { /* arranque */ }
    await new Promise((continuar) => setTimeout(continuar, 1000));
  }
  throw new Error('La API no recuperó salud tras reiniciar backend.');
}

let error;
try {
  // Compose --wait solo garantiza running para servicios sin healthcheck.
  await esperarSalud();
  const admin = await login('ADMINISTRADOR');
  const auditor = await login('AUDITOR');
  const solicitante = await login('SOLICITANTE');
  const supervisor = await login('SUPERVISOR');
  const rutaBase = '/api/proveedores';
  comprobar((await pedir(rutaBase)).estado === 401, 'Listado sin identidad devuelve 401');
  comprobar((await pedir(rutaBase, { sesion: admin, metodo: 'POST', cuerpo: datos(), xsrf: false })).estado === 403,
    'Alta con Bearer sin CSRF devuelve 403');
  for (const sesion of [auditor, solicitante, supervisor]) {
    comprobar((await pedir(rutaBase, { sesion, metodo: 'POST', cuerpo: datos() })).estado === 403,
      `Alta rechazada para ${sesion.rol}`);
  }
  const alta = await pedir(rutaBase, { sesion: admin, metodo: 'POST', cuerpo: datos() });
  comprobar(alta.estado === 201 && alta.json.activo && alta.json.version === 0, 'Alta 201 activa y versión cero');
  comprobar(alta.cabeceras.get('location')?.endsWith(`${rutaBase}/${alta.json.id}`), 'Location del recurso creado');
  comprobar(JSON.stringify(Object.keys(alta.json).sort()) === JSON.stringify(camposPublicos), 'DTO público sin normalizado ni campos internos');
  comprobar(alta.cabeceras.get('cache-control')?.includes('no-store'), 'Datos de proveedor sin caché compartida');
  const ruta = `${rutaBase}/${alta.json.id}`;
  for (const sesion of [admin, auditor, solicitante, supervisor]) {
    comprobar((await pedir(ruta, { sesion })).estado === 200, `Activo visible ${sesion.rol}`);
  }
  const modificacion = await pedir(ruta, { sesion: admin, metodo: 'PUT',
    cuerpo: { ...editable(alta.json), denominacion: `${marcador} Modificado Álamo` } });
  comprobar(modificacion.estado === 200 && modificacion.json.version === 1
    && modificacion.json.creadoEn === alta.json.creadoEn && modificacion.json.id === alta.json.id, 'Edición preserva identidad y creación e incrementa versión');
  const obsoleta = await pedir(ruta, { sesion: admin, metodo: 'PUT', cuerpo: editable(alta.json) });
  comprobar(obsoleta.estado === 409 && obsoleta.json.error === 'VERSION_OBSOLETA', 'Edición obsoleta devuelve conflicto');
  for (const [campo, valor] of [['activo', false], ['id', randomUUID()], ['creadoEn', alta.json.creadoEn], ['rol', 'ADMINISTRADOR']]) {
    comprobar((await pedir(ruta, { sesion: admin, metodo: 'PUT', cuerpo: { ...editable(modificacion.json), [campo]: valor } })).estado === 400,
      `Campo no editable rechazado: ${campo}`);
  }
  const baja = await pedir(`${ruta}/desactivar`, { sesion: admin, metodo: 'POST', cuerpo: { version: 1 } });
  comprobar(baja.estado === 200 && !baja.json.activo && baja.json.version === 2, 'Desactivación lógica');
  const repetida = await pedir(`${ruta}/desactivar`, { sesion: admin, metodo: 'POST', cuerpo: { version: 2 } });
  comprobar(repetida.estado === 200 && repetida.json.version === 2 && repetida.json.actualizadoEn === baja.json.actualizadoEn,
    'Desactivación repetida vigente no modifica');
  const bajaObsoleta = await pedir(`${ruta}/desactivar`, { sesion: admin, metodo: 'POST', cuerpo: { version: 1 } });
  comprobar(bajaObsoleta.estado === 409 && bajaObsoleta.json.error === 'VERSION_OBSOLETA', 'Estado coincidente con versión antigua sigue siendo conflicto');
  for (const sesion of [solicitante, supervisor]) {
    const oculta = await pedir(ruta, { sesion });
    comprobar(oculta.estado === 404 && oculta.json.error === 'PROVEEDOR_NO_ENCONTRADO', `Inactivo oculto ${sesion.rol}`);
    comprobar((await pedir(`${rutaBase}?activo=false`, { sesion })).estado === 403, `Filtro inactivo rechazado ${sesion.rol}`);
    comprobar((await pedir(`${rutaBase}?activo=todos`, { sesion })).estado === 403, `Filtro todos rechazado ${sesion.rol}`);
    const pagina = await pedir(`${rutaBase}?denominacion=${encodeURIComponent(marcador)}`, { sesion });
    comprobar(pagina.estado === 200 && pagina.json.elementos.every((p) => p.id !== alta.json.id), `Listado no filtra inactivo ${sesion.rol}`);
  }
  for (const sesion of [admin, auditor]) comprobar((await pedir(ruta, { sesion })).estado === 200, `Inactivo visible ${sesion.rol}`);
  for (const sesion of [auditor, solicitante, supervisor]) {
    for (const accion of ['desactivar', 'reactivar']) {
      comprobar((await pedir(`${ruta}/${accion}`, { sesion, metodo: 'POST', cuerpo: { version: 2 } })).estado === 403,
        `${accion} rechazado ${sesion.rol}`);
    }
    comprobar((await pedir(ruta, { sesion, metodo: 'PUT', cuerpo: editable(baja.json) })).estado === 403, `Editar rechazado ${sesion.rol}`);
  }
  const duplicado = await pedir(rutaBase, { sesion: admin, metodo: 'POST', cuerpo: { ...datos(), identificadorFiscal: datos().identificadorFiscal.toLowerCase() } });
  comprobar(duplicado.estado === 409 && duplicado.json.error === 'PROVEEDOR_DUPLICADO', 'Duplicado normalizado incluye inactivo');
  const reactivada = await pedir(`${ruta}/reactivar`, { sesion: admin, metodo: 'POST', cuerpo: { version: 2 } });
  comprobar(reactivada.estado === 200 && reactivada.json.activo && reactivada.json.version === 3, 'Reactivación autorizada');
  const reactivadaDos = await pedir(`${ruta}/reactivar`, { sesion: admin, metodo: 'POST', cuerpo: { version: 3 } });
  comprobar(reactivadaDos.estado === 200 && reactivadaDos.json.version === 3, 'Reactivación repetida vigente no modifica');

  const carreraAlta = await Promise.all([0, 1].map(() => pedir(rutaBase, { sesion: admin, metodo: 'POST', cuerpo: datos('-CARRERA') })));
  comprobar(carreraAlta.filter((r) => r.estado === 201).length === 1 && carreraAlta.filter((r) => r.estado === 409 && r.json.error === 'PROVEEDOR_DUPLICADO').length === 1,
    'Dos altas HTTP simultáneas: una persiste y una recibe duplicado');
  const carreraEdicion = await Promise.all([0, 1].map((n) => pedir(ruta, { sesion: admin, metodo: 'PUT',
    cuerpo: { ...editable(reactivada.json), denominacion: `${marcador} Carrera Álamo ${n}` } })));
  comprobar(carreraEdicion.filter((r) => r.estado === 200).length === 1 && carreraEdicion.filter((r) => r.estado === 409 && r.json.error === 'VERSION_OBSOLETA').length === 1,
    'Dos ediciones HTTP simultáneas: una gana y una recibe conflicto');
  const final = carreraEdicion.find((r) => r.estado === 200).json;
  comprobar(final.version === 4, 'Carrera incrementa una sola versión');
  const otroPais = await pedir(rutaBase, { sesion: admin, metodo: 'POST', cuerpo: { ...datos(), paisFiscal: 'FR' } });
  comprobar(otroPais.estado === 201, 'Misma identidad fiscal en otro país ISO permitida');
  for (const consulta of ['page=-1', 'size=0', 'size=101', 'sort=id,asc', 'sort=denominacion,sql', 'paisFiscal=XX', 'tipo=OTRO', 'activo=quizas']) {
    comprobar((await pedir(`${rutaBase}?${consulta}`, { sesion: admin })).estado === 400, `Consulta inválida controlada: ${consulta}`);
  }
  const paginada = await pedir(`${rutaBase}?denominacion=${encodeURIComponent(marcador.toLowerCase())}&size=1&page=0&sort=creadoEn,desc`, { sesion: admin });
  comprobar(paginada.estado === 200 && paginada.json.elementos.length === 1 && paginada.json.totalElementos === 3
    && paginada.json.totalPaginas === 3 && paginada.json.pagina === 0 && paginada.json.tamano === 1, 'Paginación, búsqueda sin mayúsculas y totales');
  const fiscal = await pedir(`${rutaBase}?identificadorFiscal=${encodeURIComponent(datos().identificadorFiscal.toLowerCase())}&paisFiscal=ES&tipo=PERSONA_JURIDICA&activo=true`, { sesion: auditor });
  comprobar(fiscal.estado === 200 && fiscal.json.totalElementos === 1 && fiscal.json.elementos[0].id === alta.json.id, 'Fiscal exacto normalizado y filtros AND');
  const vacia = await pedir(`${rutaBase}?denominacion=${encodeURIComponent(marcador)}&page=100`, { sesion: admin });
  comprobar(vacia.estado === 200 && vacia.json.elementos.length === 0 && vacia.json.totalElementos === 3, 'Página vacía conserva total');
  comprobar((await pedir(`${rutaBase}?denominacion=${encodeURIComponent(`${marcador} Carrera Alamo`)}`, { sesion: admin })).json.totalElementos === 0, 'Acentos significativos');
  comprobar((await pedir(`${rutaBase}?denominacion=${encodeURIComponent(`${marcador}%`)}`, { sesion: admin })).json.totalElementos === 0, 'Comodín porcentaje tratado como literal');
  const inexistente = await pedir(`${rutaBase}/${randomUUID()}`, { sesion: admin });
  comprobar(inexistente.estado === 404 && inexistente.json.error === 'PROVEEDOR_NO_ENCONTRADO', 'Inexistente 404 controlado');
  comprobar((await pedir(ruta, { sesion: admin, metodo: 'DELETE' })).estado === 403, 'Borrado físico denegado');

  await ejecutar('docker', [...compose, 'restart', 'backend'], { cwd: raizProyecto, windowsHide: true, timeout: 60000 });
  await esperarSalud();
  const nuevoAdmin = await login('ADMINISTRADOR');
  const persistido = await pedir(ruta, { sesion: nuevoAdmin });
  comprobar(persistido.estado === 200 && persistido.json.version === final.version && persistido.json.denominacion === final.denominacion,
    'Proveedor persistido tras reiniciar backend y Flyway');
  const { stdout: logs } = await ejecutar('docker', [...compose, 'logs', '--no-color', 'backend', 'postgres'],
    { cwd: raizProyecto, windowsHide: true, maxBuffer: 20 * 1024 * 1024 });
  comprobar(![marcador, 'catalogo-ficticio@demo.invalid', '+00 000 000 000'].some((valor) => logs.includes(valor)),
    'Logs backend/PostgreSQL sin datos fiscales ni contactos ficticios de esta prueba');
  const eventos = logs.split(/\r?\n/).filter((linea) => linea.includes(`proveedor=${alta.json.id}`));
  for (const accion of ['CREAR', 'MODIFICAR', 'DESACTIVAR', 'REACTIVAR']) {
    comprobar(eventos.some((linea) => linea.includes(`accion=${accion}`) && linea.includes('resultado=CORRECTO')),
      `Evento técnico confirmado de ${accion}`);
  }
  comprobar(eventos.some((linea) => linea.includes('resultado=VERSION_OBSOLETA')), 'Evento técnico de conflicto de versión');
  comprobar(logs.includes('resultado=PROVEEDOR_DUPLICADO'), 'Evento técnico de rechazo por duplicado');
  for (const accion of ['DESACTIVAR', 'REACTIVAR']) {
    comprobar(eventos.filter((linea) => linea.includes(`accion=${accion}`) && linea.includes('resultado=CORRECTO')).length === 1,
      `Repetición de ${accion} no duplica evento de modificación`);
  }
} catch (fallo) {
  error = fallo instanceof Error && fallo.message.startsWith('Criterio incumplido:')
    ? fallo.message : 'Fallo de infraestructura o respuesta inesperada en QA proveedores; sin volcar datos.';
  process.exitCode = 1;
} finally {
  // Las sesiones anteriores al reinicio tienen JWT inválido, pero logout autentica refresh.
  for (const sesion of sesiones) {
    try { sesion.acceso = undefined; await pedir('/api/autenticacion/cerrar-sesion', { sesion, metodo: 'POST' }); }
    catch { /* El resultado principal queda registrado, sin exponer credenciales. */ }
  }
  const resultado = { fecha: new Date().toISOString(), baseUrl: base.origin, resultado: error ? 'FAIL' : 'PASS', controles, error,
    limites: 'Solo datos ficticios identificados QA-AG011, conservados sin borrar. Reinicia backend. Concurrencia HTTP real sobre Compose/PostgreSQL; no acredita carga a 50.000. Tokens/cuerpos/logs solo en memoria.' };
  writeFileSync(resolve(evidencia, 'compose-proveedores.json'), JSON.stringify(resultado, null, 2) + '\n');
  console.log(`${resultado.resultado}: ${controles.length} controles de proveedores; evidencia sin credenciales en ${evidencia}`);
  if (error) console.error(error);
}
