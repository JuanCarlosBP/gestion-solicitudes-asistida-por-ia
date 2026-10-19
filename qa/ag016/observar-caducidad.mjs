import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Importación pura: laboratorio y Docker solo se alcanzan desde el CLI autorizado.
export const VERSION = 'AG016-observador-1';
const ESPACIOS = ['ag016_demo_01', 'ag016_demo_02', 'ag016_demo_03'];
const PROYECTO = 'gestion-solicitudes-ag016';
const MAXIMO_MS = 8000;
const objeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const exigir = (condicion, codigo) => { if (!condicion) throw Error(codigo); };

/** Validación de calendario sin perder la fracción original de hasta nueve decimales. */
function instanteNs(valor, decimales = '{1,9}') {
  if (typeof valor !== 'string') return null;
  const patron = new RegExp(`^(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2})\\.(\\d${decimales})Z$`);
  const partes = patron.exec(valor);
  if (!partes || partes[1].startsWith('0000')) return null;
  const ms = Date.parse(`${partes[1]}.000Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 19) !== partes[1]) return null;
  return BigInt(ms) * 1000000n + BigInt(partes[2].padEnd(9, '0'));
}

export function validarEntrada(entorno) {
  const espacio = entorno.AG016_CADUCIDAD_ESPACIO;
  const generacion = entorno.AG016_CADUCIDAD_GENERACION;
  const expiraEn = entorno.AG016_CADUCIDAD_EXPIRA;
  exigir(ESPACIOS.includes(espacio), 'ESPACIO_NO_INVENTARIADO');
  exigir(typeof generacion === 'string' && /^[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$/.test(generacion), 'GENERACION_INVALIDA');
  exigir(instanteNs(expiraEn) !== null, 'EXPIRACION_INVALIDA');
  exigir(entorno.AG016_CADUCIDAD_TTL_MINUTOS === '60', 'TTL_INVALIDO');
  return { espacio, generacion, expiraEn };
}

function entradaValidada(entrada) {
  return validarEntrada({ AG016_CADUCIDAD_ESPACIO: entrada?.espacio,
    AG016_CADUCIDAD_GENERACION: entrada?.generacion, AG016_CADUCIDAD_EXPIRA: entrada?.expiraEn,
    AG016_CADUCIDAD_TTL_MINUTOS: '60' });
}

/** Replica TimestampUtils de PG JDBC: resto de nanosegundos >=500 redondea hacia arriba. */
export function normalizarTimestampJdbc(valor) {
  exigir(instanteNs(valor) !== null, 'EXPIRACION_INVALIDA');
  const [segundo, fraccion] = valor.slice(0, -1).split('.');
  // Redondear la fracción positiva del segundo también sirve para instantes anteriores a 1970.
  const micros = (BigInt(fraccion.padEnd(9, '0')) + 500n) / 1000n;
  const baseMs = Date.parse(`${segundo}.000Z`);
  const normalizado = new Date(baseMs + Number(micros / 1000000n) * 1000).toISOString();
  exigir(/^\d{4}-/.test(normalizado), 'EXPIRACION_FUERA_DE_RANGO');
  return `${normalizado.slice(0, 19)}.${String(micros % 1000000n).padStart(6, '0')}Z`;
}

/** Solo identificadores/fechas ASCII validados; SQL recibe seis decimales como JDBC. */
export function consultaEventos(entrada) {
  const { espacio, generacion, expiraEn } = entradaValidada(entrada);
  const expiraSql = normalizarTimestampJdbc(expiraEn);
  return `BEGIN READ ONLY;
SET LOCAL statement_timeout='2000ms';
SET LOCAL lock_timeout='1000ms';
WITH eventos AS (
  SELECT count(*) FILTER (WHERE tipo='RESERVADA') AS reservas,
    count(*) FILTER (WHERE tipo='CADUCADA') AS caducidades,
    min(instante) FILTER (WHERE tipo='RESERVADA') AS reservada,
    min(instante) FILTER (WHERE tipo='CADUCADA') AS caducada
  FROM demo.eventos
  WHERE espacio='${espacio}' AND generacion='${generacion}'::uuid
    AND tipo IN ('RESERVADA','CADUCADA')
), parametro AS (SELECT '${expiraSql}'::timestamptz AS expira)
SELECT json_build_object(
  'reservas',reservas,'caducidades',caducidades,
  'reservadaEn',to_char(reservada AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'caducadaEn',to_char(caducada AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'ttlCoherente',CASE WHEN reservas=1 THEN reservada+interval '60 minutes'=expira ELSE NULL END,
  'posterior',CASE WHEN caducidades=1 THEN caducada>=expira ELSE NULL END,
  'retrasoServidorMs',CASE WHEN caducidades=1 THEN extract(epoch FROM (caducada-expira))*1000 ELSE NULL END
) FROM eventos CROSS JOIN parametro;
COMMIT;
`;
}

/** Valida la respuesta SQL; nunca convierte ausencia, duplicados o errores en ESPERANDO. */
export function clasificarEventos(datos) {
  const claves = ['reservas', 'caducidades', 'reservadaEn', 'caducadaEn', 'ttlCoherente', 'posterior', 'retrasoServidorMs'];
  exigir(objeto(datos) && Object.keys(datos).length === claves.length && claves.every(k => Object.hasOwn(datos, k)), 'RESPUESTA_SQL_INVALIDA');
  exigir(datos.reservas === 1 && [0, 1].includes(datos.caducidades), 'EVENTOS_AUSENTES_O_DUPLICADOS');
  const reservada = instanteNs(datos.reservadaEn, '{6}');
  exigir(reservada !== null && datos.ttlCoherente === true, 'TTL_O_FECHA_INCOHERENTE');
  if (datos.caducidades === 0) {
    exigir(datos.caducadaEn === null && datos.posterior === null && datos.retrasoServidorMs === null, 'ESPERA_INCOHERENTE');
    return { resultado: 'ESPERANDO', reservadaEn: datos.reservadaEn, caducadaEn: null,
      ttlCoherente: true, posterior: null, retrasoServidorMs: null };
  }
  const caducada = instanteNs(datos.caducadaEn, '{6}');
  const vencimiento = reservada + 60n * 60n * 1000000000n;
  exigir(caducada !== null && caducada >= vencimiento && datos.posterior === true
    && typeof datos.retrasoServidorMs === 'number' && Number.isFinite(datos.retrasoServidorMs)
    && datos.retrasoServidorMs >= 0
    && datos.retrasoServidorMs === Number(caducada - vencimiento) / 1000000, 'CADUCIDAD_INCOHERENTE');
  return { resultado: 'CADUCADA', reservadaEn: datos.reservadaEn, caducadaEn: datos.caducadaEn,
    ttlCoherente: true, posterior: true, retrasoServidorMs: datos.retrasoServidorMs };
}

function salidaInicial(entrada) {
  return { version: VERSION, resultado: 'FAIL', espacio: entrada?.espacio ?? null,
    generacion: entrada?.generacion ?? null, expiraEn: entrada?.expiraEn ?? null,
    reservadaEn: null, caducadaEn: null, ttlCoherente: null, posterior: null,
    retrasoServidorMs: null, observadoUTC: new Date().toISOString(), duracionMs: 0,
    identidad: { postgres: null, backend: null } };
}

/** Dependencia inyectable para pruebas offline; todos los comandos tienen captura y plazo. */
export function observarConContexto(entrada, laboratorio) {
  const inicio = performance.now();
  let salida = salidaInicial();
  try {
    const validada = entradaValidada(entrada);
    salida = salidaInicial(validada);
    exigir(laboratorio.config?.proyecto === PROYECTO && Array.isArray(laboratorio.composeArgs)
      && typeof laboratorio.docker === 'function', 'CONTEXTO_NO_AUTORIZADO');
    const capturar = (argumentos, input) => {
      const resto = Math.floor(MAXIMO_MS - (performance.now() - inicio));
      exigir(resto > 0, 'PLAZO_OBSERVACION_AGOTADO');
      return laboratorio.docker(argumentos, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
        timeout: Math.min(resto, 2000), maxBuffer: 16 * 1024 }).trim();
    };
    const identificar = servicio => {
      exigir(['postgres', 'backend'].includes(servicio), 'SERVICIO_NO_AUTORIZADO');
      const ids = capturar([...laboratorio.composeArgs, 'ps', '-a', '-q', servicio]).split(/\s+/).filter(Boolean);
      exigir(ids.length === 1 && /^[a-f0-9]{64}$/.test(ids[0]), 'IDENTIDAD_NO_UNICA');
      const formato = '{"id":{{json .Id}},"proyecto":{{json (index .Config.Labels "com.docker.compose.project")}},"servicio":{{json (index .Config.Labels "com.docker.compose.service")}},"estado":{{json .State.Status}},"iniciadoEn":{{json .State.StartedAt}}}';
      const dato = JSON.parse(capturar(['inspect', '--format', formato, ids[0]]));
      exigir(dato.id === ids[0] && dato.proyecto === PROYECTO && dato.servicio === servicio
        && dato.estado === 'running' && instanteNs(dato.iniciadoEn) !== null, 'IDENTIDAD_O_ESTADO_INVALIDOS');
      return dato;
    };
    const backend = identificar('backend'), postgres = identificar('postgres');
    salida.identidad = { postgres: postgres.id, backend: backend.id };
    const datos = JSON.parse(capturar(['exec', '-i', postgres.id, 'psql', '--no-psqlrc', '-qAt',
      '-U', 'ag016_provision', '-d', 'ag016_control', '-v', 'ON_ERROR_STOP=1'], consultaEventos(validada)));
    const clasificacion = clasificarEventos(datos);
    // Una sustitución/reinicio durante la lectura invalida la observación completa.
    const postgresFinal = identificar('postgres'), backendFinal = identificar('backend');
    exigir(postgresFinal.id === postgres.id && postgresFinal.iniciadoEn === postgres.iniciadoEn
      && backendFinal.id === backend.id && backendFinal.iniciadoEn === backend.iniciadoEn, 'IDENTIDAD_CAMBIO_DURANTE_OBSERVACION');
    Object.assign(salida, clasificacion);
  } catch {
    // No adjuntar mensaje/cause/stdout/stderr: el único resultado público es el contrato cerrado.
    salida.resultado = 'FAIL';
  }
  salida.observadoUTC = new Date().toISOString();
  salida.duracionMs = performance.now() - inicio;
  return salida;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const inicio = performance.now();
  let salida = salidaInicial();
  try {
    const entrada = validarEntrada(process.env);
    salida = salidaInicial(entrada);
    const laboratorio = await import('./laboratorio.mjs');
    salida = observarConContexto(entrada, laboratorio);
  } catch { /* No serializar errores de configuración ni entradas rechazadas. */ }
  salida.observadoUTC = new Date().toISOString();
  salida.duracionMs = performance.now() - inicio;
  process.stdout.write(`${JSON.stringify(salida)}\n`);
  process.exitCode = salida.resultado === 'FAIL' ? 1 : 0;
}
