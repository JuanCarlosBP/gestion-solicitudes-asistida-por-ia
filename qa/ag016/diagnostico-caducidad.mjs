import { config, identidad, docker, sql, guardar, exigirSinCarga } from './laboratorio.mjs';

// Lecturas posteriores a la ventana: no alteran reservas ni relojes del host.
exigirSinCarga();
const nombre = process.env.AG016_EJECUCION;
if (!nombre || !/^[a-z0-9-]+$/.test(nombre)) throw Error('Ejecución nueva obligatoria.');
const inicio = new Date().toISOString();
const eventos = sql('ag016_control', `
SELECT r.espacio, r.instante AS reservada_utc,
 r.instante + interval '60 minutes' AS vencimiento_teorico_utc,
 min(e.instante) FILTER (WHERE e.tipo='CADUCADA') AS caducada_utc,
 min(e.instante) FILTER (WHERE e.tipo='DRENADA') AS drenada_utc
FROM demo.eventos r LEFT JOIN demo.eventos e
 ON e.espacio=r.espacio AND e.generacion=r.generacion AND e.instante>=r.instante
WHERE r.tipo='RESERVADA'
 AND r.instante BETWEEN '2026-10-16T12:23:20Z'::timestamptz AND '2026-10-16T12:23:40Z'::timestamptz
GROUP BY r.espacio,r.instante ORDER BY r.instante;`);
const estados = sql('ag016_control', 'SELECT id,estado,expira_en FROM demo.espacios ORDER BY id;');
const relojes = [];
for (let repeticion = 1; repeticion <= 5; repeticion++) {
  for (const servicio of ['backend', 'postgres']) {
    const i = identidad(servicio);
    if (i.estado !== 'running') throw Error('Servicio no disponible para lectura.');
    const args = servicio === 'backend' ? ['date', '-u', '+%s%3N']
      : ['psql', '--no-psqlrc', '-U', 'ag016_provision', '-d', 'ag016_control', '-v', 'ON_ERROR_STOP=1', '-tA',
        '-c', 'SELECT (extract(epoch FROM clock_timestamp())*1000)::numeric(20,3);'];
    const antes = Date.now(), mono = performance.now();
    const salida = docker(['exec', '-i', i.id, ...args], { stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const despues = Date.now(), duracionMs = performance.now() - mono;
    if (!/^\d+(?:\.\d+)?$/.test(salida)) throw Error('Respuesta de reloj no válida.');
    const servidor = Number(salida);
    relojes.push({ repeticion, servicio, id: i.id, antesUTC: new Date(antes).toISOString(),
      despuesUTC: new Date(despues).toISOString(), servidorEpochMs: servidor, duracionMs,
      offsetMinimoMs: servidor - despues, offsetMaximoMs: servidor - antes });
  }
}
guardar(nombre + '/resultado.json', { inicio, fin: new Date().toISOString(), tipo: 'DIAGNOSTICO_SOLO_LECTURA',
  proyecto: config.proyecto, pasada: 'carga-final-a1', eventos, estados, relojes,
  limite: 'Los intervalos de desfase corresponden a estas lecturas posteriores, no reconstruyen exactamente el reloj en una sonda pasada. date usa el reloj del contenedor; los eventos RESERVADA/CADUCADA contienen Instant del backend.' });
console.log(JSON.stringify({ evidencia: nombre, lecturasReloj: relojes.length, escrituraBases: false,
  offsets: relojes.map(({ servicio, offsetMinimoMs, offsetMaximoMs }) => ({ servicio, offsetMinimoMs, offsetMaximoMs })) }));
