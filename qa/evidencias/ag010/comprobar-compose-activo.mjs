import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ejecutar = promisify(execFile);
const raiz = resolve(import.meta.dirname, '../../..');
const compose = ['compose', '--env-file', 'infraestructura/.env.example', '-f', 'infraestructura/compose.yaml'];
const comando = async (argumentos) => (await ejecutar('docker', [...compose, ...argumentos], {
  cwd: raiz, windowsHide: true, timeout: 20000, maxBuffer: 8 * 1024 * 1024,
})).stdout;
const consulta = (sql) => comando(['exec', '-T', 'postgres', 'psql', '-U', 'administrador_local', '-d', 'gestion', '-tAc', sql]);
const esperado = { log_error_verbosity: 'terse', log_min_error_statement: 'panic',
  log_parameter_max_length_on_error: '0', log_statement: 'none',
  log_min_duration_statement: '-1', log_min_duration_sample: '-1', log_line_prefix: '%m [%p] %e ' };
const configuracion = JSON.parse(await consulta(`SELECT json_object_agg(name, setting) FROM pg_settings WHERE name IN (${Object.keys(esperado).map((nombre) => `'${nombre}'`).join(',')})`));
const configuracionCorrecta = Object.entries(esperado).every(([nombre, valor]) => configuracion[nombre] === valor);
const almacenamiento = JSON.parse(await consulta(`SELECT json_build_object(
  'usuarios', (SELECT count(*) FROM gestion.usuarios),
  'usuariosConArgon2id', (SELECT count(*) FROM gestion.usuarios WHERE clave_hash LIKE '$argon2id$%'),
  'roles', (SELECT count(*) FROM gestion.roles),
  'tokensSinHashSha256', (SELECT count(*) FROM gestion.tokens_refresco WHERE octet_length(secreto_hash) <> 32),
  'migraciones', (SELECT json_agg(version ORDER BY installed_rank) FROM gestion.flyway_schema_history WHERE success))`));
const patrones = [
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  /\$argon2id\$v=\d+\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]{12,}\$[A-Za-z0-9+/]{20,}/,
  /[a-f0-9-]{36}\.[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/i,
  /-----BEGIN (?:RSA )?PRIVATE KEY-----\s+[A-Za-z0-9+/=\s]{80,}/,
];
const registros = [];
for (const servicio of ['postgres', 'backend', 'frontend']) {
  // Inspección solo en memoria: no conservar logs potencialmente sensibles.
  const contenido = await comando(['logs', '--no-color', servicio]);
  registros.push({ servicio, bytesExaminados: Buffer.byteLength(contenido), coincidencia: patrones.some((patron) => patron.test(contenido)) });
}
const correcto = configuracionCorrecta && almacenamiento.usuarios === 4
  && almacenamiento.usuariosConArgon2id === 4 && almacenamiento.roles === 4
  && almacenamiento.tokensSinHashSha256 === 0 && JSON.stringify(almacenamiento.migraciones) === '["1","2"]'
  && registros.every((registro) => !registro.coincidencia);
writeFileSync(resolve(import.meta.dirname, 'compose-configuracion-efectiva.json'), JSON.stringify({
  fecha: new Date().toISOString(), resultado: correcto ? 'PASS' : 'FAIL', configuracionCorrecta,
  configuracion, almacenamiento, registros,
  limite: 'Lectura local de ajustes, agregados y logs; nunca conserva hashes ni tokens. Búsqueda acotada, no garantía universal.',
}, null, 2) + '\n');
console.log(`${correcto ? 'PASS' : 'FAIL'}: configuración efectiva, almacenamiento agregado y registros sin valores sensibles reconocibles.`);
if (!correcto) process.exitCode = 1;
