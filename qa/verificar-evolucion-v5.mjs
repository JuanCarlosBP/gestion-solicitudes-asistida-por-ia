import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { argumentosCompose, ejecutarDockerSync as execFileSync } from './docker-contexto.mjs';
import { prepararDirectorioEvidencias, raizProyecto } from './rutas-evidencia.mjs';

// Lectura del volumen ficticio: nunca imprime filas, hashes de contraseña o configuración.
const modo = process.argv[2];
const compose = argumentosCompose();
if (!['antes', 'despues'].includes(modo)) throw new Error('Usar antes o despues.');
if (modo === 'despues') {
  const base = new URL(process.env.BASE_URL);
  if (base.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
    || base.username || base.password || base.search || base.hash || base.pathname !== '/')
    throw new Error('BASE_URL de QA debe ser HTTP loopback explícito.');
  const salud = await fetch(new URL('/api/salud', base), { signal: AbortSignal.timeout(10000) });
  if (salud.status !== 200) throw new Error('Esperar al arranque completo del backend antes de capturar V5.');
}
const evidencia = prepararDirectorioEvidencias();
const sql = (consulta) => execFileSync('docker', [...compose, 'exec', '-T', 'postgres', 'psql',
  '-U', 'administrador_local', '-d', 'gestion', '-v', 'ON_ERROR_STOP=1', '-tAc', consulta],
{ cwd: raizProyecto, windowsHide: true, timeout: 15000, encoding: 'utf8' }).trim();
const historial = JSON.parse(sql(`SELECT json_agg(row_to_json(h) ORDER BY installed_rank) FROM
  (SELECT installed_rank, version, checksum, success FROM gestion.flyway_schema_history) h`));
const tablas = {};
for (const tabla of ['usuarios', 'usuarios_roles', 'proveedores', 'solicitudes', 'conceptos_solicitud', 'operaciones_idempotentes_solicitud']) {
  const fila = tabla === 'operaciones_idempotentes_solicitud'
    ? "to_jsonb(t) - 'resultado_decidido_en'" : 'to_jsonb(t)';
  tablas[tabla] = JSON.parse(sql(`SELECT json_build_object('filas',count(*),'huella',
    md5(COALESCE(string_agg(md5((${fila})::text), '' ORDER BY (${fila})::text),''))) FROM gestion.${tabla} t`));
}
const estado = { fecha: new Date().toISOString(), modo, historial, tablas };
if (modo === 'antes') {
  if (historial.length !== 4 || historial.some((h) => !h.success)) throw new Error('Se requieren V1–V4 válidas antes de aplicar V5.');
  writeFileSync(resolve(evidencia, 'v5-datos-antes.json'), JSON.stringify(estado, null, 2) + '\n');
  console.log('PASS: referencia de seis tablas y V1–V4 conservada sin filas ni credenciales.');
} else {
  const antes = JSON.parse(readFileSync(resolve(evidencia, 'v5-datos-antes.json'), 'utf8'));
  estado.controles = {
    migracionesAnteriores: JSON.stringify(historial.slice(0, 4)) === JSON.stringify(antes.historial),
    v5Aplicada: historial.length === 5 && historial[4].version === '5' && historial[4].success,
    datosConservados: JSON.stringify(tablas) === JSON.stringify(antes.tablas),
    eventosInicialesVacios: sql('SELECT count(*) FROM gestion.decisiones_solicitud') === '0',
    resultadosAnterioresSinDecision: sql('SELECT count(*) FROM gestion.operaciones_idempotentes_solicitud WHERE resultado_decidido_en IS NOT NULL') === '0',
  };
  estado.resultado = Object.values(estado.controles).every(Boolean) ? 'PASS' : 'FAIL';
  writeFileSync(resolve(evidencia, 'v5-datos-despues.json'), JSON.stringify(estado, null, 2) + '\n');
  console.log(`${estado.resultado}: evolución del volumen ficticio V4→V5; seis tablas y checksums previos comprobados.`);
  process.exitCode = estado.resultado === 'PASS' ? 0 : 1;
}
