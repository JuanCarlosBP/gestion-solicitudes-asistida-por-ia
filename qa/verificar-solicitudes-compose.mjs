import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { argumentosCompose, ejecutarDocker } from './docker-contexto.mjs';
import { randomUUID } from 'node:crypto';
import { prepararDirectorioEvidencias, raizProyecto } from './rutas-evidencia.mjs';
import { prepararUsuariosSolicitudes } from './preparar-usuarios-solicitudes.mjs';

// QA de integración solo loopback y cuentas ficticias. Credenciales/respuestas en memoria.
const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:18080');
if (base.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)
    || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
  throw new Error('La comprobación exige HTTP loopback sin credenciales ni parámetros.');
}
const evidencia = prepararDirectorioEvidencias();
const ejecutar = ejecutarDocker;
const compose = argumentosCompose();
const controles = [];
const sesiones = [];
const marca = `QA004-${randomUUID()}`;
const rutaBase = '/api/solicitudes';
let etapa = 'preparación';

function comprobar(condicion, criterio) {
  if (!condicion) throw new Error(`Criterio incumplido: ${criterio}`);
  controles.push({ criterio, resultado: 'PASS' });
}
async function pedir(ruta, { sesion, metodo = 'GET', cuerpo, xsrf = true, clave } = {}) {
  const headers = {};
  if (sesion?.cookies.size) headers.Cookie = [...sesion.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  if (sesion?.acceso) headers.Authorization = `Bearer ${sesion.acceso}`;
  if (metodo !== 'GET' && xsrf && sesion?.cookies.has('XSRF-TOKEN'))
    headers['X-XSRF-TOKEN'] = decodeURIComponent(sesion.cookies.get('XSRF-TOKEN'));
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  if (clave !== undefined) headers['Idempotency-Key'] = clave;
  // Solo nuevas operaciones006: mantener el negativo sin clave de PRESENTAR.
  else if (metodo === 'POST' && (ruta === '/api/solicitudes' || /^\/api\/proveedores(?:\/|$)/.test(ruta)))
    headers['Idempotency-Key'] = randomUUID();
  const r = await fetch(new URL(ruta, base), { method: metodo, headers,
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(15000), redirect: 'error' });
  for (const cookie of r.headers.getSetCookie()) {
    const par = cookie.split(';')[0];
    const i = par.indexOf('=');
    const nombre = par.slice(0, i), valor = par.slice(i + 1);
    if (!valor || /max-age=0(?:;|$)/i.test(cookie)) sesion?.cookies.delete(nombre);
    else sesion?.cookies.set(nombre, valor);
  }
  const texto = await r.text();
  return { estado: r.status, cabeceras: r.headers, json: texto ? JSON.parse(texto) : null };
}
async function login(rol, usuario) {
  const sesion = { cookies: new Map(), rol };
  await pedir('/api/autenticacion/csrf', { sesion });
  const r = await pedir('/api/autenticacion/iniciar-sesion', { sesion, metodo: 'POST', cuerpo: {
    correo: usuario?.correo || `${rol.toLowerCase()}@demo.invalid`,
    contrasena: `Ejemplo local ${usuario ? 'solicitante' : rol.toLowerCase()} 2026`,
  } });
  comprobar(r.estado === 200, `Login ficticio ${rol}`);
  sesion.acceso = r.json.accessToken;
  sesion.id = r.json.usuario.id;
  sesion.nombre = r.json.usuario.nombreVisible;
  sesiones.push(sesion);
  return sesion;
}
function concepto(cantidad, precioUnitario, posicion = 1) {
  return { id: null, descripcion: `${marca} concepto ${posicion}`, cantidad,
    unidad: 'UNIDAD', precioUnitario, posicion };
}
function editable(s) {
  return { asunto: s.asunto, descripcion: s.descripcion, proveedorId: s.proveedorId,
    supervisorId: s.supervisorId, version: s.version,
    conceptos: s.conceptos.map(({ id, descripcion, cantidad, unidad, precioUnitario, posicion }) =>
      ({ id, descripcion, cantidad, unidad, precioUnitario, posicion })) };
}
async function crear(sesion, sufijo) {
  const r = await pedir(rutaBase, { sesion, metodo: 'POST', cuerpo: { asunto: `${marca} ${sufijo}` } });
  comprobar(r.estado === 201, `Crear borrador ${sufijo}`);
  return r.json;
}
async function guardar(sesion, s, cambios = {}) {
  return pedir(`${rutaBase}/${s.id}`, { sesion, metodo: 'PUT', cuerpo: { ...editable(s), ...cambios } });
}
async function presentar(sesion, s, clave = randomUUID(), cambios = {}) {
  return pedir(`${rutaBase}/${s.id}/presentar`, { sesion, metodo: 'POST', clave,
    cuerpo: { version: s.version, ...cambios } });
}
async function esperarSalud() {
  const limite = Date.now() + 60000;
  while (Date.now() < limite) {
    try { if ((await pedir('/api/salud')).estado === 200) return; } catch { /* arranque */ }
    await new Promise((continuar) => setTimeout(continuar, 500));
  }
  throw new Error('La API no recuperó salud.');
}

let error;
try {
  await esperarSalud();
  const usuarios = await prepararUsuariosSolicitudes();
  writeFileSync(resolve(evidencia, 'usuarios-solicitudes.json'), JSON.stringify(usuarios, null, 2) + '\n');
  const admin = await login('ADMINISTRADOR');
  const auditor = await login('AUDITOR');
  const solicitante = await login('SOLICITANTE');
  const supervisor = await login('SUPERVISOR');
  const ajeno = await login('AJENO', usuarios.ajeno);
  const multiple = await login('MULTIPLE', usuarios.multiple);

  etapa = 'contrato y permisos iniciales';
  comprobar((await pedir(rutaBase)).estado === 401, 'Listado exige identidad');
  comprobar((await pedir('/api/identidad/supervisores')).estado === 401, 'Selector exige identidad');
  for (const sesion of [admin, auditor, supervisor])
    comprobar((await pedir(rutaBase, { sesion, metodo: 'POST', cuerpo: { asunto: marca } })).estado === 403,
      `${sesion.rol} sin SOLICITANTE no crea`);
  comprobar((await pedir(rutaBase, { sesion: solicitante, metodo: 'POST', cuerpo: { asunto: marca }, xsrf: false })).estado === 403,
    'Creación con Bearer sin CSRF denegada');
  for (const campo of ['autor', 'numero', 'estado', 'importeTotal', 'version', 'creadoEn'])
    comprobar((await pedir(rutaBase, { sesion: solicitante, metodo: 'POST', cuerpo: { asunto: marca, [campo]: 'manipulado' } })).estado === 400,
      `Campo protegido rechazado al crear: ${campo}`);
  for (const asunto of ['', 'ab', 'x'.repeat(161)])
    comprobar((await pedir(rutaBase, { sesion: solicitante, metodo: 'POST', cuerpo: { asunto } })).estado === 400,
      `Longitud de asunto inválida ${asunto.length}`);

  const s = await crear(solicitante, 'Álamo');
  const ruta = `${rutaBase}/${s.id}`;
  comprobar(s.version === 0 && s.estado === 'BORRADOR' && s.importeTotal === '0.00'
    && s.moneda === 'EUR' && s.conceptos.length === 0, 'Borrador mínimo completo y sin líneas');
  comprobar(/^SOL-\d{4}-\d{6}$/.test(s.numero) && s.autor.id === solicitante.id, 'Número y autor del servidor');
  const detalle = await pedir(ruta, { sesion: solicitante });
  comprobar(detalle.cabeceras.get('cache-control')?.includes('no-store'), 'Detalle privado no-store');
  comprobar(JSON.stringify(detalle.json) === JSON.stringify(s), 'Crear y consultar devuelven mismo agregado');
  for (const sesion of [supervisor, ajeno])
    comprobar((await pedir(ruta, { sesion })).estado === 404, `Borrador invisible ${sesion.rol}`);
  for (const sesion of [admin, auditor]) {
    comprobar((await pedir(ruta, { sesion })).estado === 200, `Lectura global ${sesion.rol}`);
    comprobar((await guardar(sesion, s)).estado === 403, `Lectura global no concede edición ${sesion.rol}`);
  }
  comprobar((await guardar(ajeno, s)).estado === 404, 'Ajeno no edita recurso invisible');
  comprobar((await pedir(ruta, { sesion: solicitante, metodo: 'DELETE' })).estado === 403, 'No existe borrado de solicitudes');

  etapa = 'cálculo, colección y versión';
  const calculada = await guardar(solicitante, s, { conceptos: [concepto('1', '10.0000'), concepto('2.500', '4.1250', 2), concepto('3', '0.3350', 3)] });
  comprobar(calculada.estado === 200 && calculada.json.importeTotal === '21.32', 'Total suma líneas redondeadas 21.32');
  comprobar(calculada.json.conceptos.map((l) => l.importeLinea).join(',') === '10.00,10.31,1.01', 'Tres ejemplos monetarios obligatorios');
  comprobar(calculada.json.version === 1 && calculada.json.numero === s.numero && calculada.json.creadoEn === s.creadoEn,
    'Guardar incrementa versión y conserva identidad');
  const antigua = await guardar(solicitante, s);
  comprobar(antigua.estado === 409 && antigua.json.error === 'VERSION_OBSOLETA', 'Guardar versión obsoleta409');
  for (const invalida of [concepto('0', '1'), concepto('1.0001', '1'), concepto('1', '1.00001'),
    concepto('999999999999.999', '99999999999.9999'), { ...concepto('1', '1'), posicion: 0 }])
    comprobar((await guardar(solicitante, calculada.json, { conceptos: [invalida] })).estado === 400,
      `Línea inválida controlada: caso ${controles.length}`);
  comprobar((await guardar(solicitante, calculada.json, { conceptos: Array.from({ length: 101 }, (_, i) => concepto('1', '1', i + 1)) })).estado === 400,
    'Más de100 líneas rechazado');
  comprobar((await guardar(solicitante, calculada.json, { conceptos: [concepto('1', '1'), concepto('2', '1')] })).estado === 400,
    'Posiciones duplicadas rechazadas');
  comprobar((await guardar(solicitante, calculada.json, { importeTotal: '0.01' })).estado === 400, 'Total manipulado rechazado');
  comprobar((await guardar(solicitante, calculada.json, { conceptos: [{ ...concepto('1', '1'), importeLinea: '0.01' }] })).estado === 400,
    'Importe de línea manipulado rechazado');
  comprobar((await pedir(ruta, { sesion: solicitante })).json.version === 1, 'Intentos inválidos conservan versión/colección');
  const otro = await crear(solicitante, 'Segunda');
  const otraLinea = await guardar(solicitante, otro, { conceptos: [concepto('1', '1')] });
  comprobar(otraLinea.estado === 200, 'Línea de segundo agregado creada');
  comprobar((await guardar(solicitante, calculada.json, { conceptos: editable(otraLinea.json).conceptos })).estado === 400,
    'Concepto de otra solicitud rechazado');
  const retirada = await guardar(solicitante, otraLinea.json, { conceptos: [] });
  comprobar(retirada.estado === 200 && retirada.json.conceptos.length === 0 && retirada.json.importeTotal === '0.00',
    'Reemplazo vacío retira colección sin huérfanas');

  etapa = 'referencias y presentación';
  const selector = await pedir(`/api/identidad/supervisores?size=100&nombre=${encodeURIComponent(supervisor.nombre)}`, { sesion: solicitante });
  comprobar(selector.estado === 200 && selector.json.elementos.some((u) => u.id === supervisor.id), 'Selector incluye supervisor habilitado');
  comprobar(selector.json.elementos.every((u) => Object.keys(u).sort().join(',') === 'id,nombreVisible'), 'Selector devuelve solo ID y nombre');
  const inhabilitadoSelector = await pedir(`/api/identidad/supervisores?nombre=${encodeURIComponent(`QA inhabilitado ${usuarios.inhabilitado.id}`)}`, { sesion: solicitante });
  comprobar(inhabilitadoSelector.estado === 200 && inhabilitadoSelector.json.totalElementos === 0, 'Selector excluye deshabilitado consultado por su propio nombre');
  comprobar((await pedir('/api/identidad/supervisores?size=101', { sesion: solicitante })).estado === 400, 'Selector acotado100');
  const selfSelector = await pedir(`/api/identidad/supervisores?size=100&nombre=${encodeURIComponent(multiple.nombre)}`, { sesion: multiple });
  comprobar(!selfSelector.json.elementos.some((u) => u.id === multiple.id), 'Selector excluye al propio actor multirrol');
  const proveedor = await pedir('/api/proveedores', { sesion: admin, metodo: 'POST', cuerpo: {
    tipo: 'PROFESIONAL', denominacion: `${marca} proveedor`, paisFiscal: 'ES', identificadorFiscal: marca,
    correoContacto: null, telefonoContacto: null,
  } });
  comprobar(proveedor.estado === 201, 'Proveedor ficticio exclusivo creado');
  const preparado = await guardar(solicitante, calculada.json, { proveedorId: proveedor.json.id, supervisorId: supervisor.id });
  comprobar(preparado.estado === 200, 'Referencias guardadas');
  comprobar((await pedir(ruta, { sesion: supervisor })).estado === 404, 'Supervisor asignado no ve borrador');
  const baja = await pedir(`/api/proveedores/${proveedor.json.id}/desactivar`, { sesion: admin, metodo: 'POST', cuerpo: { version: 0 } });
  comprobar(baja.estado === 200, 'Proveedor desactivado antes de presentar');
  const inactivo = await presentar(solicitante, preparado.json);
  comprobar(inactivo.estado === 409 && inactivo.json.error === 'PROVEEDOR_INACTIVO', 'Proveedor inactivo bloquea presentación');
  const conserva = await pedir(ruta, { sesion: solicitante });
  comprobar(conserva.json.estado === 'BORRADOR' && conserva.json.version === preparado.json.version
    && conserva.json.proveedorId === proveedor.json.id && conserva.json.proveedor === null,
    'Inactividad conserva borrador y referencia sin filtrar catálogo oculto');
  const reactivado = await pedir(`/api/proveedores/${proveedor.json.id}/reactivar`, { sesion: admin, metodo: 'POST', cuerpo: { version: 1 } });
  comprobar(reactivado.estado === 200, 'Proveedor reactivado');
  for (const supervisorId of [usuarios.inhabilitado.id, ajeno.id]) {
    const provisional = await crear(solicitante, 'Supervisor inválido');
    const g = await guardar(solicitante, provisional, { proveedorId: proveedor.json.id, supervisorId, conceptos: [concepto('1', '1')] });
    // Guardar puede rechazar referencia inválida; presentar nunca puede aceptarla.
    const r = g.estado === 200 ? await presentar(solicitante, g.json) : g;
    comprobar(r.estado === 409 && r.json.error === 'SUPERVISOR_INVALIDO', 'Supervisor sin habilitación/rol rechazado');
  }
  const propiaMulti = await crear(multiple, 'Multirrol propia');
  const gMulti = await guardar(multiple, propiaMulti, { proveedorId: proveedor.json.id, supervisorId: multiple.id, conceptos: [concepto('1', '1')] });
  const self = gMulti.estado === 200 ? await presentar(multiple, gMulti.json) : gMulti;
  comprobar(self.estado === 409 && self.json.error === 'SUPERVISOR_INVALIDO', 'Multirrol no se asigna a sí mismo para presentar');
  const sinClave = await pedir(`${ruta}/presentar`, { sesion: solicitante, metodo: 'POST', cuerpo: { version: preparado.json.version } });
  comprobar(sinClave.estado === 400, 'Presentación exige Idempotency-Key');
  comprobar((await presentar(solicitante, preparado.json, 'no-uuid')).estado === 400, 'Clave inválida400');
  comprobar((await pedir(`${ruta}/presentar`, { sesion: solicitante, metodo: 'POST', cuerpo: { version: preparado.json.version }, clave: randomUUID(), xsrf: false })).estado === 403,
    'Presentación con Bearer sin CSRF403');
  const clave = randomUUID();
  const presentada = await presentar(solicitante, preparado.json, clave);
  comprobar(presentada.estado === 200 && presentada.json.estado === 'PRESENTADA'
    && presentada.json.version === preparado.json.version + 1, 'Presentación válida atómica');
  const repetida = await presentar(solicitante, preparado.json, clave);
  comprobar(repetida.estado === 200 && JSON.stringify(repetida.json) === JSON.stringify(presentada.json), 'Replay devuelve exactamente resultado persistido');
  const incompatible = await presentar(solicitante, preparado.json, clave, { version: presentada.json.version });
  comprobar(incompatible.estado === 409 && incompatible.json.error === 'CLAVE_IDEMPOTENCIA_REUTILIZADA', 'Misma clave con versión distinta409');
  const otroReuso = await presentar(solicitante, retirada.json, clave);
  comprobar(otroReuso.estado === 409 && otroReuso.json.error === 'CLAVE_IDEMPOTENCIA_REUTILIZADA', 'Misma clave en otra solicitud409');
  const final = (await pedir(ruta, { sesion: solicitante })).json;
  comprobar(final.presentadoEn && final.proveedor.denominacion === proveedor.json.denominacion
    && final.proveedor.activo === null && final.supervisor.id === supervisor.id, 'Fotografía y asignación confirmadas');
  const noEditable = await guardar(solicitante, final);
  comprobar(noEditable.estado === 409 && noEditable.json.error === 'SOLICITUD_NO_EDITABLE', 'Presentada inmutable');
  for (const sesion of [solicitante, supervisor, auditor, admin])
    comprobar((await pedir(ruta, { sesion })).estado === 200, `Presentada visible ${sesion.rol}`);
  comprobar((await pedir(ruta, { sesion: ajeno })).estado === 404, 'Otro solicitante no accede a presentada');
  const cambioProveedor = await pedir(`/api/proveedores/${proveedor.json.id}`, { sesion: admin, metodo: 'PUT', cuerpo: {
    tipo: 'PERSONA_JURIDICA', denominacion: `${marca} proveedor cambiado`, paisFiscal: 'FR', identificadorFiscal: `${marca}-2`,
    correoContacto: null, telefonoContacto: null, version: reactivado.json.version,
  } });
  comprobar(cambioProveedor.estado === 200, 'Catálogo cambia después de presentación');
  comprobar(JSON.stringify((await pedir(ruta, { sesion: solicitante })).json.proveedor) === JSON.stringify(final.proveedor),
    'Fotografía no cambia al editar catálogo');

  etapa = 'listado y concurrencia HTTP';
  const consulta = await pedir(`${rutaBase}?numero=${s.numero}`, { sesion: solicitante });
  comprobar(consulta.estado === 200 && consulta.json.totalElementos === 1 && consulta.json.elementos[0].id === s.id,
    'Filtro número exacto y total visible');
  comprobar(!('conceptos' in consulta.json.elementos[0]) && !('descripcion' in consulta.json.elementos[0]), 'Listado acotado sin colección ni descripción');
  comprobar((await pedir(`${rutaBase}?numero=${s.numero}`, { sesion: ajeno })).json.totalElementos === 0, 'Conteo no revela solicitud ajena');
  comprobar((await pedir(`${rutaBase}?autor=${solicitante.id}`, { sesion: solicitante })).estado === 403, 'Filtro autor requiere visibilidad global');
  const conjunto = `asunto=${encodeURIComponent(marca.toLowerCase())}&autor=${solicitante.id}&estado=PRESENTADA&proveedor=${proveedor.json.id}&supervisor=${supervisor.id}`;
  comprobar((await pedir(`${rutaBase}?${conjunto}`, { sesion: auditor })).json.totalElementos === 1, 'Filtros AND, rol global y mayúsculas');
  comprobar((await pedir(`${rutaBase}?asunto=${encodeURIComponent(`${marca} Alamo`)}`, { sesion: solicitante })).json.totalElementos === 0, 'Asunto conserva acentos significativos');
  comprobar((await pedir(`${rutaBase}?asunto=${encodeURIComponent(`${marca}%`)}`, { sesion: solicitante })).json.totalElementos === 0, 'Porcentaje literal en asunto');
  for (const query of ['size=0', 'size=101', 'page=-1', 'sort=autor,asc', 'sort=numero,sql', 'estado=ANULADA',
    'fechaDesde=2026-12-31&fechaHasta=2026-01-01', 'page=0&page=1', 'desconocido=1'])
    comprobar((await pedir(`${rutaBase}?${query}`, { sesion: solicitante })).estado === 400, `Filtro inválido ${query}`);
  const paginada = await pedir(`${rutaBase}?asunto=${encodeURIComponent(marca)}&size=1&sort=numero,asc`, { sesion: solicitante });
  comprobar(paginada.estado === 200 && paginada.json.elementos.length === 1 && paginada.json.totalPaginas === paginada.json.totalElementos, 'Paginación conserva totales');
  const vacia = await pedir(`${rutaBase}?asunto=${encodeURIComponent(marca)}&page=1000`, { sesion: solicitante });
  comprobar(vacia.json.elementos.length === 0 && vacia.json.totalElementos === paginada.json.totalElementos, 'Página fuera de rango vacía con total');
  const carrera = await crear(solicitante, 'Carrera edición');
  const ediciones = await Promise.all([1, 2].map((n) => guardar(solicitante, carrera, { descripcion: `${marca} edición ${n}` })));
  comprobar(ediciones.filter((r) => r.estado === 200).length === 1
    && ediciones.filter((r) => r.estado === 409 && r.json.error === 'VERSION_OBSOLETA').length === 1, 'Dos guardados HTTP: un éxito y un conflicto');
  for (const misma of [true, false]) {
    const c = await crear(solicitante, `Carrera presentación ${misma}`);
    const g = await guardar(solicitante, c, { proveedorId: proveedor.json.id, supervisorId: supervisor.id, conceptos: [concepto('1', '1')] });
    comprobar(g.estado === 200, `Preparación carrera ${misma}`);
    const k = randomUUID();
    const resultados = await Promise.all([presentar(solicitante, g.json, k), presentar(solicitante, g.json, misma ? k : randomUUID())]);
    comprobar(misma ? resultados.every((r) => r.estado === 200) && JSON.stringify(resultados[0].json) === JSON.stringify(resultados[1].json)
      : resultados.filter((r) => r.estado === 200).length === 1 && resultados.filter((r) => r.estado === 409).length === 1,
    `Presentaciones concurrentes ${misma ? 'misma clave: mismo resultado' : 'claves distintas: solo una gana'}`);
    comprobar((await pedir(`${rutaBase}/${c.id}`, { sesion: solicitante })).json.version === g.json.version + 1, 'Carrera presenta una sola vez');
  }

  etapa = 'persistencia y privacidad';
  await ejecutar('docker', [...compose, 'restart', 'backend'], { cwd: raizProyecto, windowsHide: true, timeout: 60000 });
  await esperarSalud();
  const nuevo = await login('SOLICITANTE');
  const persistido = await presentar(nuevo, preparado.json, clave);
  comprobar(persistido.estado === 200 && JSON.stringify(persistido.json) === JSON.stringify(presentada.json), 'Idempotencia sobrevive reinicio backend/Flyway');
  const { stdout: logs } = await ejecutar('docker', [...compose, 'logs', '--no-color', 'backend', 'postgres'],
    { cwd: raizProyecto, windowsHide: true, maxBuffer: 30 * 1024 * 1024 });
  comprobar(!logs.includes(marca) && !logs.includes(clave), 'Logs sin asunto/conceptos/fiscal ni clave idempotente reutilizable');
  comprobar(logs.includes(`solicitud=${s.id}`), 'Eventos correlacionan solicitud sin cuerpo');
  const eventos = logs.split(/\r?\n/).filter((linea) => linea.includes(`solicitud=${s.id}`));
  comprobar(eventos.some((linea) => /peticion=/.test(linea)), 'Eventos contienen identificador de petición');
} catch (fallo) {
  error = fallo instanceof Error && fallo.message.startsWith('Criterio incumplido:')
    ? fallo.message : `Fallo de infraestructura o respuesta inesperada en etapa ${etapa}; sin volcar datos.`;
  process.exitCode = 1;
} finally {
  for (const sesion of sesiones) {
    try { sesion.acceso = undefined; await pedir('/api/autenticacion/cerrar-sesion', { sesion, metodo: 'POST' }); }
    catch { /* Preservar resultado principal; nunca imprimir credenciales. */ }
  }
  const resultado = { fecha: new Date().toISOString(), baseUrl: base.origin, resultado: error ? 'FAIL' : 'PASS',
    controles, etapa, error, limites: 'Datos ficticios únicos conservados. HTTP real sobre Compose/PostgreSQL; carreras sincronizadas y rollback forzado se comprueban además en IT. No acredita100000 registros ni OWASP completo.' };
  writeFileSync(resolve(evidencia, 'compose-solicitudes.json'), JSON.stringify(resultado, null, 2) + '\n');
  console.log(`${resultado.resultado}: ${controles.length} controles de solicitudes; evidencia sin credenciales en ${evidencia}`);
  if (error) console.error(error);
}
