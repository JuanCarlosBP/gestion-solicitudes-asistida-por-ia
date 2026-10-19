import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as esperar } from 'node:timers/promises';
import { config, raiz } from './laboratorio.mjs';
import { percentiles } from './metricas.mjs';
import { comprobarCaducidadNatural, ErrorCaducidad, referenciaCaducidad } from './caducidad-carga.mjs';
import { codigoFallo, comprobar, DESFASES_VISITANTES_MS, FalloCarga, FinVentana, probarSobrecupo, recorrer, SEMILLA, SEMILLA_ESPERADA, sembrar, VisitanteCarga } from './recorrido.mjs';

const MINUTO = 60_000;
const DURACION = 65 * MINUTO;
const FASES = Object.freeze([
  { nombre: 'calentamiento', inicioMs: 0, finMs: 10 * MINUTO, intervaloMs: 30_000 },
  { nombre: 'nominal', inicioMs: 10 * MINUTO, finMs: 40 * MINUTO, intervaloMs: 30_000 },
  { nombre: 'pico', inicioMs: 40 * MINUTO, finMs: 45 * MINUTO, intervaloMs: 10_000 },
  { nombre: 'operaciones', inicioMs: 45 * MINUTO, finMs: DURACION, intervaloMs: 30_000 },
]);
const nombre = process.env.AG016_EJECUCION;
const pruebaArnes = process.env.AG016_PRUEBA_ARNES === 'true';
comprobar(typeof nombre === 'string' && /^[a-z0-9-]+$/.test(nombre), 'EJECUCION_EXPLICITA_INVALIDA');
const sufijo = /^carga-reloj-([ab][12])$/.exec(nombre)?.[1];
if (!pruebaArnes) {
  comprobar(!!sufijo, 'EJECUCION_DEBE_SER_CARGA_RELOJ_A1_A2_B1_B2');
  comprobar(config.env.PERFIL_RECURSOS === sufijo[0].toUpperCase(), 'PERFIL_EJECUCION_INCONSISTENTE');
  comprobar(process.env.AG016_BASE_QA === `ag016_restore_qa_reloj_${sufijo}`, 'BASE_QA_NO_CORRESPONDE_A_PASADA');
} else comprobar(nombre.includes('arnes'), 'PRUEBA_NO_BENCHMARK_DEBE_IDENTIFICAR_ARNES');
comprobar(process.env.AG016_PRUEBA_ARNES === undefined || ['true', 'false'].includes(process.env.AG016_PRUEBA_ARNES), 'MODO_ARNES_INVALIDO');

const salida = resolve(raiz, 'qa/evidencias/ag016', nombre);
for (const ruta of [salida, `${salida}-copia`, `${salida}-reinicio`]) {
  comprobar(!existsSync(ruta), 'SALIDA_YA_EXISTE_NO_SE_SOBRESCRIBE');
}
const temporal = resolve(raiz, 'tmp/ag016');
mkdirSync(temporal, { recursive: true });
const rutaCandado = resolve(temporal, 'carga-activa.lock');
const candado = openSync(rutaCandado, 'wx', 0o600);
writeFileSync(candado, JSON.stringify({ ejecucion: nombre, pid: process.pid, modo: pruebaArnes ? 'NO_BENCHMARK' : 'MEDICION' }));
mkdirSync(salida);

const inicioProceso = new Date().toISOString();
let origen = null;
let origenUtc = null;
let terminada = false;
let falloPrincipal = null;
let temporizadorEstado;
let ttlReservaMinutos = null;
const histogramas = new Map();
const incidencias = [];
const operaciones = [];
const resumenSemilla = [];
const visitantes = [];
let colaReservas = Promise.resolve();
const operacionInducida = (operacion) => /^(inducido-|reciclaje-)/.test(operacion);
const correctos = (m) => m.operacion === 'inducido-caducidad' ? m.status === 401
  : m.operacion === 'inducido-sobrecupo-reserva' ? m.status === 409
  : m.operacion === 'inducido-reinicio-salud' ? [0, 200, 502, 503, 504].includes(m.status)
    : m.status >= 200 && m.status < 300;
const json = (archivo, datos, nuevo = true) => writeFileSync(resolve(salida, archivo), `${JSON.stringify(datos, null, 2)}\n`, { flag: nuevo ? 'wx' : 'w' });
const evento = (tipo, datos = {}) => appendFileSync(resolve(salida, 'eventos.jsonl'), `${JSON.stringify({ fecha: new Date().toISOString(), tipo, ...datos })}\n`);

function faseActual() {
  if (origen === null) return 'semilla';
  if (pruebaArnes) return 'prueba-arnes-no-benchmark';
  const ms = performance.now() - origen;
  return FASES.find((fase) => ms >= fase.inicioMs && ms < fase.finMs)?.nombre ?? 'fuera-ventana';
}

function registrar(muestra) {
  // Lista cerrada: sin copiar cuerpos/cabeceras; tiempos permiten correlación con recursos.
  const publico = {
    operacion: muestra.operacion, status: muestra.status, ms: muestra.ms,
    fase: muestra.fase, visitante: muestra.visitante, fecha: muestra.fecha,
    relativaMs: origen === null ? null : Math.round((performance.now() - origen - muestra.ms) * 1000) / 1000,
  };
  appendFileSync(resolve(salida, 'peticiones.jsonl'), `${JSON.stringify(publico)}\n`);
  const clave = `${publico.fase}|${publico.operacion}`;
  let grupo = histogramas.get(clave);
  if (!grupo) {
    grupo = { fase: publico.fase, operacion: publico.operacion, ms: [], estados: {}, inesperados: 0, inducido: operacionInducida(publico.operacion) };
    histogramas.set(clave, grupo);
  }
  grupo.ms.push(publico.ms);
  grupo.estados[publico.status] = (grupo.estados[publico.status] ?? 0) + 1;
  if (!correctos(publico)) grupo.inesperados++;
}

const admitir = () => pruebaArnes || origen === null || (!terminada && performance.now() < origen + DURACION);
const nuevoCliente = (identificador) => new VisitanteCarga(config.base, identificador, registrar, faseActual, admitir,
  (rechazo) => appendFileSync(resolve(salida, 'rechazos.jsonl'), `${JSON.stringify(rechazo)}\n`));
const saldo = () => Object.fromEntries(FASES.map((fase) => [fase.nombre, { programados: (fase.finMs - fase.inicioMs) / fase.intervaloMs, iniciados: 0, validos: 0, fallidos: 0, omitidosPorPausa: 0, omitidosPorSobrecarga: 0, truncadosAlCierre: 0, duracionesMs: [] }]));

function estado() {
  json('estado.json', {
    ejecucion: nombre, modo: pruebaArnes ? 'PRUEBA_ARNES_NO_BENCHMARK' : 'MEDICION_65_MINUTOS',
    actualizado: new Date().toISOString(), fase: faseActual(),
    inicioMedicion: origenUtc, transcurridoMs: origen === null ? null : performance.now() - origen,
    finVentana: terminada,
    visitantes: visitantes.map((v) => ({ visitante: v.nombre, pausas: [...v.pausas], recorridoEnCurso: !!v.enCurso, siguienteRecorrido: v.numero })),
    incidencias: incidencias.length,
  }, false);
}

function incidencia(codigo, contexto = {}) {
  const dato = { fecha: new Date().toISOString(), codigo, ...contexto };
  incidencias.push(dato);
  evento('INCIDENCIA', dato);
}

async function hasta(instante) {
  let ms = instante - performance.now();
  while (ms > 0) {
    await esperar(ms);
    ms = instante - performance.now();
  }
}

async function reservaSerial(cliente, esperarPreparacion = false) {
  const trabajo = colaReservas.then(async () => {
    if (esperarPreparacion) {
      const limite = Math.min(origen + DURACION, performance.now() + 120_000);
      let disponible = false;
      while (performance.now() < limite && admitir()) {
        const r = await cliente.pedir('/api/demo', { operacion: 'reciclaje-disponibilidad', selector: null, bearer: null });
        comprobar(r.estado === 200, 'DISPONIBILIDAD_RECICLAJE_INVALIDA');
        if (r.json?.disponibles > 0) { disponible = true; break; }
        await esperar(1000);
      }
      comprobar(disponible, 'PROVISION_NO_DISPONIBLE_EN_120S');
    }
    // Se emite un único POST. Un resultado incierto/409 falla; no consume intentos ocultos.
    const r = await cliente.reservar();
    const recibidaMonoMs = performance.now();
    const recibidaUTC = new Date().toISOString();
    comprobar(r.estado === 201, `RESERVA_HTTP_${r.estado}`);
    const c = cliente.contexto;
    comprobar(/^ag016_demo_0[1-3]$/.test(c?.espacio ?? '') && typeof c?.generacion === 'string' && typeof c?.reservaId === 'string' && Number.isFinite(Date.parse(c?.expiraEn)), 'RESERVA_INVALIDA');
    const referenciaMs = referenciaCaducidad(recibidaMonoMs, ttlReservaMinutos);
    const fechaHttp = Date.parse(r.cabeceras.get('date') ?? '');
    evento('RESERVA_OBSERVADA', { visitante: cliente.nombre, espacio: c.espacio, generacion: c.generacion,
      recibidaMonoMs, recibidaUTC,
      rttMs: r.ms, expiraEn: c.expiraEn, ttlMinutos: ttlReservaMinutos,
      fechaHttpUTC: Number.isFinite(fechaHttp) ? new Date(fechaHttp).toISOString() : null,
      referenciaMonoMs: referenciaMs });
    return { contexto: c, referenciaMs };
  });
  colaReservas = trabajo.catch(() => undefined);
  return trabajo;
}

async function pausar(lista, motivo) {
  for (const v of lista) v.pausas.add(motivo);
  evento('PAUSA_INICIO', { motivo, visitantes: lista.map((v) => v.nombre) });
  estado();
  await Promise.all(lista.map((v) => v.enCurso).filter(Boolean));
}
function reanudar(lista, motivo) {
  for (const v of lista) v.pausas.delete(motivo);
  evento('PAUSA_FIN', { motivo, visitantes: lista.map((v) => v.nombre) });
  estado();
}

/** Solo helpers fijos, proceso hijo asíncrono y sin heredar sus mensajes a la evidencia HTTP. */
function hijo(tipo, visitante) {
  const esCopia = tipo === 'copia';
  const script = resolve(raiz, 'qa/ag016', esCopia ? 'copia-restore.mjs' : 'operar.mjs');
  const args = esCopia ? [script] : [script, 'restart', 'backend'];
  const env = { ...process.env, AG016_EJECUCION: `${nombre}-${esCopia ? 'copia' : 'reinicio'}`, AG016_MEDICION_ACTIVA: 'true' };
  if (esCopia) env.AG016_BASE_COPIA = visitante.cliente.contexto.espacio;
  return new Promise((resolveHijo, reject) => {
    const proceso = spawn(process.execPath, args, { cwd: raiz, env, windowsHide: true, stdio: 'ignore' });
    proceso.once('error', () => reject(new FalloCarga('HELPER_NO_INICIADO')));
    proceso.once('exit', (codigo) => {
      const evidencia = resolve(raiz, 'qa/evidencias/ag016', env.AG016_EJECUCION, esCopia ? 'restore.json' : 'ejecucion.json');
      if (codigo === 0 && existsSync(evidencia)) resolveHijo();
      else reject(new FalloCarga('HELPER_FALLO_O_NO_DEJO_EVIDENCIA'));
    });
  });
}

/** Helper privado de lectura; proceso asíncrono, salida cerrada y presupuesto por llamada. */
function observarCaducidad(contexto, presupuestoMs) {
  return new Promise((resolveObservacion, reject) => {
    const proceso = spawn(process.execPath, [resolve(raiz, 'qa/ag016/observar-caducidad.mjs')], {
      cwd: raiz, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, AG016_CADUCIDAD_ESPACIO: contexto.espacio,
        AG016_CADUCIDAD_GENERACION: contexto.generacion, AG016_CADUCIDAD_EXPIRA: contexto.expiraEn,
        AG016_CADUCIDAD_TTL_MINUTOS: String(ttlReservaMinutos) },
    });
    let finalizado = false;
    let salidaPublica = '';
    const terminar = (error, dato) => {
      if (finalizado) return;
      finalizado = true;
      clearTimeout(limite);
      if (error) reject(error); else resolveObservacion(dato);
    };
    const limite = setTimeout(() => {
      proceso.kill();
      terminar(new ErrorCaducidad('CADUCIDAD_HELPER_TIMEOUT'));
    }, Math.max(1, Math.floor(presupuestoMs)));
    proceso.stdout.setEncoding('utf8');
    proceso.stdout.on('data', (dato) => {
      salidaPublica += dato;
      if (Buffer.byteLength(salidaPublica, 'utf8') > 16384) {
        proceso.kill();
        terminar(new ErrorCaducidad('CADUCIDAD_HELPER_SALIDA_EXCESIVA'));
      }
    });
    proceso.once('error', () => terminar(new ErrorCaducidad('CADUCIDAD_HELPER_NO_INICIADO')));
    proceso.once('close', (codigo) => {
      if (codigo !== 0) return terminar(new ErrorCaducidad('CADUCIDAD_HELPER_FALLO'));
      try { terminar(null, JSON.parse(salidaPublica)); }
      catch { terminar(new ErrorCaducidad('CADUCIDAD_HELPER_JSON_INVALIDO')); }
    });
  });
}

function registrarCaducidad(v, tipo, dato) {
  if (tipo === 'BARRERA_CADUCIDAD_CONFIRMADA') {
    evento(tipo, { visitante: v.nombre, referenciaRelativaMs: dato.referenciaMs - origen,
      limiteRelativoMs: dato.limiteMs - origen, observaciones: dato.observaciones,
      finRelativoMs: dato.finMs - origen, ultimaObservacion: dato.ultimaObservacion, duracionMs: dato.duracionMs });
  } else {
    evento(tipo, { visitante: v.nombre, inicioRelativoMs: dato.inicioMs - origen,
      finRelativoMs: dato.finMs - origen,
      ...(tipo === 'OBSERVACION_CADUCIDAD' ? { observacion: dato.observacion } : { codigo: dato.codigo }) });
  }
}

async function operacionProgramada(tipo, objetivo, trabajo) {
  await hasta(objetivo);
  const inicio = performance.now();
  const dato = { tipo, previstoDesdeInicioMs: objetivo - origen, inicioDesdeInicioMs: inicio - origen, inicio: new Date().toISOString() };
  evento('OPERACION_INICIO', dato);
  try {
    if (!admitir()) throw new FinVentana();
    await trabajo();
    dato.estado = 'PASS';
  } catch (error) {
    dato.estado = 'FAIL';
    dato.codigo = codigoFallo(error);
    incidencia(dato.codigo, { operacion: tipo });
  }
  dato.fin = new Date().toISOString();
  dato.ms = performance.now() - inicio;
  operaciones.push(dato);
  evento('OPERACION_FIN', dato);
  return dato;
}

async function reasignar(v) {
  const anterior = { ...v.cliente.contexto };
  const nueva = nuevoCliente(v.nombre);
  nueva.pausaPeticionMs = 0;
  await reservaSerial(nueva, true);
  comprobar(nueva.contexto.generacion !== anterior.generacion && nueva.contexto.reservaId !== anterior.reservaId, 'REASIGNACION_REUTILIZA_CONTEXTO');
  v.cliente = nueva;
  // Visitante nuevo: catálogo preparado; no se repite la semilla de100solicitudes.
  evento('VISITANTE_REASIGNADO', { visitante: v.nombre, nuevaGeneracion: true, solicitudesIniciales: 0, proveedores: 20 });
}

async function cicloVisitante(v, indice) {
  let anteriorFin = -Infinity;
  for (const fase of FASES) {
    const cuenta = v.recorridos[fase.nombre];
    for (let objetivo = origen + fase.inicioMs + DESFASES_VISITANTES_MS[indice]; objetivo < origen + fase.finMs; objetivo += fase.intervaloMs) {
      if (objetivo < anteriorFin) {
        cuenta.omitidosPorSobrecarga++;
        evento('RECORRIDO_OMITIDO', { visitante: v.nombre, fase: fase.nombre, motivo: 'SOBRECARGA' });
        continue;
      }
      await hasta(objetivo);
      if (!admitir()) break;
      if (v.pausas.size) {
        cuenta.omitidosPorPausa++;
        evento('RECORRIDO_OMITIDO', { visitante: v.nombre, fase: fase.nombre, motivo: 'PAUSA_OPERATIVA' });
        continue;
      }
      cuenta.iniciados++;
      const numero = v.numero++;
      const inicio = performance.now();
      v.enCurso = (async () => {
        try {
          await recorrer(v.cliente, numero);
          cuenta.validos++;
        } catch (error) {
          if (error instanceof FinVentana) cuenta.truncadosAlCierre++;
          else {
            cuenta.fallidos++;
            incidencia(codigoFallo(error), { visitante: v.nombre, fase: fase.nombre, recorrido: numero });
          }
        } finally {
          cuenta.duracionesMs.push(performance.now() - inicio);
        }
      })();
      await v.enCurso;
      v.enCurso = null;
      anteriorFin = performance.now();
    }
  }
}

async function rafagaSobrecupo() {
  const resultados = await Promise.allSettled(Array.from({ length: 3 }, () => {
    const cliente = nuevoCliente('OPERADOR');
    cliente.pausaPeticionMs = 0;
    return probarSobrecupo(cliente);
  }));
  const fallo = resultados.find((r) => r.status === 'rejected');
  evento('RAFAGA_SOBRECUPO', { intentos: 3, rechazosCorrectos: resultados.filter((r) => r.status === 'fulfilled').length, reservaEsperada: false });
  if (fallo) throw fallo.reason;
}

function agregado() {
  const grupos = [...histogramas.values()].map((g) => {
    const fase = FASES.find((f) => f.nombre === g.fase);
    return {
      fase: g.fase, operacion: g.operacion, inducido: g.inducido,
      ...percentiles(g.ms), estados: g.estados, erroresInesperados: g.inesperados,
      peticionesPorSegundoVentana: fase ? g.ms.length / ((fase.finMs - fase.inicioMs) / 1000) : null,
    };
  }).sort((a, b) => `${a.fase}|${a.operacion}`.localeCompare(`${b.fase}|${b.operacion}`));
  const recorridos = visitantes.map((v) => ({
    visitante: v.nombre,
    fases: Object.fromEntries(Object.entries(v.recorridos).map(([fase, c]) => {
      const { duracionesMs, ...conteos } = c;
      return [fase, { ...conteos, latenciaRecorrido: percentiles(duracionesMs), proporcionValidaProgramada: c.programados ? c.validos / c.programados : null }];
    })),
  }));
  return { grupos, recorridos };
}

try {
  json('ejecucion.json', { inicio: inicioProceso, ejecucion: nombre, modo: pruebaArnes ? 'PRUEBA_ARNES_NO_BENCHMARK' : 'MEDICION_65_MINUTOS', semilla: SEMILLA, perfil: config.env.PERFIL_RECURSOS, pasada: sufijo ?? null, fases: FASES, mezcla: 'recorrido.mjs', datosInicialesPorEspacio: SEMILLA_ESPERADA });
  estado();
  const publico = nuevoCliente('OPERADOR');
  const presentacion = await publico.pedir('/api/demo', { operacion: 'preflight-presentacion', selector: null, bearer: null });
  comprobar(presentacion.estado === 200 && presentacion.json?.habilitada === true && presentacion.json.cupo === 3 && presentacion.json.disponibles === 3 && presentacion.json.duracionMinutos === 60, 'PREFLIGHT_EXIGE_TRES_LISTOS_TTL60');
  ttlReservaMinutos = presentacion.json.duracionMinutos;
  for (const identificador of ['A', 'B', 'C']) {
    const cliente = nuevoCliente(identificador);
    const reserva = await reservaSerial(cliente);
    visitantes.push({ nombre: identificador, cliente, referenciaCaducidadMs: reserva.referenciaMs,
      pausas: new Set(), enCurso: null, numero: 0, recorridos: saldo() });
  }
  comprobar(new Set(visitantes.map((v) => v.cliente.contexto.espacio)).size === 3, 'RESERVAS_NO_EXCLUSIVAS');
  const semillas = await Promise.allSettled(visitantes.map((v) => sembrar(v.cliente)));
  for (let i = 0; i < semillas.length; i++) {
    const resultado = semillas[i];
    if (resultado.status === 'fulfilled') resumenSemilla.push(resultado.value);
    else incidencia(codigoFallo(resultado.reason), { etapa: 'semilla', visitante: visitantes[i].nombre });
  }
  json('semilla.json', { semilla: SEMILLA, resultado: incidencias.length ? 'FAIL' : 'PASS', fin: new Date().toISOString(), visitantes: resumenSemilla });
  comprobar(!incidencias.length, 'PREPARACION_FALLIDA_NO_INICIA_MEDICION');
  if (!pruebaArnes) comprobar(visitantes.every((v) => v.referenciaCaducidadMs - performance.now() > 45 * MINUTO + 30_000), 'SEMILLA_TARDO_DEMAS_CADUCIDAD_FUERA_FASE_OPERATIVA');
  for (const v of visitantes) v.cliente.pausaPeticionMs = 0;

  if (pruebaArnes) {
    origen = performance.now();
    await rafagaSobrecupo();
    const inicioRecorridos = performance.now();
    const pruebas = await Promise.allSettled(visitantes.map(async (v, indice) => {
      const objetivo = inicioRecorridos + DESFASES_VISITANTES_MS[indice];
      await hasta(objetivo);
      evento('PRUEBA_ARNES_RECORRIDO_INICIO', { visitante: v.nombre,
        desfasePlanificadoMs: DESFASES_VISITANTES_MS[indice],
        desfaseObservadoMs: performance.now() - inicioRecorridos });
      return recorrer(v.cliente, 0);
    }));
    for (let i = 0; i < pruebas.length; i++) {
      if (pruebas[i].status === 'rejected') incidencia(codigoFallo(pruebas[i].reason), { etapa: 'prueba-arnes', visitante: visitantes[i].nombre });
    }
    comprobar(!incidencias.length, 'PRUEBA_ARNES_FALLIDA');
    for (const v of visitantes) comprobar((await v.cliente.liberar()).estado === 204, 'PRUEBA_LIBERACION_FALLIDA');
    evento('PRUEBA_ARNES_FIN', { resultado: 'PASS', recorridos: 3, benchmark: false });
  } else {
    origenUtc = new Date().toISOString();
    origen = performance.now();
    const finPrevisto = new Date(Date.parse(origenUtc) + DURACION).toISOString();
    json('inicio-medicion.json', { inicio: origenUtc, origenMonoMs: origen, finPrevisto, duracionMs: DURACION, ejecucion: nombre, perfil: config.env.PERFIL_RECURSOS, semilla: SEMILLA, fases: FASES });
    evento('MEDICION_INICIO', { inicio: origenUtc, origenMonoMs: origen, finPrevisto, duracionMs: DURACION });
    temporizadorEstado = setInterval(estado, 1000);

    // Dos ráfagas pequeñas dentro del pico, con clientes nuevos sin reserva.
    // Sus 409 y consultas CSRF inducidas nunca cuentan como recorridos útiles.
    const sobrecupo = [41, 43].map((minuto) =>
      operacionProgramada(`sobrecupo-pico-${minuto}`, origen + minuto * MINUTO, rafagaSobrecupo));

    // Registrar estos timers antes de los visitantes evita admitir un nuevo recorrido
    // de A en el mismo instante previsto para iniciar su pausa operativa.
    const copia = operacionProgramada('copia-restore', origen + 46 * MINUTO, async () => {
      await pausar([visitantes[0]], 'copia-restore');
      try { await hijo('copia', visitantes[0]); }
      finally { reanudar([visitantes[0]], 'copia-restore'); }
    });
    const reinicio = operacionProgramada('reinicio-backend', origen + 48 * MINUTO, async () => {
      await pausar(visitantes, 'reinicio-backend');
      const salud = nuevoCliente('OPERADOR');
      salud.pausaPeticionMs = 0;
      let finalizado = false;
      const comando = hijo('reinicio').then(() => ({ ok: true }), (error) => ({ ok: false, error })).finally(() => { finalizado = true; });
      const limite = Math.min(origen + DURACION, performance.now() + 90_000);
      let disponible = false;
      do {
        try {
          const r = await salud.pedir('/api/salud', { operacion: 'inducido-reinicio-salud', selector: null, bearer: null });
          disponible = finalizado && r.estado === 200;
        } catch (error) { if (error instanceof FinVentana) break; }
        if (disponible) break;
        await esperar(500);
      } while (performance.now() < limite);
      const resultado = await comando;
      if (!resultado.ok) throw resultado.error;
      comprobar(disponible, 'REINICIO_NO_SALUDABLE_EN_90S');
      reanudar(visitantes, 'reinicio-backend');
    });
    const reciclarA = operacionProgramada('liberar-reasignar-A', origen + 50 * MINUTO, async () => {
      const respaldo = await copia;
      comprobar(respaldo.estado === 'PASS', 'RECICLAJE_A_BLOQUEADO_POR_COPIA');
      const v = visitantes[0];
      await pausar([v], 'liberar-reasignar');
      const anterior = { ...v.cliente.contexto };
      comprobar((await v.cliente.liberar()).estado === 204, 'LIBERACION_A_FALLIDA');
      // liberar limpia el contexto del cliente; preservarlo solo en memoria para cotejar.
      v.cliente.contexto = anterior;
      await reasignar(v);
      reanudar([v], 'liberar-reasignar');
    });
    const expiraciones = visitantes.slice(1).map((v) => {
      const caduca = v.referenciaCaducidadMs;
      return operacionProgramada(`caducidad-${v.nombre}`, caduca - 30_000, async () => {
        await pausar([v], 'caducidad-natural');
        const contextoOriginal = { ...v.cliente.contexto };
        try {
          await comprobarCaducidadNatural({ contexto: contextoOriginal, ttlMinutos: ttlReservaMinutos,
            referenciaMs: caduca, finVentanaMs: origen + DURACION, ahora: () => performance.now(), esperar,
            observar: (presupuestoMs) => observarCaducidad(contextoOriginal, presupuestoMs),
            sondar: () => v.cliente.pedir('/api/demo/reserva', { operacion: 'inducido-caducidad', bearer: null }),
            registrar: (tipo, dato) => registrarCaducidad(v, tipo, dato) });
        } catch (error) {
          if (error instanceof ErrorCaducidad) throw new FalloCarga(error.codigo);
          throw error;
        }
        await reasignar(v);
        reanudar([v], 'caducidad-natural');
      });
    });
    const trabajos = visitantes.map((v, i) => cicloVisitante(v, i).catch((error) => {
      incidencia(codigoFallo(error), { etapa: 'planificador-visitante', visitante: v.nombre });
    }));
    await hasta(origen + DURACION);
    terminada = true;
    const finVentana = new Date().toISOString();
    json('fin-medicion.json', { fin: finVentana, inicio: origenUtc, finPrevisto, duracionPlanificadaMs: DURACION, duracionObservadaMs: performance.now() - origen });
    evento('MEDICION_FIN_VENTANA', { fin: finVentana });
    // No emitir peticiones después de65min. Conservar la cola observada de respuestas.
    await Promise.all([...trabajos, copia, reinicio, reciclarA, ...expiraciones, ...sobrecupo]);
    for (const v of visitantes) {
      const nominal = v.recorridos.nominal;
      if (nominal.validos !== nominal.programados) incidencia('NOMINAL_NO_COMPLETO_100_POR_CIENTO', { visitante: v.nombre });
      if (Object.values(v.recorridos).some((f) => f.omitidosPorSobrecarga > 0)) incidencia('SLOTS_PERDIDOS_POR_SOBRECARGA', { visitante: v.nombre });
    }
  }
} catch (error) {
  falloPrincipal = codigoFallo(error);
  incidencia(falloPrincipal, { etapa: faseActual() });
} finally {
  clearInterval(temporizadorEstado);
  const datos = agregado();
  const httpInesperado = datos.grupos.some((g) => g.erroresInesperados > 0);
  const resultado = incidencias.length || httpInesperado ? 'FAIL' : 'PASS';
  json('resultado-carga.json', {
    ejecucion: nombre, modo: pruebaArnes ? 'PRUEBA_ARNES_NO_BENCHMARK' : 'MEDICION_65_MINUTOS',
    inicioProceso, finProceso: new Date().toISOString(), inicioMedicion: origenUtc,
    ventanaCompleta: !pruebaArnes && terminada, semilla: SEMILLA, resultado, falloPrincipal,
    perfil: config.env.PERFIL_RECURSOS, operaciones, incidencias, ...datos,
    limites: ['Este resultado no incorpora todavía recursos/umbral RAM, OOM, swap ni validación VPS.', 'Errores inducidos y semilla están separados del tráfico útil.', 'PASS del arnés no constituye recomendación de perfil ni aceptación humana.'],
  });
  estado();
  closeSync(candado);
  unlinkSync(rutaCandado);
  console.log(JSON.stringify({ ejecucion: nombre, resultado, modo: pruebaArnes ? 'NO_BENCHMARK' : '65_MINUTOS', evidencia: `qa/evidencias/ag016/${nombre}/resultado-carga.json` }));
  if (resultado !== 'PASS') process.exitCode = 1;
}
