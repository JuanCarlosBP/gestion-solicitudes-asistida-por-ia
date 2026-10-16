import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID, createHash } from 'node:crypto';
import { prepararDirectorioEvidencias, raizProyecto, rutaDelProyecto } from './rutas-evidencia.mjs';

const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:18080');
if (base.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)
  || base.username || base.password || base.search || base.hash || base.pathname !== '/')
  throw new Error('QA006 requiere HTTP loopback sin credenciales en URL.');
const evidencia = prepararDirectorioEvidencias();
const ejecutar = promisify(execFile);
const compose = ['compose', '--env-file', rutaDelProyecto(process.env.QA_ENTORNO || 'infraestructura/.env.example'), '-f', 'infraestructura/compose.yaml'];
const controles = [], mediciones = [], sesiones = [];
const marca = `QA006-${randomUUID()}`;
let etapa = 'preparación', error, rolRetirado, postgresParado = false;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const uuid = (id) => { if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('UUID fixture inválido'); return id; };
const docker = async (args) => (await ejecutar('docker', [...compose, ...args],
  { cwd: raizProyecto, windowsHide: true, timeout: 90000, maxBuffer: 1024 * 1024 })).stdout.trim();
const sql = (consulta) => docker(['exec', '-T', 'postgres', 'psql', '-U', 'administrador_local', '-d', 'gestion', '-v', 'ON_ERROR_STOP=1', '-tAc', consulta]);
function comprobar(valor, criterio) {
  if (!valor) throw new Error(`Criterio incumplido: ${criterio}`);
  controles.push({ criterio, resultado: 'PASS' });
}
async function pedir(ruta, { sesion, metodo = 'GET', cuerpo, clave, xsrf = true } = {}) {
  const headers = {};
  if (sesion?.cookies.size) headers.Cookie = [...sesion.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  if (sesion?.acceso) headers.Authorization = `Bearer ${sesion.acceso}`;
  if (metodo !== 'GET' && xsrf && sesion?.cookies.has('XSRF-TOKEN'))
    headers['X-XSRF-TOKEN'] = decodeURIComponent(sesion.cookies.get('XSRF-TOKEN'));
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  if (clave !== undefined) headers['Idempotency-Key'] = clave;
  const inicio = performance.now();
  const respuesta = await fetch(new URL(ruta, base), { method: metodo, headers,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo), signal: AbortSignal.timeout(15000), redirect: 'error' });
  for (const cookie of respuesta.headers.getSetCookie()) {
    const par = cookie.split(';')[0], i = par.indexOf('='), nombre = par.slice(0, i), valor = par.slice(i + 1);
    if (!valor || /max-age=0(?:;|$)/i.test(cookie)) sesion?.cookies.delete(nombre);
    else sesion?.cookies.set(nombre, valor);
  }
  const texto = await respuesta.text();
  return { estado: respuesta.status, json: texto ? JSON.parse(texto) : null,
    cabeceras: respuesta.headers, ms: performance.now() - inicio };
}
async function salud() {
  const fin = Date.now() + 60000;
  while (Date.now() < fin) {
    try { if ((await pedir('/api/salud')).estado === 200) return; } catch { /* arranque */ }
    await pausa(500);
  }
  throw new Error('La API no recuperó salud.');
}
async function login(rol) {
  const sesion = { cookies: new Map() };
  await pedir('/api/autenticacion/csrf', { sesion });
  const r = await pedir('/api/autenticacion/iniciar-sesion', { sesion, metodo: 'POST',
    cuerpo: { correo: `${rol.toLowerCase()}@demo.invalid`, contrasena: `Ejemplo local ${rol.toLowerCase()} 2026` } });
  comprobar(r.estado === 200, `Login ficticio ${rol}`);
  Object.assign(sesion, { acceso: r.json.accessToken, id: r.json.usuario.id });
  sesiones.push(sesion); return sesion;
}
const datosProveedor = (sufijo = '') => ({ tipo: 'PROFESIONAL', denominacion: `${marca}${sufijo}`,
  paisFiscal: 'ES', identificadorFiscal: `${marca}${sufijo}`, correoContacto: null, telefonoContacto: null });
const editable = (p) => Object.fromEntries(['tipo', 'denominacion', 'paisFiscal', 'identificadorFiscal',
  'correoContacto', 'telefonoContacto', 'version'].map((k) => [k, p[k]]));
const post = (sesion, ruta, cuerpo, clave = randomUUID()) => pedir(ruta, { sesion, metodo: 'POST', cuerpo, clave });
const recuperar = (sesion, clave) => pedir(`/api/operaciones-idempotentes/${clave}`, { sesion });
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

try {
  await salud();
  let admin = await login('ADMINISTRADOR'), solicitante = await login('SOLICITANTE');
  const supervisor = await login('SUPERVISOR'), auditor = await login('AUDITOR');
  const claveAlta = randomUUID(), entrada = datosProveedor();
  const alta = await post(admin, '/api/proveedores', entrada, claveAlta);
  comprobar(alta.estado === 201, 'CI01 alta proveedor201');
  const p = alta.json, ruta = `/api/proveedores/${p.id}`;
  comprobar((await post(admin, '/api/proveedores', entrada, claveAlta)).estado === 201, 'CI04 replay alta201');
  const editado = await pedir(ruta, { sesion: admin, metodo: 'PUT', cuerpo: { ...editable(p), denominacion: `${marca} editado` } });
  comprobar(editado.estado === 200, 'CI01 PUT proveedor sin clave conserva contrato');
  comprobar(igual((await post(admin, '/api/proveedores', entrada, claveAlta)).json, p), 'CI04 replay original después de PUT');
  const recuperada = await recuperar(admin, claveAlta);
  comprobar(recuperada.estado === 200 && recuperada.json.estado === 'COMPLETADA'
    && recuperada.json.resultado.id === p.id && recuperada.json.resultado.version === 0, 'CI06 consulta éxito original mínimo');
  comprobar(Object.keys(recuperada.json.resultado).every((c) => ['estadoHttp', 'id', 'version', 'estado', 'numero'].includes(c)), 'CI05 recuperación sin campos sensibles');
  comprobar((await recuperar(auditor, claveAlta)).estado === 404, 'CI05 otra cuenta no ve clave conocida');
  comprobar((await pedir(`/api/operaciones-idempotentes/${claveAlta}`)).estado === 401, 'CI05 recuperación sin identidad401');
  comprobar((await recuperar(admin, randomUUID())).estado === 404, 'CI09 inexistente404');
  comprobar((await recuperar(admin, 'no-uuid')).estado === 400, 'CI09 UUID inválido400');

  etapa = 'operaciones y errores';
  const claveBaja = randomUUID();
  const baja = await post(admin, `${ruta}/desactivar`, { version: editado.json.version }, claveBaja);
  comprobar(baja.estado === 200 && !baja.json.activo, 'CI01 desactivar200');
  comprobar(igual((await post(admin, `${ruta}/desactivar`, { version: editado.json.version }, claveBaja)).json, baja.json), 'CI04 replay baja exacto');
  const incompatible = await post(admin, `${ruta}/reactivar`, { version: baja.json.version }, claveBaja);
  comprobar(incompatible.estado === 409 && incompatible.json.error === 'CLAVE_IDEMPOTENCIA_REUTILIZADA', 'CI03 incompatibilidad transversal409');
  const claveReactivar = randomUUID();
  const activa = await post(admin, `${ruta}/reactivar`, { version: baja.json.version }, claveReactivar);
  comprobar(activa.estado === 200 && activa.json.activo, 'CI01 reactivar200');
  comprobar(igual((await post(admin, `${ruta}/reactivar`, { version: baja.json.version }, claveReactivar)).json, activa.json), 'CI04 replay reactivación');
  for (const [rutaPost, cuerpo] of [['/api/proveedores', datosProveedor('-invalido')],
    [`${ruta}/desactivar`, { version: activa.json.version }], [`${ruta}/reactivar`, { version: activa.json.version }]]) {
    for (const clave of [undefined, 'invalida']) comprobar((await pedir(rutaPost, { sesion: admin, metodo: 'POST', cuerpo, clave })).estado === 400, 'CI01 proveedor exige UUID válido');
  }
  comprobar((await pedir('/api/solicitudes', { sesion: solicitante, metodo: 'POST', cuerpo: { asunto: marca } })).estado === 400, 'CI01 alta borrador exige clave');
  comprobar((await pedir('/api/solicitudes', { sesion: solicitante, metodo: 'POST', cuerpo: { asunto: marca }, clave: 'invalida' })).estado === 400, 'CI01 alta borrador UUID inválido');
  comprobar((await pedir('/api/proveedores', { sesion: admin, metodo: 'POST', cuerpo: entrada, clave: claveAlta, xsrf: false })).estado === 403, 'CI05 replay no evita CSRF');
  for (const decision of ['aprobar', 'rechazar']) {
    const claveCrear = randomUUID(), asunto = `${marca} ${decision}`;
    const creada = await post(solicitante, '/api/solicitudes', { asunto }, claveCrear);
    comprobar(creada.estado === 201, 'CI01 crear borrador201');
    const s = creada.json, rs = `/api/solicitudes/${s.id}`;
    const guardada = await pedir(rs, { sesion: solicitante, metodo: 'PUT', cuerpo: { asunto, descripcion: null,
      proveedorId: p.id, supervisorId: supervisor.id, version: s.version,
      conceptos: [{ id: null, descripcion: 'Concepto ficticio006', cantidad: '1', precioUnitario: '10', unidad: 'UNIDAD', posicion: 1 }] } });
    comprobar(guardada.estado === 200, 'CI01 guardar borrador sin clave');
    comprobar(igual((await post(solicitante, '/api/solicitudes', { asunto }, claveCrear)).json, s), 'CI04 replay borrador inicial tras guardar');
    const clavePresentar = randomUUID();
    const presentada = await post(solicitante, `${rs}/presentar`, { version: guardada.json.version }, clavePresentar);
    comprobar(presentada.estado === 200, 'CI01 presentar200');
    const claveDecision = randomUUID();
    const cuerpoDecision = { version: presentada.json.version, ...(decision === 'aprobar' ? { comentario: 'Texto ficticio006' } : { motivo: 'Motivo ficticio suficiente006' }) };
    const decidida = await post(supervisor, `${rs}/${decision}`, cuerpoDecision, claveDecision);
    comprobar(decidida.estado === 200, `CI01 ${decision}200`);
    comprobar(igual((await post(supervisor, `${rs}/${decision}`, cuerpoDecision, claveDecision)).json, decidida.json), 'CI04 replay decisión exacta');
    comprobar(igual((await post(solicitante, `${rs}/presentar`, { version: guardada.json.version }, clavePresentar)).json, presentada.json), 'CI08 replay PRESENTADA después de decisión');
    comprobar(await sql(`SELECT count(*) FROM gestion.decisiones_solicitud WHERE solicitud_id='${uuid(s.id)}'`) === '1', 'CI04 un evento de decisión');
    comprobar((await recuperar(supervisor, claveDecision)).json.resultado.estado === decidida.json.estado, 'CI06 decisión recuperable');
  }

  etapa = 'veinte peticiones';
  const claveCarrera = randomUUID();
  const inicioMisma = performance.now();
  const mismas = await Promise.all(Array.from({ length: 20 }, () => post(solicitante, '/api/solicitudes', { asunto: `${marca} carrera misma` }, claveCarrera)));
  mediciones.push({ escenario: '20 misma clave', totalMs: performance.now() - inicioMisma, peticionesMs: mismas.map((r) => r.ms) });
  comprobar(mismas.every((r) => r.estado === 201 && igual(r.json, mismas[0].json)), 'CI04 veinte misma clave mismo resultado sin503');
  comprobar(await sql(`SELECT count(*) FROM gestion.solicitudes WHERE id='${uuid(mismas[0].json.id)}'`) === '1', 'CI04 una fila para veinte peticiones');
  const inicioDistintas = performance.now();
  const distintas = await Promise.all(Array.from({ length: 20 }, (_, i) => post(solicitante, '/api/solicitudes', { asunto: `${marca} independiente${i}` })));
  mediciones.push({ escenario: '20 claves distintas', totalMs: performance.now() - inicioDistintas, peticionesMs: distintas.map((r) => r.ms) });
  comprobar(distintas.every((r) => r.estado === 201) && new Set(distintas.map((r) => r.json.id)).size === 20, 'CI09 veinte claves distintas veinte efectos sin503');
  const cambios = await Promise.all([1, 2].map((i) => pedir(ruta, { sesion: admin, metodo: 'PUT',
    cuerpo: { ...editable(activa.json), denominacion: `${marca} versión${i}` } })));
  comprobar(cambios.filter((r) => r.estado === 200).length === 1
    && cambios.filter((r) => r.estado === 409 && r.json.error === 'VERSION_OBSOLETA').length === 1, 'CI02 dos versiones un éxito y VERSION_OBSOLETA');

  etapa = 'espera acotada';
  const actual = (await pedir(ruta, { sesion: admin })).json;
  const claveEspera = randomUUID();
  const idBloqueo = createHash('sha256').update(`${admin.id}:${claveEspera}`).digest().readBigInt64BE().toString();
  // Retener el advisory lock evita agotar socketTimeout JDBC al bloquear una fila.
  // El titular HTTP intenta adquirirlo sin consulta SQL bloqueante y expira a3s.
  const bloqueo = sql(`BEGIN; SET LOCAL application_name='qa006_bloqueo'; SELECT pg_advisory_xact_lock(${idBloqueo}); SELECT pg_sleep(6); COMMIT;`);
  const limiteLock = Date.now() + 4000;
  while (await sql("SELECT count(*) FROM pg_stat_activity WHERE application_name='qa006_bloqueo' AND wait_event='PgSleep'") !== '1') {
    if (Date.now() > limiteLock) throw new Error('No se confirmó bloqueo controlado.');
    await pausa(30);
  }
  const primera = post(admin, `${ruta}/desactivar`, { version: actual.version }, claveEspera);
  const limiteProgreso = Date.now() + 2000;
  let estadoProgreso;
  do { estadoProgreso = await recuperar(admin, claveEspera); if (estadoProgreso.json?.estado === 'EN_PROGRESO') break; await pausa(30); } while (Date.now() < limiteProgreso);
  comprobar(estadoProgreso.estado === 200 && estadoProgreso.json.estado === 'EN_PROGRESO', 'CI09 GET progreso real durante bloqueo');
  const segunda = await post(admin, `${ruta}/desactivar`, { version: actual.version }, claveEspera);
  mediciones.push({ escenario: 'duplicado con titular bloqueado', ms: segunda.ms, estado: segunda.estado });
  comprobar(segunda.estado === 409 && segunda.json.error === 'OPERACION_EN_PROGRESO'
    && segunda.cabeceras.get('retry-after') === '1', 'CI09 timeout409 y Retry-After1');
  // HTTP incluye transporte/filtros: el límite interno exacto se verifica aparte en IT.
  comprobar(segunda.ms >= 2500 && segunda.ms < 3600, 'CI09 espera HTTP observada en torno a3s sin espera ilimitada');
  await bloqueo;
  const primeraTerminada = await primera;
  comprobar(primeraTerminada.estado === 409 && primeraTerminada.json.error === 'OPERACION_EN_PROGRESO', 'CI09 titular también respeta espera máxima sin efecto');
  const terminada = await post(admin, `${ruta}/desactivar`, { version: actual.version }, claveEspera);
  comprobar(terminada.estado === 200 && terminada.json.version === actual.version + 1, 'CI06 reintento tras liberar bloqueo ejecuta una sola transición');
  comprobar(igual((await post(admin, `${ruta}/desactivar`, { version: actual.version }, claveEspera)).json, terminada.json), 'CI04 replay después de en-progreso recupera original');

  etapa = 'revocación y reinicio';
  rolRetirado = admin.id;
  await sql(`DELETE FROM gestion.usuarios_roles WHERE usuario_id='${uuid(admin.id)}' AND rol='ADMINISTRADOR'`);
  comprobar((await recuperar(admin, claveAlta)).estado === 404, 'CI05 permiso revocado oculta recuperación con JWT vigente');
  comprobar((await post(admin, '/api/proveedores', entrada, claveAlta)).estado === 403, 'CI05 permiso revocado impide replay');
  await sql(`INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES('${uuid(admin.id)}','ADMINISTRADOR') ON CONFLICT DO NOTHING`);
  rolRetirado = null;
  await docker(['restart', 'backend']); await salud();
  // Perfil local rota clave de firma al reiniciar; no rebajar esa garantía001/002.
  const identidades = [admin.id, solicitante.id];
  admin = await login('ADMINISTRADOR'); solicitante = await login('SOLICITANTE');
  comprobar(igual([admin.id, solicitante.id], identidades), 'CI06 reautenticación conserva usuarios tras reinicio');
  comprobar(igual((await post(admin, '/api/proveedores', entrada, claveAlta)).json, p), 'CI06 replay original tras reinicio real');
  comprobar((await recuperar(admin, claveAlta)).json.resultado.id === p.id, 'CI06 recuperación tras reinicio');
  // Simula pérdida del resultado cliente: commit está confirmado pero se consulta solo por clave.
  const perdida = randomUUID();
  await post(solicitante, '/api/solicitudes', { asunto: `${marca} respuesta descartada` }, perdida);
  comprobar((await recuperar(solicitante, perdida)).json.estado === 'COMPLETADA', 'CI06 respuesta descartada tras commit recuperable');

  etapa = 'dependencia';
  postgresParado = true; await docker(['stop', 'postgres']);
  const caida = await recuperar(admin, claveAlta);
  comprobar(caida.estado === 503 && caida.json.error === 'DEPENDENCIA_NO_DISPONIBLE', 'CI09 PG caído503 con filtro real');
  comprobar(!/sql|stack|huella|jdbc/i.test(JSON.stringify(caida.json)), 'CI09 error no expone detalles internos');
  await docker(['start', 'postgres']); postgresParado = false; await salud();
  comprobar((await recuperar(admin, claveAlta)).estado === 200, 'CI06 dependencia recuperada conserva éxito');
} catch (fallo) { error = `${etapa}: ${fallo.message}`; }
finally {
  if (postgresParado) { await docker(['start', 'postgres']); await salud(); }
  if (rolRetirado) await sql(`INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES('${uuid(rolRetirado)}','ADMINISTRADOR') ON CONFLICT DO NOTHING`);
  for (const sesion of sesiones) {
    try { await pedir('/api/autenticacion/cerrar-sesion', { sesion, metodo: 'POST' }); } catch { /* evidencia principal preservada */ }
  }
  const resultado = { fecha: new Date().toISOString(), resultado: error ? 'FAIL' : 'PASS', controles, mediciones,
    error: error || null, limite: 'Entorno local ficticio; mediciones observadas, no SLA productivo. Respuesta perdida real también se verifica E2E.' };
  writeFileSync(resolve(evidencia, 'compose-concurrencia.json'), JSON.stringify(resultado, null, 2) + '\n');
  console.log(`${resultado.resultado}: ${controles.length} controles006. ${error || ''}`);
  process.exitCode = error ? 1 : 0;
}
