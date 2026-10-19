import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { argumentosCompose, ejecutarDockerSync as execFileSync } from './docker-contexto.mjs';
import { prepararDirectorioEvidencias, raizProyecto } from './rutas-evidencia.mjs';

// Solo el volumen ficticio local. Se guardan conteos/huellas, nunca filas sensibles.
const modo = process.argv[2];
const compose = argumentosCompose();
if (!['antes', 'despues'].includes(modo)) throw new Error('Usar antes o despues.');
const evidencia = prepararDirectorioEvidencias();
const sql = (consulta) => execFileSync('docker', [...compose, 'exec', '-T', 'postgres', 'psql',
  '-U', 'administrador_local', '-d', 'gestion', '-v', 'ON_ERROR_STOP=1', '-tAc', consulta],
{ cwd: raizProyecto, windowsHide: true, timeout: 15000, encoding: 'utf8' }).trim();
const historial = JSON.parse(sql(`SELECT json_agg(row_to_json(h) ORDER BY installed_rank) FROM
  (SELECT installed_rank,version,checksum,success FROM gestion.flyway_schema_history) h`));
const tablasPermitidas = ['usuarios', 'usuarios_roles', 'proveedores', 'solicitudes',
  'conceptos_solicitud', 'operaciones_idempotentes_solicitud', 'decisiones_solicitud'];
const antes = modo === 'despues' ? JSON.parse(readFileSync(resolve(evidencia, 'v6-datos-antes.json'), 'utf8')) : null;
const columnas = {}, tablas = {};
for (const tabla of tablasPermitidas) {
  columnas[tabla] = antes?.columnas[tabla] || JSON.parse(sql(`SELECT json_agg(column_name ORDER BY ordinal_position)
    FROM information_schema.columns WHERE table_schema='gestion' AND table_name='${tabla}'`));
  if (!columnas[tabla]?.length || columnas[tabla].some((c) => !/^[a-z_]+$/.test(c)))
    throw new Error('Columnas de referencia no válidas.');
  // La proyección explícita conserva TODAS las columnas originales, incluso hash/resultados.
  const proyeccion = columnas[tabla].map((c) => `"${c}"`).join(',');
  tablas[tabla] = JSON.parse(sql(`SELECT json_build_object('filas',count(*),'huella',
    md5(COALESCE(string_agg(md5(to_jsonb(t)::text),'' ORDER BY to_jsonb(t)::text),'')))
    FROM (SELECT ${proyeccion} FROM gestion.${tabla}) t`));
}
const estado = { fecha: new Date().toISOString(), modo, historial, columnas, tablas };
if (modo === 'antes') {
  if (historial.length !== 5 || historial.some((h) => !h.success)) throw new Error('Se requieren V1–V5 válidas.');
  writeFileSync(resolve(evidencia, 'v6-datos-antes.json'), JSON.stringify(estado, null, 2) + '\n');
  console.log('PASS: referencia V1–V5 y siete tablas preservada sin registrar filas.');
} else {
  estado.controles = {
    migracionesAnteriores: JSON.stringify(historial.slice(0, 5)) === JSON.stringify(antes.historial),
    v6Aplicada: historial.length === 6 && historial[5].version === '6' && historial[5].success,
    datosConservados: JSON.stringify(tablas) === JSON.stringify(antes.tablas),
  };
  estado.tamanoRegistroBytes = Number(sql("SELECT pg_total_relation_size('gestion.operaciones_idempotentes_solicitud')"));
  estado.resultado = Object.values(estado.controles).every(Boolean) ? 'PASS' : 'FAIL';
  writeFileSync(resolve(evidencia, 'v6-datos-despues.json'), JSON.stringify(estado, null, 2) + '\n');
  console.log(`${estado.resultado}: V5→V6, siete tablas y todas sus columnas heredadas; ${estado.tamanoRegistroBytes} bytes de registro e índices.`);
  process.exitCode = estado.resultado === 'PASS' ? 0 : 1;
}
