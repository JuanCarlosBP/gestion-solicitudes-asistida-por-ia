import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { argumentosCompose, ejecutarDocker } from './docker-contexto.mjs';
import { randomUUID } from 'node:crypto';
import { prepararDirectorioEvidencias, raizProyecto } from './rutas-evidencia.mjs';
import { prepararUsuariosSolicitudes } from './preparar-usuarios-solicitudes.mjs';

// Integración005 exclusivamente local/ficticia; credenciales y cuerpos solo en memoria.
const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:18080');
if (base.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)
  || base.username || base.password || base.search || base.hash || base.pathname !== '/')
  throw new Error('La comprobación exige HTTP loopback sin credenciales ni parámetros.');
const evidencia = prepararDirectorioEvidencias();
const ejecutar = ejecutarDocker;
const compose = argumentosCompose();
const marca = `QA005-${randomUUID()}`;
const controles = [], sesiones = [];
let etapa = 'preparación', error, usuarioRevocado;
const uuid = (v) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    throw new Error('Identificador de fixture inválido.');
  return v;
};
function comprobar(condicion, criterio) {
  if (!condicion) throw new Error(`Criterio incumplido: ${criterio}`);
  controles.push({ criterio, resultado: 'PASS' });
}
async function sql(texto) {
  const { stdout } = await ejecutar('docker', [...compose, 'exec', '-T', 'postgres', 'psql',
    '-U', 'administrador_local', '-d', 'gestion', '-v', 'ON_ERROR_STOP=1', '-tAc', texto],
  { cwd: raizProyecto, windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024 });
  return stdout.trim();
}
async function pedir(ruta, { sesion, metodo = 'GET', cuerpo, clave, xsrf = true } = {}) {
  const headers = {};
  if (sesion?.cookies.size) headers.Cookie = [...sesion.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  if (sesion?.acceso) headers.Authorization = `Bearer ${sesion.acceso}`;
  if (metodo !== 'GET' && xsrf && sesion?.cookies.has('XSRF-TOKEN'))
    headers['X-XSRF-TOKEN'] = decodeURIComponent(sesion.cookies.get('XSRF-TOKEN'));
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  if (clave !== undefined) headers['Idempotency-Key'] = clave;
  // No altera negativos de decisión sin clave; solo adapta altas/estados006.
  else if (metodo === 'POST' && (ruta === '/api/solicitudes' || /^\/api\/proveedores(?:\/|$)/.test(ruta)))
    headers['Idempotency-Key'] = randomUUID();
  const r = await fetch(new URL(ruta, base), { method: metodo, headers,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(15000), redirect: 'error' });
  for (const cookie of r.headers.getSetCookie()) {
    const par = cookie.split(';')[0], i = par.indexOf('='), nombre = par.slice(0, i), valor = par.slice(i + 1);
    if (!valor || /max-age=0(?:;|$)/i.test(cookie)) sesion?.cookies.delete(nombre);
    else sesion?.cookies.set(nombre, valor);
  }
  const contenido = await r.text();
  return { estado: r.status, cabeceras: r.headers, json: contenido ? JSON.parse(contenido) : null };
}
async function login(rol, usuario) {
  const sesion = { cookies: new Map(), rol };
  await pedir('/api/autenticacion/csrf', { sesion });
  const r = await pedir('/api/autenticacion/iniciar-sesion', { sesion, metodo: 'POST', cuerpo: {
    correo: usuario?.correo || `${rol.toLowerCase()}@demo.invalid`,
    contrasena: `Ejemplo local ${usuario ? 'solicitante' : rol.toLowerCase()} 2026`,
  } });
  comprobar(r.estado === 200, `Login ficticio ${rol} (HTTP ${r.estado})`);
  Object.assign(sesion, { acceso: r.json.accessToken, id: r.json.usuario.id });
  sesiones.push(sesion);
  return sesion;
}
async function salud() {
  const fin = Date.now() + 60000;
  while (Date.now() < fin) {
    try { if ((await pedir('/api/salud')).estado === 200) return; } catch { /* arranque */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('No se recuperó la API.');
}
const detalle = async (sesion, id) => pedir(`/api/solicitudes/${id}`, { sesion });
const decidir = (sesion, s, tipo, texto, clave = randomUUID(), cambios = {}) =>
  pedir(`/api/solicitudes/${s.id}/${tipo}`, { sesion, metodo: 'POST', clave,
    cuerpo: { version: s.version, ...(tipo === 'aprobar' ? { comentario: texto } : { motivo: texto }), ...cambios } });
const estable = (s) => JSON.stringify({ autor: s.autor, asunto: s.asunto, descripcion: s.descripcion,
  proveedor: s.proveedor, proveedorId: s.proveedorId, supervisor: s.supervisor, supervisorId: s.supervisorId,
  moneda: s.moneda, importeTotal: s.importeTotal, conceptos: s.conceptos, presentadoEn: s.presentadoEn });
async function eventoUnico(id, tipo) {
  const r = await sql(`SELECT count(*)||':'||min(tipo) FROM gestion.decisiones_solicitud WHERE solicitud_id='${uuid(id)}'`);
  comprobar(r === `1:${tipo.toUpperCase()}`, `Un único evento ${tipo} persistido`);
}

try {
  await salud();
  const usuarios = await prepararUsuariosSolicitudes();
  const otroId = randomUUID();
  usuarios.supervisorAjeno = { id: otroId, correo: `qa-supervisor-${otroId}@demo.invalid` };
  await sql(`BEGIN; INSERT INTO gestion.usuarios(id,correo,nombre_visible,clave_hash,habilitado,creado_en,actualizado_en)
    SELECT '${otroId}','${usuarios.supervisorAjeno.correo}','QA supervisor ${otroId}',clave_hash,true,date_trunc('second',now()),date_trunc('second',now())
    FROM gestion.usuarios WHERE correo='solicitante@demo.invalid';
    INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES ('${otroId}','SUPERVISOR'); COMMIT;`);
  writeFileSync(resolve(evidencia, 'usuarios-aprobaciones.json'), JSON.stringify(usuarios, null, 2) + '\n');
  comprobar(await sql(`SELECT bool_and(creado_en=date_trunc('second',creado_en)
    AND actualizado_en=date_trunc('second',actualizado_en)) FROM gestion.usuarios
    WHERE id IN (${Object.values(usuarios).map((u) => `'${uuid(u.id)}'`).join(',')})`) === 't',
  'Fixtures usan precisión de segundos coherente con identidad antes de autenticar');
  const admin = await login('ADMINISTRADOR'), auditor = await login('AUDITOR');
  const solicitante = await login('SOLICITANTE'), supervisor = await login('SUPERVISOR');
  const ajeno = await login('AJENO', usuarios.ajeno), multiple = await login('MULTIPLE', usuarios.multiple);
  const supervisorAjeno = await login('SUPERVISOR_AJENO', usuarios.supervisorAjeno);
  const p = await pedir('/api/proveedores', { sesion: admin, metodo: 'POST', cuerpo: {
    tipo: 'PROFESIONAL', denominacion: `${marca} proveedor`, paisFiscal: 'ES', identificadorFiscal: marca,
    correoContacto: null, telefonoContacto: null,
  } });
  comprobar(p.estado === 201, 'Proveedor exclusivo005 creado');
  async function preparar(sufijo, autor = solicitante, asignado = supervisor) {
    const c = await pedir('/api/solicitudes', { sesion: autor, metodo: 'POST', cuerpo: { asunto: `${marca} ${sufijo}` } });
    comprobar(c.estado === 201, `Borrador ${sufijo}`);
    const g = await pedir(`/api/solicitudes/${c.json.id}`, { sesion: autor, metodo: 'PUT', cuerpo: {
      asunto: c.json.asunto, descripcion: `${marca} descripción privada`, proveedorId: p.json.id,
      supervisorId: asignado.id, version: c.json.version,
      conceptos: [{ id: null, descripcion: `${marca} concepto privado`, cantidad: '1', unidad: 'UNIDAD', precioUnitario: '10', posicion: 1 }],
    } });
    comprobar(g.estado === 200, `Agregado ${sufijo}`);
    const clavePresentar = randomUUID();
    const r = await pedir(`/api/solicitudes/${c.json.id}/presentar`, { sesion: autor, metodo: 'POST',
      clave: clavePresentar, cuerpo: { version: g.json.version } });
    comprobar(r.estado === 200, `Presentada ${sufijo}`);
    const d = await detalle(autor, c.json.id);
    comprobar(d.estado === 200 && d.json.decididoEn === null && d.json.decision === null, 'Presentada sin decisión previa');
    return { s: d.json, presentacion: r.json, clavePresentar, versionPresentar: g.json.version, autor };
  }

  etapa = 'permisos, entradas y aprobación';
  const principal = await preparar('Aprobación');
  const { s } = principal;
  const anonima = { cookies: new Map() };
  await pedir('/api/autenticacion/csrf', { sesion: anonima });
  comprobar((await decidir(anonima, s, 'aprobar', null)).estado === 401, 'Decisión exige identidad aun con CSRF');
  for (const [sesion, esperado] of [[admin, 403], [auditor, 403], [solicitante, 403], [multiple, 403], [ajeno, 403], [supervisorAjeno, 404]])
    comprobar((await decidir(sesion, s, 'aprobar', null)).estado === esperado, `${sesion.rol} no asignado no decide`);
  comprobar((await pedir(`/api/solicitudes/${s.id}/aprobar`, { sesion: supervisor, metodo: 'POST', clave: randomUUID(),
    xsrf: false, cuerpo: { version: s.version } })).estado === 403, 'Bearer sin CSRF no decide');
  for (const clave of [undefined, 'incorrecta'])
    comprobar((await pedir(`/api/solicitudes/${s.id}/aprobar`, { sesion: supervisor, metodo: 'POST', clave,
      cuerpo: { version: s.version } })).estado === 400, 'Clave obligatoria UUID');
  for (const cuerpo of [{}, { version: -1 }, { version: '2' }, { version: s.version, estado: 'APROBADA' },
    { version: s.version, comentario: 'x'.repeat(501) }, { version: s.version, comentario: 1 },
    { version: s.version, comentario: '\ud800' }])
    comprobar((await pedir(`/api/solicitudes/${s.id}/aprobar`, { sesion: supervisor, metodo: 'POST',
      clave: randomUUID(), cuerpo })).estado === 400, 'Aprobación rechaza entrada inválida sin efecto');
  for (const motivo of [undefined, null, '', ' '.repeat(12), 'x'.repeat(9), 'x'.repeat(1001), 100])
    comprobar((await decidir(supervisor, s, 'rechazar', motivo)).estado === 400, 'Rechazo exige motivo10–1000');
  const antigua = await decidir(supervisor, s, 'aprobar', null, randomUUID(), { version: s.version - 1 });
  comprobar(antigua.estado === 409 && antigua.json.error === 'VERSION_OBSOLETA', 'Versión obsoleta409');
  comprobar((await detalle(solicitante, s.id)).json.version === s.version, 'Negativos conservan estado/versión');
  comprobar(await sql(`SELECT count(*) FROM gestion.decisiones_solicitud WHERE solicitud_id='${uuid(s.id)}'`) === '0', 'Negativos no insertan evento');
  const clave = randomUUID(), comentario = `${marca} comentario confidencial ficticio`;
  const aprobada = await decidir(supervisor, s, 'aprobar', `  ${comentario}  `, clave);
  comprobar(aprobada.estado === 200 && aprobada.json.estado === 'APROBADA' && aprobada.json.version === s.version + 1, 'Aprobar cambia estado/versión una vez');
  comprobar(Object.keys(aprobada.json).sort().join(',') === 'actualizadoEn,decididoEn,estado,id,numero,version'
    && aprobada.json.decididoEn === aprobada.json.actualizadoEn, 'Resultado mínimo y fecha servidor coherentes');
  comprobar(aprobada.cabeceras.get('cache-control')?.includes('no-store'), 'Decisión privada no-store');
  const replay = await decidir(supervisor, s, 'aprobar', comentario, clave);
  comprobar(replay.estado === 200 && JSON.stringify(replay.json) === JSON.stringify(aprobada.json), 'Replay exacto con texto normalizado');
  const distintoTexto = await decidir(supervisor, s, 'aprobar', `${comentario} distinto`, clave);
  comprobar(distintoTexto.estado === 409 && distintoTexto.json.error === 'CLAVE_IDEMPOTENCIA_REUTILIZADA', 'Misma clave/texto distinto409');
  const otraOperacion = await decidir(supervisor, s, 'rechazar', comentario, clave);
  comprobar(otraOperacion.estado === 409 && otraOperacion.json.error === 'CLAVE_IDEMPOTENCIA_REUTILIZADA', 'Misma clave/operación distinta409');
  const nueva = await decidir(supervisor, { ...s, version: aprobada.json.version }, 'rechazar', comentario);
  comprobar(nueva.estado === 409 && nueva.json.error === 'SOLICITUD_NO_DECIDIBLE', 'Estado final no admite decisión nueva');
  const final = (await detalle(solicitante, s.id)).json;
  comprobar(estable(final) === estable(s), 'Decisión conserva cabecera, conceptos, fotografía, asignación y presentadoEn');
  comprobar(final.decision.tipo === 'APROBAR' && final.decision.actor.id === supervisor.id
    && final.decision.comentario === comentario && final.decision.motivo === null
    && final.decision.decididoEn === final.decididoEn, 'Detalle ofrece evento mínimo autorizado');
  await eventoUnico(s.id, 'aprobar');
  for (const sesion of [solicitante, supervisor, auditor, admin])
    comprobar((await detalle(sesion, s.id)).estado === 200, `Final visible ${sesion.rol}`);
  for (const sesion of [ajeno, supervisorAjeno])
    comprobar((await detalle(sesion, s.id)).estado === 404, `Final invisible ${sesion.rol}`);
  const lista = await pedir(`/api/solicitudes?numero=${s.numero}&estado=APROBADA`, { sesion: supervisor });
  comprobar(lista.estado === 200 && lista.json.totalElementos === 1 && lista.json.elementos[0].decididoEn
    && !('decision' in lista.json.elementos[0]) && !('comentario' in lista.json.elementos[0]), 'Listado final sin texto de decisión');
  comprobar((await pedir(`/api/solicitudes?numero=${s.numero}&estado=PRESENTADA&supervisor=${supervisor.id}`, { sesion: supervisor })).json.totalElementos === 0,
    'Aprobada desaparece de pendientes');
  const replay004 = await pedir(`/api/solicitudes/${s.id}/presentar`, { sesion: solicitante, metodo: 'POST',
    clave: principal.clavePresentar, cuerpo: { version: principal.versionPresentar } });
  comprobar(replay004.estado === 200 && JSON.stringify(replay004.json) === JSON.stringify(principal.presentacion), 'Replay004 tras aprobación conserva resultado PRESENTADA original');

  etapa = 'rechazo, multirrol y referencias';
  const rechazo = await preparar('Rechazo');
  const reutilizada = await decidir(supervisor, rechazo.s, 'aprobar', comentario, clave);
  comprobar(reutilizada.estado === 409 && reutilizada.json.error === 'CLAVE_IDEMPOTENCIA_REUTILIZADA', 'Misma clave en otro recurso409');
  const claveRechazo = randomUUID(), motivo = `${marca} motivo confidencial ficticio`;
  const rechazada = await decidir(supervisor, rechazo.s, 'rechazar', motivo, claveRechazo);
  comprobar(rechazada.estado === 200 && rechazada.json.estado === 'RECHAZADA', 'Rechazo válido final');
  const dRechazo = (await detalle(solicitante, rechazo.s.id)).json;
  comprobar(dRechazo.decision.motivo === motivo && dRechazo.decision.comentario === null
    && estable(dRechazo) === estable(rechazo.s), 'Motivo visible al autor y agregado preservado');
  comprobar(JSON.stringify((await decidir(supervisor, rechazo.s, 'rechazar', motivo, claveRechazo)).json) === JSON.stringify(rechazada.json), 'Replay rechazo exacto');
  await eventoUnico(rechazo.s.id, 'rechazar');
  const maximo = await preparar('Comentario Unicode máximo');
  comprobar((await decidir(supervisor, maximo.s, 'aprobar', '🧾'.repeat(500))).estado === 200, 'Comentario500 puntos Unicode permitido');
  const minimo = await preparar('Motivo mínimo');
  comprobar((await decidir(supervisor, minimo.s, 'rechazar', '1234567890')).estado === 200, 'Motivo10 permitido');
  const vacio = await preparar('Comentario opcional');
  comprobar((await decidir(supervisor, vacio.s, 'aprobar', undefined)).estado === 200
    && (await detalle(solicitante, vacio.s.id)).json.decision.comentario === null, 'Comentario omitido normalizado null');
  const multirrol = await preparar('Multirrol asignado', solicitante, multiple);
  comprobar((await decidir(multiple, multirrol.s, 'aprobar', null)).estado === 200, 'Multirrol asignado decide por SUPERVISOR');
  const propia = await preparar('Propia multirrol', multiple, supervisor);
  comprobar((await decidir(multiple, propia.s, 'aprobar', null)).estado === 403, 'Multirrol nunca decide propia solicitud');
  const sinProveedorActivo = await preparar('Proveedor desactivado después de presentar');
  const baja = await pedir(`/api/proveedores/${p.json.id}/desactivar`, { sesion: admin, metodo: 'POST', cuerpo: { version: p.json.version } });
  comprobar(baja.estado === 200, 'Baja posterior de proveedor preparada');
  comprobar((await decidir(supervisor, sinProveedorActivo.s, 'aprobar', null)).estado === 200, 'Decidir usa fotografía sin exigir proveedor activo nuevamente');
  comprobar((await pedir(`/api/proveedores/${p.json.id}/reactivar`, { sesion: admin, metodo: 'POST', cuerpo: { version: baja.json.version } })).estado === 200,
    'Proveedor ficticio reactivado');

  etapa = 'carreras y autorización vigente';
  for (const [a, b, misma] of [['aprobar', 'aprobar', false], ['rechazar', 'rechazar', false], ['aprobar', 'rechazar', false], ['aprobar', 'aprobar', true]]) {
    const preparada = await preparar(`Carrera ${a}-${b}-${misma}`), k = randomUUID();
    const rs = await Promise.all([decidir(supervisor, preparada.s, a, motivo, k), decidir(supervisor, preparada.s, b, motivo, misma ? k : randomUUID())]);
    comprobar(misma ? rs.every((r) => r.estado === 200) && JSON.stringify(rs[0].json) === JSON.stringify(rs[1].json)
      : rs.filter((r) => r.estado === 200).length === 1 && rs.filter((r) => r.estado === 409).length === 1,
    `Carrera HTTP ${a}/${b}, clave ${misma ? 'igual' : 'distinta'}`);
    comprobar((await detalle(solicitante, preparada.s.id)).json.version === preparada.s.version + 1, 'Carrera incrementa versión una vez');
    comprobar(await sql(`SELECT count(*) FROM gestion.decisiones_solicitud WHERE solicitud_id='${uuid(preparada.s.id)}'`) === '1', 'Carrera deja un evento');
  }
  const revocable = await preparar('Rol vigente', solicitante, multiple), claveRevocable = randomUUID();
  const decisionRevocable = await decidir(multiple, revocable.s, 'aprobar', null, claveRevocable);
  comprobar(decisionRevocable.estado === 200, 'Decisión previa a revocar rol');
  usuarioRevocado = usuarios.multiple.id;
  await sql(`DELETE FROM gestion.usuarios_roles WHERE usuario_id='${uuid(usuarioRevocado)}' AND rol='SUPERVISOR'`);
  comprobar((await decidir(multiple, revocable.s, 'aprobar', null, claveRevocable)).estado === 403, 'Replay denegado tras retirar rol aunque JWT conserva claim');
  await sql(`INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES ('${uuid(usuarioRevocado)}','SUPERVISOR') ON CONFLICT DO NOTHING`);
  await sql(`UPDATE gestion.usuarios SET habilitado=false WHERE id='${uuid(usuarioRevocado)}'`);
  comprobar((await decidir(multiple, revocable.s, 'aprobar', null, claveRevocable)).estado === 401, 'Replay denegado tras deshabilitar identidad');
  await sql(`UPDATE gestion.usuarios SET habilitado=true WHERE id='${uuid(usuarioRevocado)}'`);
  usuarioRevocado = undefined;

  etapa = 'reinicio y privacidad';
  await ejecutar('docker', [...compose, 'restart', 'backend'], { cwd: raizProyecto, windowsHide: true, timeout: 60000 });
  await salud();
  const renovado = await login('SUPERVISOR');
  const persistida = await decidir(renovado, s, 'aprobar', comentario, clave);
  comprobar(persistida.estado === 200 && JSON.stringify(persistida.json) === JSON.stringify(aprobada.json), 'Decisión idempotente persiste tras reinicio/Flyway');
  const { stdout: logs } = await ejecutar('docker', [...compose, 'logs', '--no-color', 'backend', 'postgres'],
    { cwd: raizProyecto, windowsHide: true, maxBuffer: 40 * 1024 * 1024 });
  comprobar(!logs.includes(marca) && !logs.includes(clave) && !logs.includes(claveRechazo), 'Logs sin comentario, motivo, descripción, fiscal ni claves reutilizables');
  for (const [id, accion] of [[s.id, 'APROBAR'], [rechazo.s.id, 'RECHAZAR']]) {
    const exitos = logs.split(/\r?\n/).filter((linea) => linea.includes(`accion=${accion} `)
      && linea.includes(`solicitud=${id} `) && linea.includes('resultado=CORRECTO'));
    comprobar(exitos.length === 1 && exitos[0].includes('peticion=')
      && /clave_hash=[0-9a-f]{64}/i.test(exitos[0]), `Un evento técnico ${accion} con petición y hash, sin duplicado por replay`);
  }
} catch (fallo) {
  error = fallo instanceof Error && fallo.message.startsWith('Criterio incumplido:') ? fallo.message
    : `Fallo de infraestructura o respuesta inesperada en etapa ${etapa}; sin volcar datos.`;
  process.exitCode = 1;
} finally {
  if (usuarioRevocado) {
    try { await sql(`BEGIN; UPDATE gestion.usuarios SET habilitado=true WHERE id='${uuid(usuarioRevocado)}';
      INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES ('${uuid(usuarioRevocado)}','SUPERVISOR') ON CONFLICT DO NOTHING; COMMIT;`); }
    catch { error = `${error || 'Fallo de QA'}; pendiente restaurar rol/habilitación del usuario ficticio exclusivo.`; process.exitCode = 1; }
  }
  for (const sesion of sesiones) {
    try { sesion.acceso = undefined; await pedir('/api/autenticacion/cerrar-sesion', { sesion, metodo: 'POST' }); }
    catch { /* No sustituir resultado principal ni publicar credenciales. */ }
  }
  const resultado = { fecha: new Date().toISOString(), baseUrl: base.origin, resultado: error ? 'FAIL' : 'PASS', controles, etapa, error,
    limite: 'Datos ficticios únicos conservados; HTTP real. Rollback y carreras DB sincronizadas se verifican además en IT. No acredita carga objetivo ni OWASP completo.' };
  writeFileSync(resolve(evidencia, 'compose-aprobaciones.json'), JSON.stringify(resultado, null, 2) + '\n');
  console.log(`${resultado.resultado}: ${controles.length} controles de aprobaciones; evidencia sin credenciales en ${evidencia}`);
  if (error) console.error(error);
}
