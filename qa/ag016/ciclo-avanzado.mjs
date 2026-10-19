import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { raiz, config, identidad, guardar } from './laboratorio.mjs';
import { ClienteDemo } from './cliente.mjs';
import { copiaRestore } from './copia-restore.mjs';

// Ensayo privado autorizado AG-016. El coordinador ejecuta este archivo; requiere
// laboratorio exclusivo, supervisor de provisión detenido y tres espacios LISTO.
// No reintenta mutaciones, no termina conexiones y no elimina recursos/evidencias.
const nombre = process.env.AG016_EJECUCION;
if (!nombre || !/^[a-z0-9-]+$/.test(nombre)) throw Error('AG016_EJECUCION obligatorio.');
if (existsSync(resolve(raiz, 'qa/evidencias/ag016', nombre))) {
  throw Error('La ejecución requiere un nombre de evidencia nuevo.');
}
const inicio = new Date().toISOString();
const controles = [], mediciones = [], traza = [], pendientes = [];
const inventario = ['ag016_demo_01', 'ag016_demo_02', 'ag016_demo_03'];
const qa = process.env.AG016_BASE_QA;
if (!['ag016_restore_qa_funcional','ag016_restore_qa_funcional_02'].includes(qa)) throw Error('Destino QA funcional nuevo explícito obligatorio.');
const identidades = new Map();
const procesosPendientes = [];
let etapa = 'precondiciones', error, backendDetenido = false;
class ErrorQA extends Error {}
const fecha = () => new Date().toISOString();
const anotar = (evento, datos = {}) => traza.push({ fecha: fecha(), evento, ...datos });
const pausa = ms => new Promise(r => setTimeout(r, ms));
const nuevo = () => new ClienteDemo(config.base, m => mediciones.push(m));
function comprobar(condicion, criterio, observado) {
  controles.push({ fecha: fecha(), criterio, resultado: condicion ? 'PASS' : 'FAIL', observado });
  if (!condicion) throw new ErrorQA('Incumplido: ' + criterio);
}
function respuesta(r, estado, criterio) {
  comprobar(r.estado === estado, criterio, { esperado: estado, estado: r.estado, ms: r.ms });
  return r.json;
}
function uuid(valor) {
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(valor ?? '')) {
    throw new ErrorQA('Identificador UUID fuera del contrato.');
  }
  return valor;
}
function baseDemo(valor) {
  if (!inventario.includes(valor)) throw new ErrorQA('Espacio fuera del inventario cerrado.');
  return valor;
}
function contexto(cliente) {
  const c = cliente.contexto;
  return { espacio: baseDemo(c?.espacio), generacion: uuid(c?.generacion), reservaId: uuid(c?.reservaId) };
}

// execFile asíncrono mantiene activas las lecturas HTTP mientras PostgreSQL
// mantiene el bloqueo. Nunca se guardan argumentos, salida SQL ni stderr crudo.
function dockerAsync(args, { entrada, timeout = 120000, falloEsperado = false } = {}) {
  return new Promise((res, rej) => {
    const hijo = execFile('docker', args, {
      cwd: raiz, encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 4 * 1024 * 1024,
    }, (fallo, stdout) => {
      const codigo = fallo ? (Number.isInteger(fallo.code) ? fallo.code : null) : 0;
      if (fallo && (!falloEsperado || codigo === null)) {
        rej(new ErrorQA('Subproceso Docker falló; código ' + (codigo ?? 'transporte/timeout') + '.'));
      } else res({ codigo, stdout: stdout ?? '' });
    });
    // Un cierre de Docker/psql puede cerrar stdin antes de recibir todo el SQL.
    // El callback conserva el fallo real del proceso sin una excepción EPIPE sin gestionar.
    hijo.stdin.on('error', () => {});
    hijo.stdin.end(entrada);
  });
}
async function validarServicio(servicio, debeEjecutarse = true) {
  const esperada = identidades.get(servicio);
  if (!esperada) throw new ErrorQA('Servicio no inventariado para el ensayo.');
  const formato = '{"id":{{json .Id}},"proyecto":{{json (index .Config.Labels "com.docker.compose.project")}},"servicio":{{json (index .Config.Labels "com.docker.compose.service")}},"estado":{{json .State.Status}}}';
  const { stdout } = await dockerAsync(['inspect', '--format', formato, esperada.id]);
  const real = JSON.parse(stdout);
  if (real.id !== esperada.id || real.proyecto !== config.proyecto || real.servicio !== servicio
      || (debeEjecutarse && real.estado !== 'running')) {
    throw new ErrorQA('Identidad/estado Docker no coincide con el laboratorio.');
  }
  return real;
}
async function ejecutarAsync(servicio, args, opciones = {}, entorno = []) {
  const real = await validarServicio(servicio);
  return dockerAsync(['exec', '-i', ...entorno.flatMap(v => ['-e', v]), real.id, ...args], opciones);
}
async function cicloAsync(accion) {
  if (!['stop', 'start'].includes(accion)) throw new ErrorQA('Acción Docker no autorizada.');
  const real = await validarServicio('backend', false), t = performance.now();
  await dockerAsync([accion, real.id]);
  anotar('backend-' + accion, { id: real.id, ms: performance.now() - t });
}
async function sqlAsync(base, consulta, { aplicacion = 'ag016_qa_ciclo', larga = false } = {}) {
  if (![...inventario, 'ag016_control', qa].includes(base)) throw new ErrorQA('Base SQL no inventariada.');
  if (!/^[a-z0-9_]{1,63}$/.test(aplicacion)) throw new ErrorQA('Aplicación SQL no autorizada.');
  const entorno = ['PGAPPNAME=' + aplicacion];
  // Solo las dos conexiones QA de espera necesitan desactivar statement_timeout.
  if (larga) entorno.push('PGOPTIONS=-c statement_timeout=0');
  const { stdout } = await ejecutarAsync('postgres', [
    'psql', '--no-psqlrc', '-U', 'ag016_provision', '-d', base,
    '-v', 'ON_ERROR_STOP=1', '-q', '-tA',
  ], { entrada: consulta, timeout: larga ? 45000 : 15000 }, entorno);
  return stdout.trim();
}
async function estado(c) {
  const dato = JSON.parse(await sqlAsync('ag016_control', `
    SELECT json_build_object('estado',estado,'generacion',generacion,
      'sinReserva',reserva_id IS NULL AND cookie_hash IS NULL AND expira_en IS NULL,
      'fechaBD',clock_timestamp()) FROM demo.espacios WHERE id='${baseDemo(c.espacio)}';`));
  anotar('estado', { espacio: c.espacio, ...dato });
  return dato;
}
async function esperar(criterio, leer, acepta, limite = 15000, intervalo = 100) {
  const t = performance.now();
  let valor, muestras = 0;
  do {
    valor = await leer(); muestras++;
    if (acepta(valor)) {
      comprobar(true, criterio, { ms: performance.now() - t, muestras });
      return valor;
    }
    await pausa(intervalo);
  } while (performance.now() - t < limite);
  comprobar(false, criterio, { ms: performance.now() - t, muestras });
}
function seguir(promesa, etiqueta) {
  const trabajo = { terminado: false, resultado: null, fallo: null };
  trabajo.promesa = promesa.then(resultado => {
    trabajo.resultado = resultado;
  }, fallo => {
    trabajo.fallo = fallo;
  }).finally(() => {
    trabajo.terminado = true;
    anotar(etiqueta + '-fin', { fallo: Boolean(trabajo.fallo) });
  });
  procesosPendientes.push(trabajo);
  return trabajo;
}
async function terminar(trabajo) {
  await trabajo.promesa;
  if (trabajo.fallo) throw trabajo.fallo;
  return trabajo.resultado;
}
async function conexiones(c) {
  return JSON.parse(await sqlAsync('ag016_control', `SELECT json_build_object(
    'total',count(*),'runtime',count(*) FILTER (WHERE usename LIKE 'ag016_app_%'))
    FROM pg_stat_activity WHERE datname='${baseDemo(c.espacio)}';`));
}
async function fixture(c, asignacion, condicion, tipo) {
  // Constantes de este ensayo + UUID/espacio validados. Un único CAS y evento
  // atómicos; nunca se modifica otra reserva ni se borra el historial operativo.
  const dato = JSON.parse(await sqlAsync('ag016_control', `WITH cambiada AS (
    UPDATE demo.espacios SET ${asignacion}
    WHERE id='${baseDemo(c.espacio)}' AND generacion='${uuid(c.generacion)}' ${condicion}
    RETURNING id,generacion,estado,expira_en
  ), evento AS (
    INSERT INTO demo.eventos(id,espacio,generacion,tipo,instante)
    SELECT '${randomUUID()}',id,generacion,'${tipo}',clock_timestamp() FROM cambiada RETURNING id
  ) SELECT json_build_object('filas',(SELECT count(*) FROM cambiada),
    'eventos',(SELECT count(*) FROM evento),'fechaBD',clock_timestamp(),
    'expiraEn',(SELECT expira_en FROM cambiada));`));
  comprobar(dato.filas === 1 && dato.eventos === 1, tipo + ': CAS y evento únicos', dato);
  anotar(tipo, { espacio: c.espacio, ...dato });
}
async function huellaNegocio(c) {
  // Reduce datos ficticios a agregados: no extrae usuarios, hashes ni sesiones.
  return sqlAsync(baseDemo(c.espacio), `SELECT tabla||'|'||cantidad||'|'||huella FROM (
    SELECT 'solicitudes' AS tabla,count(*) AS cantidad,
      md5(coalesce(string_agg(row_to_json(t)::text,E'\\n' ORDER BY row_to_json(t)::text),'')) AS huella FROM gestion.solicitudes t
    UNION ALL SELECT 'historial',count(*),
      md5(coalesce(string_agg(row_to_json(t)::text,E'\\n' ORDER BY row_to_json(t)::text),'')) FROM gestion.eventos_historial t
    UNION ALL SELECT 'idempotencia',count(*),
      md5(coalesce(string_agg(row_to_json(t)::text,E'\\n' ORDER BY row_to_json(t)::text),'')) FROM gestion.operaciones_idempotentes_solicitud t
  ) agregados ORDER BY tabla;`);
}
async function provisionar(falloEsperado) {
  const t = performance.now();
  const resultado = await ejecutarAsync('provisionador', [
    'java', '-Xmx96m', '-jar', '/aplicacion/aplicacion.jar', '--demo-provisionar',
  ], { falloEsperado });
  anotar('provision-lote', { codigo: resultado.codigo, ms: performance.now() - t, falloEsperado });
  return resultado.codigo;
}

try {
  for (const servicio of ['postgres', 'backend', 'provisionador']) {
    const real = identidad(servicio);
    comprobar(real.estado === 'running', servicio + ' en ejecución');
    identidades.set(servicio, real);
    anotar('identidad-validada', real);
  }
  const libres = JSON.parse(await sqlAsync('ag016_control', `SELECT coalesce(json_agg(
    json_build_object('id',id,'estado',estado,'sinReserva',reserva_id IS NULL
      AND cookie_hash IS NULL AND expira_en IS NULL) ORDER BY id),'[]') FROM demo.espacios;`));
  comprobar(libres.length === 3 && libres.every((e, i) => e.id === inventario[i]
    && e.estado === 'LISTO' && e.sinReserva), 'Precondición: tres LISTO exclusivos sin reserva');
  comprobar(await sqlAsync('ag016_control', `SELECT count(*) FROM pg_database WHERE datname='${qa}';`) === '0',
    'Destino restore funcional nuevo');
  const a = nuevo(), b = nuevo(), c = nuevo();
  for (const [indice, visitante] of [a, b, c].entries()) {
    respuesta(await visitante.reservar(), 201, 'Reserva ' + indice);
    contexto(visitante);
    respuesta(await visitante.login('SOLICITANTE'), 200, 'Login real SOLICITANTE ' + indice);
  }
  const ca = contexto(a), cb = contexto(b), cc = contexto(c);
  comprobar(new Set([ca.espacio, cb.espacio, cc.espacio]).size === 3, 'A/B/C usan bases distintas');
  const fuente = respuesta(await a.crear('AG016 fuente activa ' + randomUUID()), 201, 'Crear fuente A');
  uuid(fuente.id);

  etapa = 'restore-fuente-activa';
  // No hay carga concurrente en A durante dump/cotejo; su reserva y JWT siguen vivos.
  const restauracion = copiaRestore(ca.espacio, nombre, qa);
  comprobar(restauracion.estado === 'PASS' && restauracion.sesionesVivasQA === '0|0',
    'Restore conserva negocio e invalida sesiones/refresh copiados');
  respuesta(await a.pedir('/api/solicitudes/' + fuente.id), 200, 'JWT fuente A sigue válido tras restore');
  respuesta(await a.pedir('/api/solicitudes/' + fuente.id, {
    selector: qa + ':' + ca.generacion + ':' + ca.reservaId,
  }), 401, 'JWT copiado no habilita selector de base QA');
  respuesta(await a.pedir('/api/solicitudes/' + fuente.id, {
    selector: qa + ':' + ca.generacion + ':' + ca.reservaId, cookies: false,
  }), 401, 'JWT copiado sin cookie tampoco habilita QA');

  etapa = 'caducidad-operacion-en-vuelo';
  const aplicacionLock = 'ag016_qa_lock_' + randomUUID().replaceAll('-', '');
  anotar('bloqueo-inicio', { espacio: ca.espacio, segundos: 5 });
  const bloqueo = seguir(sqlAsync(ca.espacio, `BEGIN;
    LOCK TABLE gestion.solicitudes IN ACCESS EXCLUSIVE MODE;
    SELECT pg_sleep(5); COMMIT;`, { aplicacion: aplicacionLock, larga: true }), 'bloqueo');
  await esperar('Bloqueo de tabla concedido por PostgreSQL', () => sqlAsync(ca.espacio, `
    SELECT count(*) FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid
    WHERE a.application_name='${aplicacionLock}' AND l.relation='gestion.solicitudes'::regclass
      AND l.mode='AccessExclusiveLock' AND l.granted;`), n => n === '1', 4000, 50);
  const enVuelo = seguir(a.crear('AG016 admitida antes de caducar ' + randomUUID()), 'http-en-vuelo');
  await esperar('Operación HTTP admitida espera el bloqueo SQL', () => sqlAsync(ca.espacio, `
    SELECT count(*) FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid
    WHERE a.datname=current_database() AND a.usename='ag016_app_${ca.espacio.slice(-2)}'
      AND a.wait_event_type='Lock' AND l.relation='gestion.solicitudes'::regclass AND NOT l.granted;`),
  n => Number(n) > 0, 3000, 50);
  comprobar(!enVuelo.terminado && !bloqueo.terminado, 'Petición y bloqueo siguen en vuelo antes de caducar');
  await fixture(ca, "expira_en=clock_timestamp()+interval '1 second'",
    `AND estado='RESERVADO' AND reserva_id='${ca.reservaId}' AND expira_en>clock_timestamp()`, 'QA_CADUCIDAD_ENVUELO');
  await esperar('A entra en DRENANDO con la operación admitida en curso', () => estado(ca),
    e => e.estado === 'DRENANDO', 4000, 50);
  comprobar(!enVuelo.terminado, 'DRENANDO no espera a que la operación termine');
  respuesta(await a.pedir('/api/solicitudes/' + fuente.id), 401, 'Nueva admisión caducada rechazada durante drenaje');
  const durante = await estado(ca);
  comprobar(durante.estado === 'DRENANDO' && !enVuelo.terminado,
    'No RECICLABLE mientras continúa la operación en vuelo', { estado: durante.estado });
  await terminar(bloqueo);
  const creadaEnVuelo = respuesta(await terminar(enVuelo), 201, 'Operación admitida termina en la base original');
  uuid(creadaEnVuelo.id);
  comprobar(await sqlAsync(ca.espacio, `SELECT count(*) FROM gestion.solicitudes
    WHERE id IN ('${fuente.id}','${creadaEnVuelo.id}');`) === '2', 'Ambas solicitudes permanecen en la base original');
  const drenada = await esperar('A pasa a RECICLABLE después de terminar', () => estado(ca),
    e => e.estado === 'RECICLABLE');
  comprobar(drenada.generacion === ca.generacion && drenada.sinReserva, 'Drenaje retira reserva sin cambiar generación');
  const actividad = await esperar('Pool A sin conexiones runtime tras el drenaje', () => conexiones(ca),
    n => n.runtime === 0);
  anotar('conexiones-tras-drenaje', { espacio: ca.espacio, ...actividad });

  etapa = 'drenando-persistente-en-arranque';
  // Variante determinista: se detiene backend ANTES del CAS para impedir que el
  // scheduler consuma DRENANDO. No afirma preservar una operación viva al reiniciar.
  await cicloAsync('stop'); backendDetenido = true;
  await fixture(cb, "estado='DRENANDO'", `AND estado='RESERVADO' AND reserva_id='${cb.reservaId}'`,
    'QA_DRENANDO_ARRANQUE');
  comprobar((await estado(cb)).estado === 'DRENANDO', 'B persiste DRENANDO con backend detenido');
  anotar('alcance-reinicio', { modo: 'DRENANDO persistente al arrancar; sin operación en vuelo simulada' });
  const reinicio = performance.now();
  await cicloAsync('start'); backendDetenido = false;
  await esperar('Salud recuperada en 90 s desde start', async () => {
    try { return (await nuevo().pedir('/api/salud', { operacion: 'salud-arranque' })).estado; }
    catch { return 0; } // Solo sondeos GET; ninguna mutación se reintenta.
  }, n => n === 200, Math.max(1, 90000 - (performance.now() - reinicio)), 500);
  comprobar(performance.now() - reinicio <= 90000, 'Arranque completo no supera 90 s',
    { ms: performance.now() - reinicio });
  respuesta(await b.pedir('/api/solicitudes'), 401, 'JWT B anterior rechazado tras arrancar');
  await esperar('B se reconcilia a RECICLABLE al arrancar', () => estado(cb), e => e.estado === 'RECICLABLE');
  respuesta(await c.pedir('/api/solicitudes'), 200, 'Reserva y JWT C sobreviven al reinicio');

  etapa = 'fallo-reciclaje-conexion-externa';
  comprobar((await estado(ca)).estado === 'RECICLABLE', 'A reciclable antes de inducir conexión externa');
  comprobar((await conexiones(ca)).total === 0, 'A sin conexiones antes de inducir fallo');
  const huellaAntes = await huellaNegocio(ca);
  const aplicacionRetenida = 'ag016_qa_ret_' + randomUUID().replaceAll('-', '');
  anotar('conexion-externa-inicio', { espacio: ca.espacio, segundos: 30 });
  const retenida = seguir(sqlAsync(ca.espacio, 'SELECT pg_sleep(30);', {
    aplicacion: aplicacionRetenida, larga: true,
  }), 'conexion-externa');
  await esperar('Conexión QA externa presente antes de provisionar', () => sqlAsync('ag016_control', `
    SELECT count(*) FROM pg_stat_activity WHERE datname='${ca.espacio}'
      AND application_name='${aplicacionRetenida}' AND wait_event='PgSleep';`), n => n === '1');
  comprobar(await provisionar(true) !== 0, 'Provisionador rechaza base con conexión externa');
  const bloqueada = await estado(ca);
  comprobar(bloqueada.estado === 'BLOQUEADO' && bloqueada.sinReserva, 'Fallo de provisión deja A BLOQUEADO sin reserva');
  comprobar(!retenida.terminado, 'Provisionador no termina la conexión externa QA');
  comprobar(await huellaNegocio(ca) === huellaAntes, 'Fallo conserva solicitudes/historial/idempotencia de A');
  const eventosFallo = Number(await sqlAsync('ag016_control', `SELECT count(*) FROM demo.eventos
    WHERE espacio='${ca.espacio}' AND generacion='${uuid(bloqueada.generacion)}' AND tipo='FALLO_PROVISION';`));
  comprobar(eventosFallo === 1, 'Fallo queda registrado exactamente una vez');
  respuesta(await c.pedir('/api/solicitudes'), 200, 'Fallo de reciclaje A no afecta reserva C');
  await terminar(retenida);
  await esperar('Conexión QA finaliza por sí sola y A queda vacía de conexiones', () => conexiones(ca), n => n.total === 0);

  etapa = 'reparacion-privada-identificada';
  // Acción privada explícita del operador autorizada por AG-016, única para A.
  // Conserva generación de la reclamación fallida y exige fallo identificado,
  // ausencia de reserva/conexiones. La siguiente recreación la hace solo la CLI.
  anotar('reparacion-operador', { espacio: ca.espacio, causa: 'Conexión QA temporal ya finalizada' });
  await fixture({ ...ca, generacion: bloqueada.generacion }, "estado='RECICLABLE'", `
    AND estado='BLOQUEADO' AND reserva_id IS NULL AND cookie_hash IS NULL AND expira_en IS NULL
    AND NOT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname='${ca.espacio}')
    AND EXISTS (SELECT 1 FROM demo.eventos WHERE espacio='${ca.espacio}'
      AND generacion='${bloqueada.generacion}' AND tipo='FALLO_PROVISION')`, 'QA_REPARACION_CONEXION');
  comprobar(await provisionar(false) === 0, 'Provisión tras reparación privada termina correctamente');
  const preparada = await estado(ca);
  comprobar(preparada.estado === 'LISTO' && preparada.sinReserva
    && preparada.generacion !== ca.generacion && preparada.generacion !== bloqueada.generacion,
  'CLI prepara generación nueva de A sin reserva');
  comprobar(await sqlAsync(ca.espacio, 'SELECT count(*) FROM gestion.solicitudes;') === '0',
    'Nueva generación A no contiene solicitudes antiguas');
  comprobar(Number(await sqlAsync('ag016_control', `SELECT count(*) FROM demo.eventos
    WHERE espacio='${ca.espacio}' AND generacion='${bloqueada.generacion}'
      AND tipo IN ('FALLO_PROVISION','QA_REPARACION_CONEXION');`)) === 2,
  'Reciclaje conserva eventos de fallo y reparación');
  respuesta(await a.pedir('/api/solicitudes'), 401, 'Credenciales A antiguas siguen denegadas tras reparación');
  respuesta(await c.pedir('/api/solicitudes'), 200, 'C sigue accesible tras restauración y reciclajes');

  etapa = 'cierre';
  respuesta(await c.liberar(), 204, 'Liberación final C');
  await esperar('C termina RECICLABLE', () => estado(cc), e => e.estado === 'RECICLABLE');
  pendientes.push('Cupo de almacenamiento: ensayo separado a cargo del coordinador.');
} catch (fallo) {
  // Las herramientas pueden incluir comandos/salidas en Error.message. Solo los
  // mensajes controlados del arnés se publican; nunca tokens/cookies/SQL crudo.
  error = { etapa, mensaje: fallo instanceof ErrorQA ? fallo.message : 'Fallo de herramienta o transporte; salida omitida.' };
  anotar('fallo', error);
} finally {
  // Esperas acotadas de procesos ya lanzados. No rollback SQL, no terminación PG,
  // no segundo intento de provisión ni reintento de HTTP con resultado incierto.
  await Promise.all(procesosPendientes.map(p => p.promesa));
  if (backendDetenido) pendientes.push('Backend quedó detenido tras un fallo; el coordinador debe diagnosticar y arrancarlo.');
  guardar(nombre + '/ciclo-avanzado.json', {
    inicio, fin: fecha(), estado: error ? 'FAIL' : 'PASS', proyecto: config.proyecto,
    origen: config.base, controles, mediciones, traza, error, pendientes,
    alcance: 'Restore activo; caducidad real en vuelo; DRENANDO persistente al arrancar; fallo por conexión externa y reparación privada.',
    limites: 'Storage separado. No se simula supervivencia de una transacción HTTP a una parada. No se reintentan mutaciones.',
  });
}
console.log(JSON.stringify({ estado: error ? 'FAIL' : 'PASS', controles: controles.length, error, pendientes }));
if (error) process.exitCode = 1;
