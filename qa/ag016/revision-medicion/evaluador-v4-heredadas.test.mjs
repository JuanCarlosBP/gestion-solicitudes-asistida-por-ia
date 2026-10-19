import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarDatos, percentilesCrudos, recomendarPasadas, VERSION } from './evaluador-v4.mjs';

// Exclusivamente fixtures sintéticos en memoria. No son pasadas ni evidencias de capacidad.
const M = 60000, MiB = 1024 ** 2, T = Date.parse('2026-01-01T00:00:00Z');
const iso = ms => new Date(T + ms).toISOString();
const servicios = ['backend', 'postgres', 'frontend', 'provisionador'];
const id = s => String(servicios.indexOf(s) + 1).repeat(64);
const imagen = s => `sha256:${String(servicios.indexOf(s) + 5).repeat(64)}`;
const fases = [['calentamiento', 0, 10, 20], ['nominal', 10, 40, 60], ['pico', 40, 45, 30], ['operaciones', 45, 65, 40]];
const secuencia = ['csrf', 'login-SOLICITANTE', 'lista-solicitante', 'proveedores', 'supervisores', 'resumen-solicitante',
  'crear', 'editar', 'presentar', 'presentar-replay', 'csrf', 'refresh', 'logout', 'csrf', 'login-SUPERVISOR',
  'lista-supervisor', 'detalle-supervisor', 'aprobar', 'logout', 'csrf', 'login-AUDITOR', 'historial', 'resumen-auditor', 'detalle-auditor', 'logout'];

function datosSinteticos() {
  const memoria = [960, 512, 64, 256], cpu = [.55, .25, .05, .05];
  const publico = { entorno: 'local', espacios: ['ag016_demo_01', 'ag016_demo_02', 'ag016_demo_03'], cupo: 3,
    'duracion.minutos': 60, 'pool.maximo': 3, 'peticiones.minuto': 240, 'autenticacion.minuto': 30,
    'reservas.minuto': 12, 'almacenamiento.bytes': 268435456, 'metricas.segundos': 10 };
  const parametros = { runtime: publico, provisionador: structuredClone(publico) };
  const limites = servicios.map((servicio, n) => ({ servicio, id: id(servicio), imagen: imagen(servicio),
    iniciadoEn: iso(-30000), memoria: memoria[n] * MiB, swap: memoria[n] * MiB, nanoCpus: cpu[n] * 1e9,
    reinicios: 0, oom: false, cgroup: `${memoria[n] * MiB}\n0\n${cpu[n] * 100000} 100000` }));
  const sello = { fecha: iso(-1000), perfil: 'A', parametros, archivos: [
    { ruta: 'qa/evidencias/ag016/contrato-carga-reloj.json', sha256: 'a'.repeat(64) },
    { ruta: 'qa/ag016/carga.mjs', sha256: 'b'.repeat(64) },
  ] };
  for (const ruta of ['qa/ag016/caducidad-carga.mjs', 'qa/ag016/observar-caducidad.mjs', 'qa/ag016/evaluar.mjs', 'qa/ag016/recorrido.mjs', 'qa/ag016/cliente.mjs', 'qa/ag016/metricas.mjs', 'qa/ag016/muestrear.mjs',
    'qa/ag016/perfil.mjs', 'qa/ag016/parametros-publicos.mjs', 'qa/ag016/plazo-arranque.mjs', 'qa/ag016/laboratorio.mjs', 'qa/ag016/copia-restore.mjs', 'qa/ag016/operar.mjs',
    'infraestructura/demo/compose.yaml', 'infraestructura/demo/nginx-local.conf', 'infraestructura/demo/inicializar.sh',
    'infraestructura/demo/pg_hba.conf', 'backend/target/gestion-solicitudes-0.0.1.jar', 'frontend/dist/gestion-solicitudes-frontend/browser/main.js'])
    sello.archivos.push({ ruta, sha256: 'c'.repeat(64) });
  const datos = {
    contrato: { version: 'AG016-carga-reloj-1', semilla: 160082026, ejecucionOficial: { duracionMedicionMs: 65 * M }, visitantes: { cantidad: 3 },
      fases: fases.map(([nombre, desde, hasta]) => ({ nombre, inicioMinuto: desde, finMinuto: hasta })) },
    contratoSha256: 'a'.repeat(64), huellas: sello,
    inicio: { inicio: iso(0), origenMonoMs: 200000, duracionMs: 65 * M, perfil: 'A', semilla: 160082026 },
    fin: { inicio: iso(0), fin: iso(65 * M), duracionPlanificadaMs: 65 * M, duracionObservadaMs: 65 * M },
    perfil: { perfil: 'A', envolventeMiB: 2048, envolventeCPU: 1, arranqueConjuntoMs: 6000, reservaSO: { MiB: 256, cpu: .10 } },
    cuotasInicio: { fecha: iso(0), perfil: 'A', reservaSO_MiB: 256, limites },
    cuotasFin: { fecha: iso(65 * M), limites: structuredClone(limites), parametros: structuredClone(parametros) },
    semilla: { semilla: 160082026, resultado: 'PASS', visitantes: ['A', 'B', 'C'].map(visitante => ({ visitante,
      proveedores: 20, solicitudes: 100, conceptosPorSolicitud: 5, BORRADOR: 60, PRESENTADA: 20, APROBADA: 10, RECHAZADA: 10 })) },
    carga: { ejecucion: 'sintetico-a1', perfil: 'A', modo: 'MEDICION_65_MINUTOS', inicioMedicion: iso(0), ventanaCompleta: true,
      semilla: 160082026, resultado: 'PASS', incidencias: [], falloPrincipal: null,
      recorridos: ['A', 'B', 'C'].map(visitante => ({ visitante, fases: Object.fromEntries(fases.map(([f, , , n]) => [f,
        { programados: n, iniciados: n, validos: n, fallidos: 0, omitidosPorPausa: 0, omitidosPorSobrecarga: 0, truncadosAlCierre: 0 }])) })),
      operaciones: [['sobrecupo-pico-41', 41], ['sobrecupo-pico-43', 43], ['copia-restore', 46], ['reinicio-backend', 48],
        ['liberar-reasignar-A', 50], ['caducidad-B', 58], ['caducidad-C', 58]].map(([tipo, minuto]) => ({ tipo, estado: 'PASS',
          inicio: iso(minuto * M), fin: iso(minuto * M + 20000), ms: 20000 })) },
    peticiones: [], recursos: [], eventos: [],
    jvm: `DEMO_METRICAS instante_ms=${T + 10 * M} heap_usada=104857600 heap_comprometida=209715200 heap_maxima=536870912 no_heap_usada=100 directa=0 mapeada=0 hilos=30`,
    nmt: 'Native Memory Tracking:\nTotal: reserved=823456KB, committed=654321KB\n- Java Heap (reserved=524288KB, committed=204800KB)\n',
  };
  function pedir(operacion, fase, ms, visitante = 'A', status) {
    datos.peticiones.push({ operacion, fase, visitante, relativaMs: fase === 'semilla' ? null : ms, fecha: iso(ms + 100), ms: 100,
      status: status ?? (['csrf', 'logout'].includes(operacion) ? 204 : ['crear', 'reserva'].includes(operacion) ? 201 : 200) });
  }
  for (const [f, inicio, , n] of fases.filter(f => ['nominal', 'pico'].includes(f[0]))) {
    for (const [vi, v] of ['A', 'B', 'C'].entries()) for (let i = 0; i < n; i++) {
      for (const [j, op] of secuencia.entries()) pedir(op === 'aprobar' && i % 2 ? 'rechazar' : op,
        f, inicio * M + i * (f === 'nominal' ? 30000 : 10000) + vi * 1000 + j * 10, v);
    }
  }
  for (const v of ['A', 'B', 'C']) { pedir('reserva', 'semilla', -50000, v); pedir('reserva', 'operaciones', 59 * M, v); }
  for (let i = 0; i < 6; i++) { pedir('inducido-sobrecupo-csrf', 'pico', 41 * M + i, 'OPERADOR', 204); pedir('inducido-sobrecupo-reserva', 'pico', 41 * M + i, 'OPERADOR', 409); }
  for (const [i, v] of ['B', 'C'].entries()) {
    const contexto = { espacio: `ag016_demo_0${i + 2}`, generacion: `16008000-0000-4000-8000-00000000000${i + 2}`, expiraEn: iso(58 * M) };
    const observacion = { version: 'AG016-observador-1', resultado: 'CADUCADA', ...contexto,
      reservadaEn: iso(-2 * M), caducadaEn: iso(58 * M + 200), ttlCoherente: true, posterior: true,
      retrasoServidorMs: 200, observadoUTC: iso(58 * M + 400), duracionMs: 400,
      identidad: { postgres: id('postgres'), backend: id('backend') } };
    datos.eventos.push({ tipo: 'RESERVA_OBSERVADA', visitante: v, ...contexto, recibidaMonoMs: 80000,
      recibidaUTC: iso(-2 * M), rttMs: 10, ttlMinutos: 60, referenciaMonoMs: 200000 + 58 * M });
    datos.eventos.push({ tipo: 'OBSERVACION_CADUCIDAD', visitante: v, inicioRelativoMs: 58 * M + 100,
      finRelativoMs: 58 * M + 500, observacion });
    datos.eventos.push({ tipo: 'BARRERA_CADUCIDAD_CONFIRMADA', visitante: v, referenciaRelativaMs: 58 * M,
      limiteRelativoMs: 60 * M, observaciones: 1, finRelativoMs: 58 * M + 500,
      ultimaObservacion: structuredClone(observacion), duracionMs: 400 });
    pedir('inducido-caducidad', 'operaciones', 58 * M + 600, v, 401);
  }
  for (let ms = 0; ms < 65 * M; ms += 10000) {
    datos.recursos.push({ fecha: iso(ms), servicios: servicios.map(servicio => {
      const reiniciado = servicio === 'backend' && ms >= 48 * M + 5000;
      const elapsed = reiniciado ? ms - (48 * M + 5000) : ms + 30000;
      return { servicio, id: id(servicio), iniciadoEn: iso(reiniciado ? 48 * M + 5000 : -30000), estado: 'running',
        memoriaBytes: 20 * MiB, swapBytes: 0, memoria: { file: MiB, inactive_file: MiB / 2 }, eventos: { oom: 0, oom_kill: 0 },
        cpu: { usage_usec: elapsed * 100, nr_periods: elapsed / 100, nr_throttled: elapsed / 1000, throttled_usec: elapsed * 5 },
        io: [`8:0 rbytes=${elapsed} wbytes=${elapsed * 2} rios=${elapsed / 100} wios=${elapsed / 100}`],
        proceso: { Rss: 10 * MiB, Pss: 8 * MiB } };
    }), conexiones: 'ag016_control|active|2\nag016_demo_01|idle|3', bytesBases: 'ag016_control|100000\nag016_demo_01|200000' });
  }
  datos.cuotasFin.limites[0].iniciadoEn = iso(48 * M + 5000);
  return datos;
}
const evaluar = d => evaluarDatos(d, { sintetico: true });
const tiene = (r, codigo, estado) => r.criterios.some(c => c.codigo === codigo && c.estado === estado)
  || r.problemas.some(c => c.codigo === codigo && c.estado === estado);

test('fixture completo acredita reglas, pero jamás recomienda datos sintéticos', () => {
  const r = evaluar(datosSinteticos());
  assert.equal(r.estado, 'PASS', JSON.stringify(r.problemas));
  assert.equal(r.elegibleParaRecomendacion, false);
  assert.equal(r.tipoDatos, 'SINTETICOS_PRUEBA_OFFLINE');
  assert.equal(r.recursos.reinicios.length, 1);
  assert.equal(r.recursos.reinicios[0].previsto, true);
  assert.equal(r.recursos.jvm.nmt[0].comprometidaBytes, 654321 * 1024);
});
test('ausencia de entradas no produce ceros ni PASS', () => {
  const r = evaluar({}); assert.equal(r.estado, 'INCOMPLETO');
  assert.equal(r.recursos.nominal.proporcionRAM, null); assert.equal(r.recursos.conexionesMaximas, null);
  assert.deepEqual(percentilesCrudos([]), { muestras: 0, validas: 0, invalidas: 0, p50: null, p95: null, p99: null, maximo: null });
});
test('percentiles son crudos, exactos y muestran latencias inválidas', () => {
  assert.equal(percentilesCrudos([...Array(19).fill(100), 5000]).p95, 100);
  const r = percentilesCrudos([null, NaN, -1, 0, 4]); assert.equal(r.invalidas, 3); assert.equal(r.p95, 4);
});
test('65min no se sustituyen por PASS resumido ni por prueba de arnés', () => {
  const d = datosSinteticos(); d.fin.duracionObservadaMs--; assert(tiene(evaluar(d), 'VENTANA_COMPLETA', 'FAIL'));
  d.carga.modo = 'PRUEBA_ARNES_NO_BENCHMARK'; assert(tiene(evaluar(d), 'PASADA_OFICIAL', 'FAIL'));
});
test('nominal exige180 recorridos y no oculta slots perdidos', () => {
  const d = datosSinteticos(); d.carga.recorridos[0].fases.nominal.validos = 59; d.carga.recorridos[0].fases.nominal.omitidosPorSobrecarga = 1;
  const r = evaluar(d); assert(tiene(r, 'RECORRIDOS_NOMINALES', 'FAIL')); assert(tiene(r, 'SLOTS_SIN_SOBRECARGA', 'FAIL'));
});
test('nominal y pico no promedian sus percentiles ni semilla/inducidos', () => {
  const d = datosSinteticos();
  for (const p of d.peticiones) if (p.fase === 'pico' && p.operacion === 'historial') p.ms = 501;
  d.peticiones.push({ operacion: 'inducido-reinicio-salud', fase: 'operaciones', ms: 15000, status: 503, relativaMs: 48 * M, fecha: iso(48 * M + 15000), visitante: 'OPERADOR' });
  const r = evaluar(d); assert(tiene(r, 'LATENCIA_pico_historial', 'FAIL')); assert(tiene(r, 'LATENCIA_nominal_historial', 'PASS'));
  assert(tiene(r, 'HTTP_SIN_INESPERADOS', 'PASS'));
});
test('500 inesperado y ms ausente quedan visibles', () => {
  const d = datosSinteticos(); d.peticiones[10].status = 500; d.peticiones[20].ms = null;
  const r = evaluar(d); assert.equal(r.estado, 'FAIL'); assert.equal(r.evidenciaCompleta, false);
  assert.equal(r.carga.latenciasInvalidas, 1); assert(tiene(r, 'HTTP_SIN_INESPERADOS', 'FAIL'));
});
test('RAM agrega cuatro cgroups y reservaSO sin descontar caché', () => {
  const d = datosSinteticos();
  for (const s of d.recursos[100].servicios) { s.memoriaBytes = 400 * MiB; s.memoria.file = 350 * MiB; s.memoria.inactive_file = 300 * MiB; }
  const r = evaluar(d); assert(tiene(r, 'RAM_NOMINAL', 'FAIL')); assert.equal(r.recursos.nominal.proporcionRAM, (1600 + 256) / 2048);
});
test('hueco y error nominal son incompletos; errores junto al reinicio se separan', () => {
  const d = datosSinteticos(); d.recursos = d.recursos.filter((_, i) => i < 80 || i > 83);
  assert(tiene(evaluar(d), 'COBERTURA_RAM_NOMINAL', 'INCOMPLETO'));
  const e = datosSinteticos(); e.recursos[100] = { fecha: iso(1000000), error: 'inducido por prueba offline' };
  assert(tiene(evaluar(e), 'COBERTURA_RAM_NOMINAL', 'INCOMPLETO'));
  const f = datosSinteticos(); f.recursos[289] = { fecha: iso(2890000), error: 'reinicio simulado' };
  const r = evaluar(f); assert.equal(r.estado, 'PASS', JSON.stringify(r.problemas)); assert.equal(r.recursos.erroresMuestreo[0].cercaReinicioInducido, true);
});
test('OOM, swap y reinicio ajeno al escenario fallan', () => {
  const d = datosSinteticos(); d.recursos[100].servicios[1].eventos.oom_kill = 1; d.recursos[101].servicios[1].swapBytes = 1;
  d.recursos[200].servicios[2].iniciadoEn = iso(2000000);
  const r = evaluar(d); assert(tiene(r, 'SIN_OOM_EN_MUESTRAS', 'FAIL')); assert(tiene(r, 'SIN_SWAP', 'FAIL')); assert(tiene(r, 'REINICIO_INESPERADO', 'FAIL'));
});
test('contador que retrocede sin cambio de iniciadoEn no genera CPU negativa', () => {
  const d = datosSinteticos(); d.recursos[100].servicios[1].cpu.usage_usec = 0;
  const r = evaluar(d); assert(tiene(r, 'CONTADOR_NO_COMPARABLE', 'INCOMPLETO'));
  assert(r.recursos.cpuIO.every(s => s.cpuMediaCores >= 0));
});
test('huellas y cuotas cambiadas impiden comparar versión', () => {
  const d = datosSinteticos(); d.cuotasFin.limites[0].imagen = 'sha256:' + 'f'.repeat(64);
  assert(tiene(evaluar(d), 'CUOTAS_ESTABLES', 'FAIL'));
  d.huellas.fecha = iso(1); assert(tiene(evaluar(d), 'VERSION_SELLADA', 'FAIL'));
});
test('parámetros públicos ausentes o con esquema abierto quedan incompletos sin reproducir valores ajenos', () => {
  for (const cambio of [d => { delete d.huellas.parametros; }, d => { delete d.cuotasFin.parametros; },
    d => { d.huellas.parametros.runtime.cupo = '3'; }, d => { d.huellas.parametros.runtime.espacios[0] = 'fuera_inventario'; },
    d => { d.huellas.parametros.runtime.ajeno = 'valor-ficticio-no-publicable'; }]) {
    const d = datosSinteticos(); cambio(d); const r = evaluar(d);
    assert(tiene(r, 'PARAMETROS_PUBLICOS_ESTABLES', 'INCOMPLETO')); assert.equal(r.evidenciaCompleta, false);
    assert(!JSON.stringify(r).includes('valor-ficticio-no-publicable'));
  }
});
test('parámetros cambiados al cierre o distintos entre runtime y provisión fallan', () => {
  const d = datosSinteticos(); d.cuotasFin.parametros.runtime['peticiones.minuto'] = 241;
  assert(tiene(evaluar(d), 'PARAMETROS_PUBLICOS_ESTABLES', 'FAIL'));
  const e = datosSinteticos(); e.huellas.parametros.provisionador['pool.maximo'] = 4;
  e.cuotasFin.parametros = structuredClone(e.huellas.parametros);
  assert(tiene(evaluar(e), 'PARAMETROS_PUBLICOS_ESTABLES', 'FAIL'));
});
test('orden de claves o espacios no altera la identidad de parámetros', () => {
  const d = datosSinteticos(); d.cuotasFin.parametros.runtime.espacios.reverse();
  d.cuotasFin.parametros.provisionador = Object.fromEntries(Object.entries(d.cuotasFin.parametros.provisionador).reverse());
  assert(tiene(evaluar(d), 'PARAMETROS_PUBLICOS_ESTABLES', 'PASS'));
});
test('NMT sin unidad se interpreta en bytes y separa heap del mismo bloque', () => {
  const d = datosSinteticos(); d.nmt = 'Native Memory Tracking:\nTotal: reserved=8000000, committed=4000000\n- Java Heap (reserved=6000000, committed=3000000)\n';
  const r = evaluar(d); assert.equal(r.recursos.jvm.nmt[0].nativaComprometidaAproximadaBytes, 1000000);
});
test('heap ausente, vacío, ilegible, incoherente o fuera de ventana impide elegibilidad', () => {
  for (const jvm of [null, '', 'texto sin métricas', 'DEMO_METRICAS heap_usada=1',
    `DEMO_METRICAS instante_ms=${T + M} heap_usada=3 heap_comprometida=2 heap_maxima=4`,
    `DEMO_METRICAS instante_ms=${T - M} heap_usada=1 heap_comprometida=2 heap_maxima=4`]) {
    const d = datosSinteticos(); d.jvm = jvm;
    const r = evaluarDatos(d);
    assert(tiene(r, 'EVIDENCIA_HEAP_JVM', 'INCOMPLETO'));
    assert.equal(r.estado, 'INCOMPLETO'); assert.equal(r.evidenciaCompleta, false); assert.equal(r.elegibleParaRecomendacion, false);
  }
});
test('NMT ausente, vacío, parcial o incoherente impide elegibilidad y no inventa nativa', () => {
  for (const nmt of [null, '', 'Native Memory Tracking:\nilegible',
    'Native Memory Tracking:\nTotal: reserved=8000000, committed=4000000',
    'Native Memory Tracking:\nTotal: reserved=8000000, committed=4000000\n- Java Heap (reserved=6000000, committed=5000000)']) {
    const d = datosSinteticos(); d.nmt = nmt;
    const r = evaluarDatos(d);
    assert(tiene(r, 'EVIDENCIA_NATIVA_NMT', 'INCOMPLETO'));
    assert.equal(r.estado, 'INCOMPLETO'); assert.equal(r.evidenciaCompleta, false); assert.equal(r.elegibleParaRecomendacion, false);
    assert(r.recursos.jvm.nmt.every(n => n.nativaComprometidaAproximadaBytes === null));
  }
});
test('una muestra válida no oculta otra JVM o NMT ilegible', () => {
  const d = datosSinteticos(); d.jvm += '\nDEMO_METRICAS heap_usada=1'; d.nmt += '\nNative Memory Tracking:\nilegible';
  const r = evaluar(d);
  assert(tiene(r, 'EVIDENCIA_HEAP_JVM', 'INCOMPLETO')); assert(tiene(r, 'EVIDENCIA_NATIVA_NMT', 'INCOMPLETO'));
});
test('I/O con dispositivo ausente no inventa delta cero ni negativo', () => {
  const d = datosSinteticos(); d.recursos[100].servicios[1].io = [];
  const r = evaluar(d); assert(r.recursos.diferenciasContadores.some(d => d.razon === 'IO_SIN_AMBOS_EXTREMOS'));
  assert(r.recursos.cpuIO.some(s => s.intervalosIoIncompletos > 0));
});
test('registros JSON null y números ausentes no provocan éxito ni excepción', () => {
  const d = datosSinteticos(); d.peticiones[0] = null; d.recursos[80] = null; d.cuotasInicio.limites[0] = null;
  const r = evaluar(d); assert.notEqual(r.estado, 'PASS'); assert.equal(r.evidenciaCompleta, false);
});
test('sello parcial y cuotas sin imagen quedan incompletos', () => {
  const d = datosSinteticos(); d.huellas.archivos.pop(); delete d.cuotasInicio.limites[0].imagen;
  const r = evaluar(d); assert(tiene(r, 'VERSION_SELLADA', 'INCOMPLETO')); assert(tiene(r, 'CUOTAS_ESTABLES', 'INCOMPLETO'));
});
test('identidad cambiada entre última muestra y cierre no se ignora', () => {
  const d = datosSinteticos(); d.cuotasFin.limites[2].iniciadoEn = iso(65 * M - 1000);
  assert(tiene(evaluar(d), 'IDENTIDAD_CAMBIA_TRAS_ULTIMA_MUESTRA', 'INCOMPLETO'));
});
test('matriz vacía, duplicada o sintética no recomienda', () => {
  assert.equal(recomendarPasadas([]).perfilRecomendado, null);
  const r = evaluar(datosSinteticos());
  assert.equal(recomendarPasadas([r, r]).perfilRecomendado, null);
});

test('caducidad sin evento o sin origen monotónico no queda acreditada', () => {
  for (const cambio of [d => { delete d.eventos; }, d => { delete d.inicio.origenMonoMs; },
    d => { d.eventos = d.eventos.filter(e => e.tipo !== 'BARRERA_CADUCIDAD_CONFIRMADA'); }]) {
    const d = datosSinteticos(); cambio(d);
    assert(tiene(evaluar(d), 'CADUCIDAD_PERSISTIDA_B', 'INCOMPLETO'));
  }
});
test('barrera de otra generación, identidad o TTL falla aunque el HTTP sea401', () => {
  for (const cambio of [o => { o.generacion = '16008000-0000-4000-8000-000000000009'; },
    o => { o.identidad.backend = 'f'.repeat(64); }, o => { o.reservadaEn = iso(-2 * M - 1); },
    o => { o.ttlCoherente = false; }, o => { o.expiraEn = iso(58 * M + 1); }]) {
    const d = datosSinteticos(); cambio(d.eventos.find(e => e.tipo === 'OBSERVACION_CADUCIDAD').observacion);
    assert(tiene(evaluar(d), 'CADUCIDAD_PERSISTIDA_B', 'FAIL'));
  }
});
test('comparación microsegundos detecta evento anterior pese al mismo milisegundo', () => {
  const d = datosSinteticos();
  const reserva = d.eventos[0], observacion = d.eventos[1].observacion;
  reserva.expiraEn = '2026-01-01T00:58:00.000501Z';
  Object.assign(observacion, { expiraEn: reserva.expiraEn, reservadaEn: '2025-12-31T23:58:00.000501Z',
    caducadaEn: '2026-01-01T00:58:00.000500Z', retrasoServidorMs: 0 });
  d.eventos[2].ultimaObservacion = structuredClone(observacion);
  assert(tiene(evaluar(d), 'CADUCIDAD_PERSISTIDA_B', 'FAIL'));
});
test('Instant nanosegundos se redondea igual que almacenamiento PostgreSQL', () => {
  const d = datosSinteticos(), reserva = d.eventos[0], observacion = d.eventos[1].observacion;
  reserva.expiraEn = '2026-01-01T00:58:00.000500900Z';
  Object.assign(observacion, { expiraEn: reserva.expiraEn, reservadaEn: '2025-12-31T23:58:00.000501Z',
    caducadaEn: '2026-01-01T00:58:00.000502Z', retrasoServidorMs: .001 });
  d.eventos[2].ultimaObservacion = structuredClone(observacion);
  assert(tiene(evaluar(d), 'CADUCIDAD_PERSISTIDA_B', 'PASS'));
});
test('barrera tardía o límite ampliado no oculta agotamiento de120s', () => {
  for (const cambio of [b => { b.finRelativoMs = b.limiteRelativoMs; }, b => { b.limiteRelativoMs++; },
    b => { b.finRelativoMs = 65 * M; }, b => { b.referenciaRelativaMs--; }]) {
    const d = datosSinteticos(); cambio(d.eventos.find(e => e.tipo === 'BARRERA_CADUCIDAD_CONFIRMADA'));
    assert(tiene(evaluar(d), 'CADUCIDAD_PERSISTIDA_B', 'FAIL'));
  }
});
test('sonda anterior,200o reintentada falla la barrera independiente', () => {
  for (const cambio of [(d, p) => { p.relativaMs = 58 * M; }, (d, p) => { p.status = 200; },
    (d, p) => { d.peticiones.push(structuredClone(p)); }]) {
    const d = datosSinteticos(), p = d.peticiones.find(p => p.operacion === 'inducido-caducidad');
    cambio(d, p); assert(tiene(evaluar(d), 'CADUCIDAD_PERSISTIDA_B', 'FAIL'));
  }
});
test('observación fallida, duplicada o cadena incoherente no se omite', () => {
  for (const cambio of [d => { d.eventos.push({tipo:'OBSERVACION_CADUCIDAD_FALLIDA',visitante:'B'}); },
    d => { d.eventos.push(structuredClone(d.eventos[2])); },
    d => { d.eventos[2].ultimaObservacion.resultado = 'ESPERANDO'; },
    d => { d.eventos[1].inicioRelativoMs = 58 * M - 1; },
    d => { d.eventos[2].observaciones = 2; }]) {
    const d = datosSinteticos(); cambio(d); assert(tiene(evaluar(d), 'CADUCIDAD_PERSISTIDA_B', 'FAIL'));
  }
});
test('cadena ESPERANDO→CADUCADA conserva observaciones privadas sin sumar HTTP', () => {
  const d = datosSinteticos(), primera = d.eventos[1], barrera = d.eventos[2];
  const segunda = structuredClone(primera);
  Object.assign(primera.observacion, { resultado: 'ESPERANDO', caducadaEn: null, posterior: null, retrasoServidorMs: null });
  segunda.inicioRelativoMs = 58 * M + 1500; segunda.finRelativoMs = 58 * M + 1900;
  Object.assign(barrera, { observaciones: 2, finRelativoMs: segunda.finRelativoMs,
    duracionMs: 1800, ultimaObservacion: structuredClone(segunda.observacion) });
  d.eventos.splice(2, 0, segunda);
  d.peticiones.find(p => p.operacion === 'inducido-caducidad').relativaMs = 58 * M + 2000;
  const r = evaluar(d);
  assert(tiene(r, 'CADUCIDAD_PERSISTIDA_B', 'PASS')); assert(tiene(r, 'PETICIONES_NOMINALES', 'PASS'));
});
test('selección lógica exige dosPASS por perfil y comparabilidad de las cuatro pasadas', () => {
  // Simula exclusivamente metadatos del selector; no se guarda ni presenta como recomendación real.
  const original = evaluar(datosSinteticos());
  const res = ['a1', 'a2', 'b1', 'b2'].map(p => ({ ...structuredClone(original), ejecucion: `sintetico-${p}`, perfil: p[0].toUpperCase(),
    tipoDatos: 'EVIDENCIA_PASADA', elegibleParaRecomendacion: true, versionEvaluador: VERSION }));
  assert.equal(recomendarPasadas(res).perfilCandidato, 'A');
  assert.equal(recomendarPasadas(res).perfilRecomendado, null);
  assert.equal(recomendarPasadas(res).estado, 'CANDIDATO_LOCAL_PENDIENTE_REVISION');
  assert(recomendarPasadas(res).pendientes.some(p => p.includes('CPU')));
  res[0].estado = 'FAIL'; res[0].elegibleParaRecomendacion = false;
  assert.equal(recomendarPasadas(res).perfilCandidato, 'B');
  const diferentes = structuredClone(res); diferentes[2].comparabilidad.parametros.runtime['pool.maximo'] = 4;
  assert.equal(recomendarPasadas(diferentes).perfilCandidato, null);
  const ausentes = structuredClone(res); delete ausentes[2].comparabilidad.parametros;
  assert.equal(recomendarPasadas(ausentes).perfilCandidato, null);
  res[2].comparabilidad.imagenes.backend = 'diferente'; assert.equal(recomendarPasadas(res).perfilCandidato, null);
});
