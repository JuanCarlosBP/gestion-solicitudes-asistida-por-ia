import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Offline: no importar laboratorio/metricas, que requieren contexto y acceso Docker.
export const VERSION = 'AG016-evaluador-3';
const MiB = 1024 ** 2;
const MINUTO = 60000;
const SERVICIOS = ['backend', 'postgres', 'frontend', 'provisionador'];
const FUENTES_VERSION = ['qa/evidencias/ag016/contrato-carga-reloj.json', 'qa/ag016/carga.mjs', 'qa/ag016/caducidad-carga.mjs', 'qa/ag016/observar-caducidad.mjs', 'qa/ag016/evaluar.mjs', 'qa/ag016/recorrido.mjs',
  'qa/ag016/cliente.mjs', 'qa/ag016/metricas.mjs', 'qa/ag016/muestrear.mjs', 'qa/ag016/perfil.mjs', 'qa/ag016/parametros-publicos.mjs',
  'qa/ag016/plazo-arranque.mjs', 'qa/ag016/laboratorio.mjs', 'qa/ag016/copia-restore.mjs', 'qa/ag016/operar.mjs',
  'infraestructura/demo/compose.yaml', 'infraestructura/demo/nginx-local.conf', 'infraestructura/demo/inicializar.sh',
  'infraestructura/demo/pg_hba.conf', 'backend/target/gestion-solicitudes-0.0.1.jar'];
const FASES = [
  { nombre: 'calentamiento', desde: 0, hasta: 10 * MINUTO },
  { nombre: 'nominal', desde: 10 * MINUTO, hasta: 40 * MINUTO },
  { nombre: 'pico', desde: 40 * MINUTO, hasta: 45 * MINUTO },
  { nombre: 'operaciones', desde: 45 * MINUTO, hasta: 65 * MINUTO },
];
export const UMBRALES = Object.freeze({ duracionMs: 65 * MINUTO, recorridosNominales: 180,
  lecturaMs: 500, escrituraMs: 1000, loginMs: 2000, reservaMs: 3000,
  ramNominalMaxima: 0.75, arranqueMs: 90000, huecoMuestreoMaximoMs: 30000 });
const PERFILES = { A: { memoria: 2048 * MiB, cpu: 1, reserva: 256 * MiB },
  B: { memoria: 4096 * MiB, cpu: 2, reserva: 512 * MiB } };
const LECTURAS = new Set(['lista-solicitante', 'proveedores', 'supervisores', 'resumen-solicitante',
  'lista-supervisor', 'detalle-supervisor', 'historial', 'resumen-auditor', 'detalle-auditor']);
const ESCRITURAS = new Set(['crear', 'editar', 'presentar', 'presentar-replay', 'aprobar', 'rechazar', 'refresh', 'logout', 'liberar']);
const LOGINS = new Set(['login-SOLICITANTE', 'login-SUPERVISOR', 'login-AUDITOR']);
const OPERACIONES_NOMINALES = [...LECTURAS, ...ESCRITURAS].filter(x => x !== 'liberar').concat([...LOGINS], 'csrf');
const num = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const entero = x => num(x) && Number.isInteger(x);
const objeto = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const fecha = x => typeof x === 'string' && Number.isFinite(Date.parse(x));
const maximo = valores => valores.length ? Math.max(...valores) : null;
const suma = valores => valores.length && valores.every(num) ? valores.reduce((a, b) => a + b, 0) : null;
const fase = ms => FASES.find(f => ms >= f.desde && ms < f.hasta)?.nombre ?? 'fuera-ventana';
const inducida = op => /^(inducido-|reciclaje-)/.test(op);
const PARAMETROS_NUMERICOS = ['cupo', 'duracion.minutos', 'pool.maximo', 'peticiones.minuto',
  'autenticacion.minuto', 'reservas.minuto', 'almacenamiento.bytes', 'metricas.segundos'];

// Solo la proyección pública ya capturada. Nunca leer ni reproducir propiedades privadas.
function parametrosCanonicos(valor) {
  const cerradas = (v, claves) => objeto(v) && Object.keys(v).length === claves.length && claves.every(k => Object.hasOwn(v, k));
  const roles = ['runtime', 'provisionador'];
  if (!cerradas(valor, roles)) return null;
  const salida = {};
  for (const rol of roles) {
    const v = valor[rol];
    if (!cerradas(v, ['entorno', 'espacios', ...PARAMETROS_NUMERICOS]) || v.entorno !== 'local'
      || !Array.isArray(v.espacios) || v.espacios.length !== 3 || new Set(v.espacios).size !== 3
      || !v.espacios.every(e => typeof e === 'string' && /^ag016_demo_0[1-3]$/.test(e))
      || !PARAMETROS_NUMERICOS.every(k => Number.isSafeInteger(v[k]) && v[k] > 0)) return null;
    salida[rol] = { entorno: v.entorno, espacios: [...v.espacios].sort(),
      ...Object.fromEntries(PARAMETROS_NUMERICOS.map(k => [k, v[k]])) };
  }
  return salida;
}

/** Rango más próximo sobre muestras crudas; vacío/ausente nunca equivale a cero. */
export function percentilesCrudos(valores) {
  const validos = valores.filter(num).sort((a, b) => a - b);
  const p = q => validos.length ? validos[Math.ceil(validos.length * q) - 1] : null;
  return { muestras: valores.length, validas: validos.length, invalidas: valores.length - validos.length,
    p50: p(.5), p95: p(.95), p99: p(.99), maximo: validos.at(-1) ?? null };
}

function limiteOperacion(op) {
  if (LECTURAS.has(op)) return UMBRALES.lecturaMs;
  if (ESCRITURAS.has(op)) return UMBRALES.escrituraMs;
  if (LOGINS.has(op)) return UMBRALES.loginMs;
  return op === 'reserva' ? UMBRALES.reservaMs : null;
}
function estadoEsperado(op, estado) {
  if (!entero(estado)) return null;
  if (op === 'inducido-caducidad') return estado === 401;
  if (op === 'inducido-sobrecupo-reserva') return estado === 409;
  if (op === 'inducido-reinicio-salud') return [0, 200, 502, 503, 504].includes(estado);
  if (['csrf', 'logout', 'liberar', 'inducido-sobrecupo-csrf'].includes(op)) return estado === 204;
  if (['crear', 'reserva'].includes(op)) return estado === 201;
  if (LECTURAS.has(op) || ESCRITURAS.has(op) || LOGINS.has(op)
    || ['reciclaje-disponibilidad', 'preflight-presentacion', 'semilla-validar-vacio', 'semilla-validar-resumen'].includes(op)) return estado === 200;
  return null;
}
function ioContadores(lineas) {
  if (!Array.isArray(lineas)) return null;
  const salida = {};
  for (const linea of lineas) {
    if (typeof linea !== 'string') return null;
    const [dispositivo, ...pares] = linea.trim().split(/\s+/);
    if (!/^\d+:\d+$/.test(dispositivo)) return null;
    for (const par of pares) {
      const [clave, valor] = par.split('=');
      if (!['rbytes', 'wbytes', 'rios', 'wios', 'dbytes', 'dios'].includes(clave) || !/^\d+$/.test(valor ?? '')) return null;
      salida[`${dispositivo}.${clave}`] = Number(valor);
    }
  }
  return salida;
}
function filasNumericas(texto, columnas) {
  if (typeof texto !== 'string' || !texto.trim()) return null;
  const filas = texto.trim().split(/\r?\n/).map(l => l.split('|'));
  return filas.every(f => f.length === columnas && /^\d+$/.test(f.at(-1))) ? filas : null;
}

// La comparación de eventos conserva la precisión PostgreSQL; Date.parse solo no basta.
function microsUTC(valor) {
  const partes = typeof valor === 'string' && /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/.exec(valor);
  if (!partes || !fecha(`${partes[1]}Z`)) return null;
  const segundos = Date.parse(`${partes[1]}Z`);
  if (new Date(segundos).toISOString().slice(0, 19) !== partes[1]) return null;
  return BigInt(segundos) * 1000n + (BigInt((partes[2] ?? '').padEnd(9, '0')) + 500n) / 1000n;
}

function comprobarEvidenciaCaducidad(datos, criterio) {
  const eventos = Array.isArray(datos.eventos) ? datos.eventos : [];
  const origen = datos.inicio?.origenMonoMs;
  const limites = Array.isArray(datos.cuotasInicio?.limites) ? datos.cuotasInicio.limites : [];
  const iguales = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= .001;
  const id = servicio => limites.find(l => l?.servicio === servicio)?.id;
  for (const visitante of ['B', 'C']) {
    const propias = eventos.filter(e => objeto(e) && e.visitante === visitante);
    const reserva = propias.find(e => e.tipo === 'RESERVA_OBSERVADA');
    const barreras = propias.filter(e => e.tipo === 'BARRERA_CADUCIDAD_CONFIRMADA');
    const observaciones = propias.filter(e => e.tipo === 'OBSERVACION_CADUCIDAD');
    const sondas = (Array.isArray(datos.peticiones) ? datos.peticiones : []).filter(p =>
      objeto(p) && p.visitante === visitante && p.operacion === 'inducido-caducidad');
    const b = barreras[0];
    const estructura = num(origen) && objeto(reserva) && barreras.length > 0 && observaciones.length > 0;
    let correcto = estructura && barreras.length === 1 && !propias.some(e => e.tipo === 'OBSERVACION_CADUCIDAD_FALLIDA')
      && /^ag016_demo_0[1-3]$/.test(reserva.espacio ?? '')
      && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(reserva.generacion ?? '')
      && num(reserva.recibidaMonoMs) && fecha(reserva.recibidaUTC) && num(reserva.rttMs) && reserva.ttlMinutos === 60
      && iguales(reserva.referenciaMonoMs, reserva.recibidaMonoMs + 60 * MINUTO)
      && iguales(b.referenciaRelativaMs, reserva.referenciaMonoMs - origen)
      && b.referenciaRelativaMs > 45 * MINUTO && b.referenciaRelativaMs < UMBRALES.duracionMs
      && iguales(b.limiteRelativoMs, Math.min(b.referenciaRelativaMs + 120000, UMBRALES.duracionMs))
      && num(b.finRelativoMs) && b.finRelativoMs >= b.referenciaRelativaMs && b.finRelativoMs < b.limiteRelativoMs
      && b.observaciones === observaciones.length && num(b.duracionMs)
      && eventos.indexOf(reserva) < eventos.indexOf(b);
    const expira = microsUTC(reserva?.expiraEn);
    let finAnterior = b?.referenciaRelativaMs;
    for (const [indice, e] of observaciones.entries()) {
      const o = e.observacion;
      const reservada = microsUTC(o?.reservadaEn), caducada = microsUTC(o?.caducadaEn);
      const comun = objeto(o) && o.version === 'AG016-observador-1'
        && o.espacio === reserva?.espacio && o.generacion === reserva?.generacion && o.expiraEn === reserva?.expiraEn
        && o.ttlCoherente === true && reservada !== null && expira !== null && expira - reservada === 3600000000n
        && fecha(o.observadoUTC) && num(o.duracionMs) && o.duracionMs <= 10000
        && o.identidad?.postgres === id('postgres') && o.identidad?.backend === id('backend')
        && /^[a-f0-9]{64}$/.test(o.identidad?.postgres ?? '') && /^[a-f0-9]{64}$/.test(o.identidad?.backend ?? '')
        && num(e.inicioRelativoMs) && num(e.finRelativoMs) && e.inicioRelativoMs >= finAnterior
        && e.finRelativoMs >= e.inicioRelativoMs && e.finRelativoMs < b?.limiteRelativoMs
        && eventos.indexOf(e) < eventos.indexOf(b);
      const ultima = indice === observaciones.length - 1;
      const estado = ultima ? o?.resultado === 'CADUCADA' && o.posterior === true && caducada !== null && expira !== null
          && caducada >= expira && num(o.retrasoServidorMs) && iguales(o.retrasoServidorMs, Number(caducada - expira) / 1000)
        : o?.resultado === 'ESPERANDO' && o.caducadaEn === null && o.posterior === null && o.retrasoServidorMs === null;
      correcto = correcto && comun && estado;
      finAnterior = e.finRelativoMs;
    }
    const ultima = observaciones.at(-1);
    correcto = correcto && iguales(b?.finRelativoMs, ultima?.finRelativoMs)
      && iguales(b?.duracionMs, ultima?.finRelativoMs - observaciones[0]?.inicioRelativoMs)
      && JSON.stringify(b?.ultimaObservacion) === JSON.stringify(ultima?.observacion)
      && sondas.length === 1 && sondas[0].status === 401 && sondas[0].fase === 'operaciones'
      && num(sondas[0].relativaMs) && sondas[0].relativaMs + .001 >= b.finRelativoMs
      && sondas[0].relativaMs < b.limiteRelativoMs;
    criterio(`CADUCIDAD_PERSISTIDA_${visitante}`, estructura, correcto,
      { reservasObservadas: propias.filter(e => e.tipo === 'RESERVA_OBSERVADA').length,
        barreras: barreras.length, observaciones: observaciones.length, sondas: sondas.length,
        referenciaRelativaMs: b?.referenciaRelativaMs, finRelativoMs: b?.finRelativoMs },
      'Reserva original TTL60min; CADUCADA coherente con IDs; barrera<=120s y dentro65min; una única GET401 posterior');
  }
}

/** Evalúa datos leídos; los fixtures offline se marcan sintéticos y nunca recomiendan. */
export function evaluarDatos(datos, { sintetico = false } = {}) {
  const problemas = [...(datos.problemasLectura ?? [])];
  const criterios = [];
  const anotar = (codigo, estado, detalle = {}) => problemas.push({ codigo, estado, ...detalle });
  const criterio = (codigo, completo, cumple, observado, esperado) => {
    const estado = !completo ? 'INCOMPLETO' : cumple ? 'PASS' : 'FAIL';
    criterios.push({ codigo, estado, observado: observado ?? null, esperado });
    if (estado !== 'PASS') anotar(codigo, estado);
  };
  const c = datos.carga ?? {}, inicio = datos.inicio ?? {}, fin = datos.fin ?? {}, contrato = datos.contrato ?? {};
  const perfil = datos.perfil ?? {}, qi = datos.cuotasInicio ?? {}, qf = datos.cuotasFin ?? {};
  const sello = datos.huellas;
  const parametrosInicio = parametrosCanonicos(sello?.parametros), parametrosFin = parametrosCanonicos(qf.parametros);
  criterio('PARAMETROS_PUBLICOS_ESTABLES', parametrosInicio !== null && parametrosFin !== null,
    JSON.stringify(parametrosInicio) === JSON.stringify(parametrosFin)
      && JSON.stringify(parametrosInicio?.runtime) === JSON.stringify(parametrosInicio?.provisionador),
    { inicio: parametrosInicio, fin: parametrosFin }, 'Proyección cerrada válida; runtime = provisionador; inicio = fin');
  const archivosVersion = Array.isArray(sello?.archivos) ? sello.archivos : [];
  const selloValido = archivosVersion.length > 0 && archivosVersion.every(a => objeto(a)
    && typeof a.ruta === 'string' && /^[a-f0-9]{64}$/.test(a.sha256 ?? ''))
    && new Set(archivosVersion.map(a => a.ruta.replaceAll('\\', '/'))).size === archivosVersion.length
    && FUENTES_VERSION.every(ruta => archivosVersion.some(a => a.ruta.replaceAll('\\', '/') === ruta))
    && archivosVersion.some(a => /^frontend\/dist\/gestion-solicitudes-frontend\/browser\/.+\.js$/.test(a.ruta.replaceAll('\\', '/')));
  const contratoSellado = selloValido ? archivosVersion.find(a => a.ruta.replaceAll('\\', '/') === 'qa/evidencias/ag016/contrato-carga-reloj.json')?.sha256 : null;
  const presupuesto = PERFILES[c.perfil];
  const desde = fecha(inicio.inicio) ? Date.parse(inicio.inicio) : null;
  criterio('VERSION_SELLADA', selloValido && !!contratoSellado && fecha(sello?.fecha) && desde !== null,
    contratoSellado === datos.contratoSha256 && sello?.perfil === c.perfil && Date.parse(sello?.fecha) <= desde,
    { fecha: sello?.fecha, archivos: archivosVersion.length, contratoSha256: contratoSellado }, 'Huellas previas; contrato íntegro y perfil coherente');
  criterio('CONTRATO_FIJO', !!contrato.ejecucionOficial && Array.isArray(contrato.fases),
    contrato.version === 'AG016-carga-reloj-1' && contrato.semilla === 160082026 && contrato.ejecucionOficial?.duracionMedicionMs === UMBRALES.duracionMs
    && contrato.visitantes?.cantidad === 3 && contrato.fases?.every((f, i) =>
      FASES[i] && f.nombre === FASES[i].nombre && f.inicioMinuto * MINUTO === FASES[i].desde && f.finMinuto * MINUTO === FASES[i].hasta)
    && contrato.fases?.length === 4, contrato.version, 'Semilla160082026; 3 visitantes; fases10/30/5/20min');
  criterio('PASADA_OFICIAL', typeof c.modo === 'string' && typeof c.ejecucion === 'string',
    c.modo === 'MEDICION_65_MINUTOS' && /(?:^|-)[ab][12]$/.test(c.ejecucion ?? '')
    && c.ejecucion?.slice(-2, -1).toUpperCase() === c.perfil,
    { modo: c.modo, ejecucion: c.ejecucion }, 'Pasada A1/A2/B1/B2; nunca prueba del arnés');
  criterio('VENTANA_COMPLETA', num(fin.duracionObservadaMs) && fecha(fin.fin) && desde !== null,
    c.ventanaCompleta === true && inicio.duracionMs === UMBRALES.duracionMs
    && fin.duracionPlanificadaMs === UMBRALES.duracionMs && fin.duracionObservadaMs >= UMBRALES.duracionMs
    && Date.parse(fin.fin) - desde >= UMBRALES.duracionMs && fin.inicio === inicio.inicio
    && c.inicioMedicion === inicio.inicio && c.semilla === 160082026 && inicio.semilla === 160082026,
    { planificadaMs: inicio.duracionMs, observadaMs: fin.duracionObservadaMs }, '65min completos, semilla fuera');
  criterio('PERFIL_COHERENTE', !!presupuesto && num(perfil.envolventeMiB) && num(perfil.envolventeCPU),
    c.perfil === perfil.perfil && c.perfil === inicio.perfil && c.perfil === qi.perfil
    && perfil.envolventeMiB * MiB === presupuesto?.memoria && Math.abs(perfil.envolventeCPU - presupuesto.cpu) < 1e-8,
    { carga: c.perfil, perfil: perfil.perfil, memoriaMiB: perfil.envolventeMiB, cpu: perfil.envolventeCPU }, 'A2GiB/1CPU o B4GiB/2CPU');
  criterio('ARRANQUE', num(perfil.arranqueConjuntoMs), perfil.arranqueConjuntoMs <= UMBRALES.arranqueMs,
    perfil.arranqueConjuntoMs, '<=90000ms; procesos detenidos, caché host no purgada');

  const semilla = datos.semilla;
  const esperados = { proveedores: 20, solicitudes: 100, conceptosPorSolicitud: 5, BORRADOR: 60, PRESENTADA: 20, APROBADA: 10, RECHAZADA: 10 };
  criterio('SEMILLA_COMPLETA', Array.isArray(semilla?.visitantes), Array.isArray(semilla?.visitantes) && semilla?.resultado === 'PASS'
    && semilla?.semilla === 160082026 && semilla?.visitantes.length === 3
    && semilla.visitantes.every(objeto) && ['A', 'B', 'C'].every(v => semilla?.visitantes.filter(x => x.visitante === v).length === 1
      && Object.entries(esperados).every(([k, n]) => semilla.visitantes.find(x => x.visitante === v)?.[k] === n)),
    semilla?.visitantes, esperados);
  criterio('RESULTADO_ARNES', typeof c.resultado === 'string' && Array.isArray(c.incidencias),
    c.resultado === 'PASS' && c.incidencias?.length === 0 && c.falloPrincipal === null,
    { resultado: c.resultado, incidencias: c.incidencias?.length, falloPrincipal: c.falloPrincipal }, 'PASS sin incidencias; no basta para aprobar recursos');

  const recorridos = Array.isArray(c.recorridos) ? c.recorridos.filter(objeto) : [];
  if (Array.isArray(c.recorridos) && recorridos.length !== c.recorridos.length) anotar('RECORRIDO_FORMATO_INVALIDO', 'INCOMPLETO');
  const campos = ['programados', 'iniciados', 'validos', 'fallidos', 'omitidosPorPausa', 'omitidosPorSobrecarga', 'truncadosAlCierre'];
  const nominal = recorridos.map(r => r.fases?.nominal);
  const completos = recorridos.length === 3 && ['A', 'B', 'C'].every(v => recorridos.filter(r => r.visitante === v).length === 1)
    && nominal.every(n => n && campos.every(k => entero(n[k])));
  const totales = Object.fromEntries(campos.map(k => [k, completos ? suma(nominal.map(n => n[k])) : null]));
  criterio('RECORRIDOS_NOMINALES', completos, completos && nominal.every(n => n.programados === 60 && n.iniciados === 60
    && n.validos === 60 && ['fallidos', 'omitidosPorPausa', 'omitidosPorSobrecarga', 'truncadosAlCierre'].every(k => n[k] === 0)),
    totales, '180/180 válidos; 0 fallos/pausas/slots perdidos/truncados');
  const todasFases = recorridos.flatMap(r => FASES.map(f => r.fases?.[f.nombre]));
  criterio('SLOTS_SIN_SOBRECARGA', todasFases.length === 12 && todasFases.every(n => entero(n?.omitidosPorSobrecarga)),
    todasFases.every(n => n?.omitidosPorSobrecarga === 0), suma(todasFases.map(n => n?.omitidosPorSobrecarga)), '0 en todas las fases');

  const operaciones = Array.isArray(c.operaciones) ? c.operaciones.filter(objeto) : [];
  const operacionesExigidas = ['sobrecupo-pico-41', 'sobrecupo-pico-43', 'copia-restore', 'reinicio-backend', 'liberar-reasignar-A', 'caducidad-B', 'caducidad-C'];
  criterio('OPERACIONES_COMPLETAS', Array.isArray(c.operaciones), operacionesExigidas.every(tipo =>
    operaciones.filter(o => o.tipo === tipo && o.estado === 'PASS' && fecha(o.inicio) && fecha(o.fin)).length === 1),
    operaciones.map(o => ({ tipo: o.tipo, estado: o.estado, inicio: o.inicio, fin: o.fin, ms: o.ms })), operacionesExigidas);
  const reinicio = operaciones.find(o => o.tipo === 'reinicio-backend' && o.estado === 'PASS');
  const duranteReinicio = (t, tolerancia = 0) => fecha(reinicio?.inicio) && fecha(reinicio?.fin)
    && t >= Date.parse(reinicio.inicio) - tolerancia && t <= Date.parse(reinicio.fin) + tolerancia;

  const gruposMapa = new Map();
  const peticiones = Array.isArray(datos.peticiones) ? datos.peticiones : [];
  comprobarEvidenciaCaducidad(datos, criterio);
  if (!peticiones.length) anotar('PETICIONES_AUSENTES', 'INCOMPLETO');
  let latenciasInvalidas = 0, estadosInvalidos = 0, operacionesDesconocidas = 0;
  for (const [indice, p] of peticiones.entries()) {
    if (!objeto(p) || typeof p.operacion !== 'string' || !/^[a-zA-Z0-9-]+$/.test(p.operacion) || typeof p.fase !== 'string') {
      anotar('PETICION_FORMATO_INVALIDO', 'INCOMPLETO', { linea: indice + 1 }); continue;
    }
    const clave = `${p.fase}|${p.operacion}`;
    if (!gruposMapa.has(clave)) gruposMapa.set(clave, { fase: p.fase, operacion: p.operacion, inducida: inducida(p.operacion), valores: [], estados: {}, inesperados: 0, estadosAusentes: 0 });
    const g = gruposMapa.get(clave); g.valores.push(p.ms);
    if (!num(p.ms)) latenciasInvalidas++;
    if (!entero(p.status)) { estadosInvalidos++; g.estadosAusentes++; }
    else { g.estados[p.status] = (g.estados[p.status] ?? 0) + 1; }
    const correcto = estadoEsperado(p.operacion, p.status);
    if (correcto === null) operacionesDesconocidas++;
    if (correcto === false) g.inesperados++;
    if (!fecha(p.fecha) || (p.fase !== 'semilla' && (!num(p.relativaMs) || p.relativaMs >= UMBRALES.duracionMs)))
      anotar('TIEMPO_PETICION_INVALIDO', 'INCOMPLETO', { linea: indice + 1 });
    if (p.fase !== 'semilla' && !FASES.some(f => f.nombre === p.fase)) anotar('FASE_NO_OFICIAL', 'FAIL', { linea: indice + 1 });
    if (!['A', 'B', 'C', 'OPERADOR'].includes(p.visitante)) anotar('VISITANTE_INVALIDO', 'INCOMPLETO', { linea: indice + 1 });
  }
  if (latenciasInvalidas || estadosInvalidos || operacionesDesconocidas)
    anotar('PETICIONES_DATOS_INCOMPLETOS', 'INCOMPLETO', { latenciasInvalidas, estadosInvalidos, operacionesDesconocidas });
  const grupos = [...gruposMapa.values()].map(g => {
    const { valores, ...resto } = g;
    const percentiles = percentilesCrudos(valores), umbralMs = limiteOperacion(g.operacion);
    const exigible = !g.inducida && (['nominal', 'pico'].includes(g.fase) || g.operacion === 'reserva');
    if (exigible && umbralMs !== null) criterio(`LATENCIA_${g.fase}_${g.operacion}`, percentiles.validas > 0 && percentiles.invalidas === 0,
      percentiles.p95 <= umbralMs, percentiles.p95, `p95<=${umbralMs}ms`);
    const f = FASES.find(f => f.nombre === g.fase);
    return { ...resto, ...percentiles, umbralMs, umbralAplicado: exigible && umbralMs !== null,
      peticionesPorSegundoVentana: f ? valores.length / ((f.hasta - f.desde) / 1000) : null };
  }).sort((a, b) => `${a.fase}|${a.operacion}`.localeCompare(`${b.fase}|${b.operacion}`));
  for (const f of ['nominal', 'pico']) {
    const ausentes = OPERACIONES_NOMINALES.filter(op => !grupos.some(g => g.fase === f && g.operacion === op));
    criterio(`MEZCLA_${f}`, ausentes.length === 0, true, ausentes, 'Todas las operaciones del recorrido observadas');
  }
  criterio('HTTP_SIN_INESPERADOS', peticiones.length > 0 && estadosInvalidos === 0 && operacionesDesconocidas === 0,
    grupos.every(g => g.inesperados === 0), suma(grupos.map(g => g.inesperados)), '0; inducidos conocidos evaluados por su estado exacto');
  const nominalPeticiones = grupos.filter(g => g.fase === 'nominal' && !g.inducida);
  criterio('PETICIONES_NOMINALES', nominalPeticiones.length > 0,
    suma(nominalPeticiones.map(g => g.muestras)) === 180 * 25
    && ['A', 'B', 'C'].every(v => peticiones.filter(p => objeto(p) && p.fase === 'nominal' && p.visitante === v && !inducida(p.operacion)).length === 1500),
    suma(nominalPeticiones.map(g => g.muestras)), '4500peticiones/180recorridos de25;1500por visitante');
  const reservas = grupos.filter(g => g.operacion === 'reserva');
  criterio('RESERVAS_UTILES', reservas.length > 0, suma(reservas.map(g => g.muestras)) === 6,
    suma(reservas.map(g => g.muestras)), '6 reservas útiles; semilla y reasignación separadas');
  for (const [op, n] of [['inducido-sobrecupo-reserva', 6], ['inducido-sobrecupo-csrf', 6], ['inducido-caducidad', 2]]) {
    const gs = grupos.filter(g => g.operacion === op);
    criterio(`SONDA_${op}`, gs.length > 0, suma(gs.map(g => g.muestras)) === n, suma(gs.map(g => g.muestras)), `${n} muestras previstas`);
  }

  const limites = new Map((Array.isArray(qi.limites) ? qi.limites : []).filter(objeto).map(l => [l.servicio, l]));
  const limitesFin = new Map((Array.isArray(qf.limites) ? qf.limites : []).filter(objeto).map(l => [l.servicio, l]));
  const imagenes = {};
  let cuotasCompletas = true, cuotasValidas = true;
  for (const s of SERVICIOS) {
    const a = limites.get(s), b = limitesFin.get(s);
    if (!a || !b || !num(a.memoria) || !num(a.nanoCpus) || typeof a.cgroup !== 'string'
      || !/^[a-f0-9]{64}$/.test(a.id ?? '') || !/^[a-f0-9]{64}$/.test(b.id ?? '')
      || !/^sha256:[a-f0-9]{64}$/.test(a.imagen ?? '') || !/^sha256:[a-f0-9]{64}$/.test(b.imagen ?? '')
      || typeof a.oom !== 'boolean' || typeof b.oom !== 'boolean'
      || !fecha(a.iniciadoEn) || !fecha(b.iniciadoEn)) {
      cuotasCompletas = false; continue;
    }
    const cg = a.cgroup.trim().split(/\s+/).map(Number);
    cuotasValidas &&= cg.length === 4 && cg.every(num) && cg[0] === a.memoria && cg[1] === 0
      && cg[3] > 0 && Math.abs(cg[2] / cg[3] - a.nanoCpus / 1e9) < 1e-6
      && a.swap === a.memoria && a.memoria === b.memoria && a.swap === b.swap && a.nanoCpus === b.nanoCpus
      && a.id === b.id && a.imagen === b.imagen && a.cgroup === b.cgroup;
    imagenes[s] = a.imagen;
    criterio(`OOM_${s}`, true, !a.oom && !b.oom, { inicio: a.oom, fin: b.oom }, 'false en ambos extremos');
  }
  const reservaSO = num(qi.reservaSO_MiB) ? qi.reservaSO_MiB * MiB : null;
  const memoriaLimites = suma(SERVICIOS.map(s => limites.get(s)?.memoria));
  const cpuLimites = suma(SERVICIOS.map(s => limites.get(s)?.nanoCpus));
  criterio('CUOTAS_ESTABLES', cuotasCompletas, cuotasValidas, { imagenes }, 'Identidades/imágenes/cuotas iguales; cgroups coinciden; swapmax0');
  criterio('PRESUPUESTO_CONJUNTO', !!presupuesto && reservaSO !== null && memoriaLimites !== null && cpuLimites !== null && num(perfil.reservaSO?.cpu),
    reservaSO >= presupuesto?.reserva && perfil.reservaSO?.MiB * MiB === reservaSO
    && memoriaLimites + reservaSO <= presupuesto?.memoria && cpuLimites / 1e9 + perfil.reservaSO?.cpu <= presupuesto?.cpu + 1e-8,
    { memoriaLimites, reservaSO, cpuLimites: cpuLimites === null ? null : cpuLimites / 1e9 }, presupuesto);

  const recursos = Array.isArray(datos.recursos) ? datos.recursos : [];
  const muestras = [], erroresMuestreo = [], reinicios = [], segmentos = new Map(), previos = new Map();
  const conexiones = [], bases = [], rss = [], diferenciasContadores = [];
  let oomDetectado = false, swapDetectado = false, anterioresFecha = null;
  for (const [indice, r] of recursos.entries()) {
    const t = fecha(r?.fecha) ? Date.parse(r.fecha) : null;
    const f = t !== null && desde !== null ? fase(t - desde) : 'desconocida';
    if (t === null || r?.error || !Array.isArray(r?.servicios)) {
      erroresMuestreo.push({ linea: indice + 1, fecha: fecha(r?.fecha) ? r.fecha : null, fase: f,
        cercaReinicioInducido: t !== null && duranteReinicio(t, UMBRALES.huecoMuestreoMaximoMs) }); continue;
    }
    if (anterioresFecha !== null && t <= anterioresFecha) anotar('MUESTREO_NO_MONOTONICO', 'INCOMPLETO', { linea: indice + 1 });
    anterioresFecha = t;
    const servicios = SERVICIOS.map(s => r.servicios.find(x => x?.servicio === s));
    const completo = r.servicios.length === 4 && servicios.every(s => s && num(s.memoriaBytes) && num(s.swapBytes)
      && num(s.memoria?.file) && num(s.memoria?.inactive_file) && num(s.eventos?.oom) && num(s.eventos?.oom_kill)
      && num(s.cpu?.usage_usec) && num(s.cpu?.nr_periods) && num(s.cpu?.nr_throttled) && num(s.cpu?.throttled_usec)
      && typeof s.id === 'string' && fecha(s.iniciadoEn) && s.estado === 'running' && ioContadores(s.io) !== null);
    if (!completo) { erroresMuestreo.push({ linea: indice + 1, fecha: r.fecha, fase: f, cercaReinicioInducido: duranteReinicio(t, 30000) }); continue; }
    muestras.push({ fecha: r.fecha, ms: t - desde, fase: f, memoriaBytes: suma(servicios.map(s => s.memoriaBytes)),
      fileBytes: suma(servicios.map(s => s.memoria.file)), inactiveFileBytes: suma(servicios.map(s => s.memoria.inactive_file)),
      swapBytes: suma(servicios.map(s => s.swapBytes)) });
    for (const s of servicios) {
      oomDetectado ||= s.eventos.oom > 0 || s.eventos.oom_kill > 0;
      swapDetectado ||= s.swapBytes > 0;
      if (num(s.proceso?.Rss)) rss.push({ servicio: s.servicio, fecha: r.fecha, rssBytes: s.proceso.Rss, pssBytes: num(s.proceso.Pss) ? s.proceso.Pss : null });
      const previo = previos.get(s.servicio), identidad = `${s.id}|${s.iniciadoEn}`;
      const original = limites.get(s.servicio);
      const identidadAnterior = previo?.identidad ?? (fecha(original?.iniciadoEn) ? `${original.id}|${original.iniciadoEn}` : null);
      if (identidadAnterior && identidadAnterior !== identidad) {
        const previsto = s.servicio === 'backend' && s.id === (previo?.s.id ?? original?.id) && duranteReinicio(Date.parse(s.iniciadoEn));
        reinicios.push({ servicio: s.servicio, fecha: r.fecha, iniciadoEn: s.iniciadoEn, previsto, idCambio: s.id !== (previo?.s.id ?? original?.id) });
        if (!previsto) anotar('REINICIO_INESPERADO', 'FAIL', { servicio: s.servicio, fecha: r.fecha });
      }
      const io = ioContadores(s.io);
      if (previo && previo.identidad === identidad && t > previo.t) {
        const camposCpu = ['usage_usec', 'nr_periods', 'nr_throttled', 'throttled_usec'];
        const deltas = Object.fromEntries(camposCpu.map(k => [k, s.cpu[k] - previo.s.cpu[k]]));
        const clavesIo = new Set([...Object.keys(io), ...Object.keys(previo.io)]);
        const sinBaseIo = [...clavesIo].filter(k => !num(io[k]) || !num(previo.io[k]));
        const deltaIo = Object.fromEntries([...clavesIo].filter(k => !sinBaseIo.includes(k)).map(k => [k, io[k] - previo.io[k]]));
        if (sinBaseIo.length) diferenciasContadores.push({ servicio: s.servicio, fecha: r.fecha,
          razon: 'IO_SIN_AMBOS_EXTREMOS', contadores: sinBaseIo });
        if ([...Object.values(deltas), ...Object.values(deltaIo)].some(v => v < 0)) {
          diferenciasContadores.push({ servicio: s.servicio, fecha: r.fecha, razon: 'CONTADOR_RETROCEDE_SIN_REINICIO_IDENTIFICADO' });
          anotar('CONTADOR_NO_COMPARABLE', 'INCOMPLETO', { servicio: s.servicio, fecha: r.fecha });
        } else {
          const faseIntervalo = previo.fase === f ? f : 'cruce-fase';
          const clave = `${s.servicio}|${identidad}|${faseIntervalo}`;
          if (!segmentos.has(clave)) segmentos.set(clave, { servicio: s.servicio, id: s.id, iniciadoEn: s.iniciadoEn, fase: faseIntervalo,
            intervalos: 0, duracionMs: 0, cpuUsoUs: 0, periodos: 0, periodosLimitados: 0, limitadoUs: 0, cpuMaximaCores: null, io: {}, intervalosIoIncompletos: 0 });
          const seg = segmentos.get(clave), dt = t - previo.t;
          if (sinBaseIo.length) seg.intervalosIoIncompletos++;
          seg.intervalos++; seg.duracionMs += dt; seg.cpuUsoUs += deltas.usage_usec; seg.periodos += deltas.nr_periods;
          seg.periodosLimitados += deltas.nr_throttled; seg.limitadoUs += deltas.throttled_usec;
          seg.cpuMaximaCores = Math.max(seg.cpuMaximaCores ?? 0, deltas.usage_usec / (dt * 1000));
          for (const [k, v] of Object.entries(deltaIo)) seg.io[k] = (seg.io[k] ?? 0) + v;
        }
      }
      previos.set(s.servicio, { s, identidad, io, t, fase: f });
    }
    const cx = filasNumericas(r.conexiones, 3), db = filasNumericas(r.bytesBases, 2);
    if (cx) conexiones.push({ fecha: r.fecha, fase: f, total: suma(cx.map(x => Number(x[2]))),
      grupos: cx.map(([base, estado, cantidad]) => ({ base, estado, cantidad: Number(cantidad) })) });
    else anotar('CONEXIONES_AUSENTES', 'INCOMPLETO', { linea: indice + 1 });
    if (db) bases.push({ fecha: r.fecha, fase: f, total: suma(db.map(x => Number(x[1]))) });
    else anotar('TAMANOS_BASE_AUSENTES', 'INCOMPLETO', { linea: indice + 1 });
  }
  for (const s of SERVICIOS) {
    const ultima = previos.get(s), cierre = limitesFin.get(s);
    if (ultima && cierre && fecha(cierre.iniciadoEn) && `${cierre.id}|${cierre.iniciadoEn}` !== ultima.identidad)
      anotar('IDENTIDAD_CAMBIA_TRAS_ULTIMA_MUESTRA', 'INCOMPLETO', { servicio: s, iniciadoEn: cierre.iniciadoEn });
  }
  for (const e of erroresMuestreo) if (!e.cercaReinicioInducido) anotar('ERROR_MUESTREO_NO_INDUCIDO', 'INCOMPLETO', e);
  const nominalRecursos = muestras.filter(m => m.fase === 'nominal');
  const tiemposTodos = [0, ...muestras.map(m => m.ms).filter(ms => num(ms) && ms < UMBRALES.duracionMs), UMBRALES.duracionMs];
  const huecosTodos = tiemposTodos.slice(1).map((t, i) => ({ desdeMs: tiemposTodos[i], hastaMs: t, ms: t - tiemposTodos[i],
    cercaReinicioInducido: desde !== null && duranteReinicio(desde + tiemposTodos[i], 30000) && duranteReinicio(desde + t, 30000) }));
  const coberturaCompleta = muestras.length > 0 && huecosTodos.every(h => h.ms <= 30000 || h.cercaReinicioInducido);
  criterio('COBERTURA_RECURSOS_VENTANA', coberturaCompleta, true,
    huecosTodos.filter(h => h.ms > 30000), 'Cobertura65min; huecos inducidos se muestran aparte');
  const puntos = [10 * MINUTO, ...nominalRecursos.map(m => m.ms), 40 * MINUTO];
  const huecos = puntos.slice(1).map((p, i) => ({ desdeMs: puntos[i], hastaMs: p, ms: p - puntos[i] }));
  const huecoMaximo = maximo(huecos.map(h => h.ms));
  criterio('COBERTURA_RAM_NOMINAL', nominalRecursos.length > 0 && !erroresMuestreo.some(e => e.fase === 'nominal')
    && huecoMaximo <= UMBRALES.huecoMuestreoMaximoMs, true,
    { muestras: nominalRecursos.length, huecoMaximoMs: huecoMaximo }, 'Sin errores nominales ni huecos>30s; guarda de integridad');
  const memoriaNominal = maximo(nominalRecursos.map(m => m.memoriaBytes));
  const proporcionRam = memoriaNominal !== null && reservaSO !== null && presupuesto ? (memoriaNominal + reservaSO) / presupuesto.memoria : null;
  criterio('RAM_NOMINAL', proporcionRam !== null, proporcionRam <= UMBRALES.ramNominalMaxima,
    { memoriaMaximaConjuntoBytes: memoriaNominal, reservaSOBytes: reservaSO, proporcion: proporcionRam }, '<=75%; sin restar caché');
  criterio('SIN_OOM_EN_MUESTRAS', muestras.length > 0, !oomDetectado, muestras.length ? oomDetectado : null, '0 OOM/oom_kill observados');
  criterio('SIN_SWAP', muestras.length > 0, !swapDetectado, maximo(muestras.map(m => m.swapBytes)), '0 bytes con memory.swap.max=0; no sustituye observación del SO host');
  criterio('REINICIO_CONTROLADO_OBSERVADO', coberturaCompleta, reinicios.filter(r => r.previsto).length === 1
    && reinicios.every(r => r.previsto), reinicios, 'Un cambio de iniciadoEn backend dentro de operación48min; ningún otro');
  const cpu = [...segmentos.values()].map(s => ({ ...s, cpuMediaCores: s.cpuUsoUs / (s.duracionMs * 1000),
    proporcionCuotaCPU: num(limites.get(s.servicio)?.nanoCpus) && limites.get(s.servicio).nanoCpus > 0
      ? s.cpuUsoUs / (s.duracionMs * 1000) / (limites.get(s.servicio).nanoCpus / 1e9) : null,
    proporcionPeriodosLimitados: s.periodos > 0 ? s.periodosLimitados / s.periodos : null }));

  const jvm = [];
  const lineasJvm = (typeof datos.jvm === 'string' ? datos.jvm : '').split(/\r?\n/).filter(l => l.includes('DEMO_METRICAS'));
  for (const linea of lineasJvm) {
    const valores = Object.fromEntries([...linea.matchAll(/(instante_ms|heap_usada|heap_comprometida|heap_maxima|no_heap_usada|directa|mapeada|hilos)=(\d+)/g)].map(m => [m[1], Number(m[2])]));
    if (['instante_ms', 'heap_usada', 'heap_comprometida', 'heap_maxima'].every(k => Number.isSafeInteger(valores[k]) && num(valores[k]))
      && valores.instante_ms > 0 && valores.heap_maxima > 0
      && valores.heap_usada <= valores.heap_comprometida && valores.heap_comprometida <= valores.heap_maxima)
      jvm.push({ ...valores, fase: desde === null ? 'desconocida' : fase(valores.instante_ms - desde) });
  }
  const jvmEnVentana = jvm.filter(m => FASES.some(f => f.nombre === m.fase));
  criterio('EVIDENCIA_HEAP_JVM', jvmEnVentana.length > 0 && jvm.length === lineasJvm.length, true,
    { lineas: lineasJvm.length, parseables: jvm.length, enVentana: jvmEnVentana.length },
    'Muestras heap parseables y coherentes; al menos una dentro de la ventana de medición');
  const bytesNmt = (valor, unidad) => Number(valor) * (unidad === 'KB' ? 1024 : unidad === 'MB' ? MiB : 1);
  const bloquesNmt = (typeof datos.nmt === 'string' ? datos.nmt : '').split('Native Memory Tracking:').slice(1);
  const nmt = bloquesNmt.flatMap(bloque => {
    const total = /Total:\s+reserved=(\d+)(KB|MB|B)?,\s+committed=(\d+)(KB|MB|B)?/.exec(bloque);
    if (!total) return [];
    const heap = /Java Heap\s*\(reserved=(\d+)(KB|MB|B)?,\s+committed=(\d+)(KB|MB|B)?\)/.exec(bloque);
    const comprometidaBytes = bytesNmt(total[3], total[4]);
    const reservadaBytes = bytesNmt(total[1], total[2]);
    const heapComprometidaBytes = heap ? bytesNmt(heap[3], heap[4]) : null;
    const heapReservadaBytes = heap ? bytesNmt(heap[1], heap[2]) : null;
    const completo = [reservadaBytes, comprometidaBytes, heapReservadaBytes, heapComprometidaBytes]
      .every(v => Number.isSafeInteger(v) && v > 0)
      && comprometidaBytes <= reservadaBytes && heapComprometidaBytes <= heapReservadaBytes
      && heapReservadaBytes <= reservadaBytes && heapComprometidaBytes <= comprometidaBytes;
    return [{ reservadaBytes, comprometidaBytes, heapReservadaBytes, heapComprometidaBytes,
      nativaComprometidaAproximadaBytes: completo
        ? comprometidaBytes - heapComprometidaBytes : null }];
  });
  const nmtCompletos = nmt.filter(n => num(n.nativaComprometidaAproximadaBytes));
  criterio('EVIDENCIA_NATIVA_NMT', nmtCompletos.length > 0 && nmtCompletos.length === bloquesNmt.length, true,
    { bloques: bloquesNmt.length, totalesParseables: nmt.length, completos: nmtCompletos.length },
    'Total y Java Heap NMT parseables y coherentes en el mismo bloque; nativa aproximada disponible');
  const estado = problemas.some(p => p.estado === 'FAIL') ? 'FAIL' : problemas.length ? 'INCOMPLETO' : 'PASS';
  return { versionEvaluador: VERSION, tipoDatos: sintetico ? 'SINTETICOS_PRUEBA_OFFLINE' : 'EVIDENCIA_PASADA', ejecucion: c.ejecucion ?? null,
    perfil: c.perfil ?? null, estado, evidenciaCompleta: !problemas.some(p => p.estado === 'INCOMPLETO'),
    elegibleParaRecomendacion: estado === 'PASS' && !sintetico, umbrales: UMBRALES, criterios, problemas,
    ventana: { inicio: inicio.inicio ?? null, fin: fin.fin ?? null, duracionObservadaMs: fin.duracionObservadaMs ?? null },
      comparabilidad: { semilla: c.semilla ?? null, imagenes, parametros: parametrosInicio, contratoSha256: contratoSellado ?? null,
      archivosVersion: selloValido ? archivosVersion.map(a => ({ ruta: a.ruta.replaceAll('\\', '/'), sha256: a.sha256 })).sort((a, b) => a.ruta.localeCompare(b.ruta)) : [] },
    carga: { nominal: totales, recorridos, grupos, latenciasInvalidas: peticiones.length ? latenciasInvalidas : null,
      estadosInvalidos: peticiones.length ? estadosInvalidos : null, operacionesDesconocidas: peticiones.length ? operacionesDesconocidas : null,
      nota: 'Percentiles calculados desde peticiones crudas por fase+operación; nunca promedio de percentiles. Semilla e inducidos separados.' },
    recursos: { filas: recursos.length, muestrasValidas: muestras.length, erroresMuestreo, huecos: huecosTodos.filter(h => h.ms > 30000), reinicios, diferenciasContadores,
      nominal: { maximaMemoriaBytes: memoriaNominal, reservaSOBytes: reservaSO, proporcionRAM: proporcionRam,
        margenRAM: proporcionRam === null ? null : 1 - proporcionRam, fileMaxBytes: maximo(nominalRecursos.map(m => m.fileBytes)),
        inactiveFileMaxBytes: maximo(nominalRecursos.map(m => m.inactiveFileBytes)), huecoMaximoMs: huecoMaximo },
      porFase: FASES.map(f => ({ fase: f.nombre, memoriaMaxBytes: maximo(muestras.filter(m => m.fase === f.nombre).map(m => m.memoriaBytes)),
        swapMaxBytes: maximo(muestras.filter(m => m.fase === f.nombre).map(m => m.swapBytes)) })),
      cpuIO: cpu, conexionesMaximas: maximo(conexiones.map(c => c.total)), conexiones,
      basesBytesIniciales: bases[0]?.total ?? null, basesBytesFinales: bases.at(-1)?.total ?? null,
      rss: SERVICIOS.filter(s => ['backend', 'provisionador'].includes(s)).map(s => ({ servicio: s,
        rssMaxBytes: maximo(rss.filter(r => r.servicio === s).map(r => r.rssBytes)), pssMaxBytes: maximo(rss.filter(r => r.servicio === s && num(r.pssBytes)).map(r => r.pssBytes)) })),
      jvm: { muestras: jvm.length, heapMaxUsadaBytes: maximo(jvm.map(m => m.heap_usada)), heapMaxComprometidaBytes: maximo(jvm.map(m => m.heap_comprometida)),
        porFase: FASES.map(f => ({ fase: f.nombre, heapMaxUsadaBytes: maximo(jvm.filter(m => m.fase === f.nombre).map(m => m.heap_usada)) })),
        nmt, ausencias: [...(!jvmEnVentana.length ? ['Sin muestras JVM válidas en la ventana'] : []),
          ...(jvm.length < lineasJvm.length ? ['Hay muestras JVM no parseables o incoherentes'] : []),
          ...(!nmtCompletos.length ? ['Sin bloque NMT completo para estimar memoria nativa'] : []),
          ...(nmtCompletos.length < bloquesNmt.length ? ['Hay bloques NMT incompletos o incoherentes'] : [])] } },
    limites: ['Muestreo discreto; no demuestra máximos entre muestras. Huecos/errores se conservan.',
      'memory.current suma cgroups independientes más reserva SO; file e inactive_file se presentan aparte y se solapan: no sumarlos ni restarlos al criterio.',
      'RSS/PSS son aproximaciones por proceso; no se suman a cgroups. Heap/no-heap y NMT comprometido/reservado no son RAM física adicional.',
      'NMT corresponde al backend en su reinicio; provisión tiene RSS/PSS, sin NMT. SO/Docker del host no están aislados como un VPS.',
      'NMT sin sufijo usa bytes de PrintNMTStatistics; KB/MB se convierten explícitamente. Nativa aproximada es total comprometido menos heap del mismo bloque, no RSS.',
      'CPU/IO se segmentan por ID e iniciadoEn; no se calculan diferencias a través de reinicios. Un contador inválido no equivale a cero.',
        'CPU sostenida, throttling y cola requieren interpretación antes de recomendar. No existe umbral numérico aprobado; PASS automático no acredita ausencia de saturación sostenida.',
      'Este evaluador no acredita publicación, aislamiento funcional fuera de estas evidencias ni aceptación humana.'] };
}

/** Requiere las cuatro pasadas completas A1/A2/B1/B2 y dos PASS comparables por candidato. */
export function recomendarPasadas(resumenes) {
  const pendientes = [], porPasada = new Map();
  for (const r of resumenes) {
    const sufijo = /(?:^|-)([ab][12])$/.exec(r.ejecucion ?? '')?.[1];
    if (!sufijo || porPasada.has(sufijo)) pendientes.push('Pasada desconocida o repetida');
    else porPasada.set(sufijo, r);
  }
  for (const p of ['a1', 'a2', 'b1', 'b2']) if (!porPasada.has(p)) pendientes.push(`Falta ${p}`);
  const comparables = resumenes.length > 0 && resumenes.every(r => r.tipoDatos === 'EVIDENCIA_PASADA' && r.evidenciaCompleta
    && r.versionEvaluador === VERSION && r.comparabilidad?.contratoSha256 && SERVICIOS.every(s => r.comparabilidad.imagenes?.[s])
    && parametrosCanonicos(r.comparabilidad.parametros) !== null
    && r.comparabilidad.archivosVersion?.length > 0
    && JSON.stringify(r.comparabilidad) === JSON.stringify(resumenes[0]?.comparabilidad));
  if (!comparables) pendientes.push('Evidencia incompleta, sintética o versiones/contrato no comparables');
  if (pendientes.length) return { estado: 'PENDIENTE', perfilCandidato: null, perfilRecomendado: null, pendientes };
  const menor = ['A', 'B'].find(p => [1, 2].every(n => porPasada.get(`${p.toLowerCase()}${n}`).elegibleParaRecomendacion === true
    && porPasada.get(`${p.toLowerCase()}${n}`).estado === 'PASS'));
  return { estado: menor ? 'CANDIDATO_LOCAL_PENDIENTE_REVISION' : 'NINGUN_PERFIL_ACREDITADO',
    perfilCandidato: menor ?? null, perfilRecomendado: null,
    pendientes: menor ? ['Revisión técnica documentada de CPU sostenida, throttling, cola y slots perdidos antes de recomendar; sin umbral numérico CPU aprobado',
      'Verificación en VPS real antes de publicar'] : ['A/B no reúnen dos PASS; C requiere autorización y evidencia propias'],
    criterio: 'Menor candidato con dos pasadas PASS; requiere interpretar CPU/cola. Nunca combina ni promedia percentiles de distintas pasadas.' };
}

const raiz = resolve(import.meta.dirname, '../..');
const baseEvidencia = resolve(raiz, 'qa/evidencias/ag016');
function nombreValido(nombre) {
  if (typeof nombre !== 'string' || !/^[a-z0-9-]+$/.test(nombre)) throw Error('Nombre de evidencia inválido.');
  return resolve(baseEvidencia, nombre);
}
function dentroDeEvidencia(archivo) {
  const real = realpathSync(archivo), relativo = relative(realpathSync(baseEvidencia), real);
  if (!relativo || relativo.startsWith('..') || resolve(baseEvidencia, relativo) !== real) throw Error('Fuente fuera de evidencia AG016.');
}
export function leerPasada(directorio, archivoPerfil, archivoContrato = resolve(baseEvidencia, 'contrato-carga-reloj.json')) {
  const problemasLectura = [], fuentes = [];
  function leer(archivo, tipo, obligatorio = true) {
    if (!existsSync(archivo)) { if (obligatorio) problemasLectura.push({ codigo: 'ARCHIVO_AUSENTE', estado: 'INCOMPLETO', archivo: relative(raiz, archivo).replaceAll('\\', '/') }); return null; }
    dentroDeEvidencia(archivo);
    const contenido = readFileSync(archivo, 'utf8');
    fuentes.push({ archivo: relative(raiz, archivo).replaceAll('\\', '/'), sha256: createHash('sha256').update(contenido).digest('hex') });
    if (tipo === 'texto') return contenido;
    if (tipo === 'jsonl') {
      const lineas = contenido.split(/\r?\n/); if (lineas.at(-1) === '') lineas.pop();
      return lineas.map((linea, indice) => { try { return JSON.parse(linea); } catch { problemasLectura.push({ codigo: 'JSONL_INVALIDO', estado: 'INCOMPLETO', archivo: relative(raiz, archivo).replaceAll('\\', '/'), linea: indice + 1 }); return null; } });
    }
    try { const valor = JSON.parse(contenido); if (!objeto(valor)) throw Error(); return valor; }
    catch { problemasLectura.push({ codigo: 'JSON_INVALIDO', estado: 'INCOMPLETO', archivo: relative(raiz, archivo).replaceAll('\\', '/') }); return null; }
  }
  const datos = { problemasLectura };
  for (const [clave, archivo] of Object.entries({ carga: 'resultado-carga.json', inicio: 'inicio-medicion.json', fin: 'fin-medicion.json',
    semilla: 'semilla.json', cuotasInicio: 'cuotas-inicio.json', cuotasFin: 'cuotas-fin.json', huellas: 'huellas-version.json' })) datos[clave] = leer(resolve(directorio, archivo), 'json');
  datos.contrato = leer(archivoContrato, 'json'); datos.perfil = leer(archivoPerfil, 'json');
  datos.peticiones = leer(resolve(directorio, 'peticiones.jsonl'), 'jsonl'); datos.recursos = leer(resolve(directorio, 'recursos.jsonl'), 'jsonl');
  datos.eventos = leer(resolve(directorio, 'eventos.jsonl'), 'jsonl');
  datos.jvm = leer(resolve(directorio, 'jvm-metricas.txt'), 'texto'); datos.nmt = leer(resolve(directorio, 'jvm-nmt.txt'), 'texto');
  datos.contratoSha256 = fuentes.find(f => f.archivo === relative(raiz, archivoContrato).replaceAll('\\', '/'))?.sha256 ?? null;
  return { datos, fuentes };
}

// Uso: node qa/ag016/evaluar.mjs carga-a1 perfil-a1
// Matriz: node qa/ag016/evaluar.mjs --matriz carga-a1 carga-a2 carga-b1 carga-b2
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv[2] === '--matriz') {
      const resumenes = process.argv.slice(3).map(nombre => {
        const archivo = resolve(nombreValido(nombre), 'evaluacion.json'); dentroDeEvidencia(archivo);
        const r = JSON.parse(readFileSync(archivo, 'utf8'));
        for (const f of r.fuentes ?? []) {
          const fuente = resolve(raiz, f.archivo); dentroDeEvidencia(fuente);
          if (createHash('sha256').update(readFileSync(fuente)).digest('hex') !== f.sha256) throw Error('La evidencia cambió después de evaluarse.');
        }
        return r;
      });
      console.log(JSON.stringify(recomendarPasadas(resumenes), null, 2));
    } else {
      if (process.argv.length !== 4) throw Error('Uso: evaluar.mjs <pasada> <directorio-perfil>, o --matriz <pasadas>.');
      const directorio = nombreValido(process.argv[2]), perfil = resolve(nombreValido(process.argv[3]), 'perfil.json');
      const salida = resolve(directorio, 'evaluacion.json');
      if (existsSync(salida)) throw Error('evaluacion.json ya existe; no se sobrescribe evidencia.');
      const { datos, fuentes } = leerPasada(directorio, perfil);
      const r = { evaluadoEn: new Date().toISOString(), ...evaluarDatos(datos), fuentes };
      writeFileSync(salida, `${JSON.stringify(r, null, 2)}\n`, { flag: 'wx' });
      console.log(JSON.stringify({ ejecucion: r.ejecucion, estado: r.estado, evidencia: relative(raiz, salida).replaceAll('\\', '/') }));
      if (r.estado !== 'PASS') process.exitCode = r.estado === 'FAIL' ? 1 : 2;
    }
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
