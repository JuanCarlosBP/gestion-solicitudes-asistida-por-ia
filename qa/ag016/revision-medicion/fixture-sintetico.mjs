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

export function datosSinteticos() {
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
