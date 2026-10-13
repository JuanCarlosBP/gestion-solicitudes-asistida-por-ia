import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { prepararDirectorioEvidencias } from './rutas-evidencia.mjs';

const raiz = resolve(import.meta.dirname, '..');
const directorio = prepararDirectorioEvidencias();
console.log(`Evidencias de auditoría: ${directorio}`);
const origen = resolve(raiz, 'backend/target/dependencias.txt');
const componentes = [];
for (const linea of readFileSync(origen, 'utf8').split(/\r?\n/)) {
  const coordenada = /^\s*([\w.-]+):([\w.-]+):jar:([^:\s]+):(compile|runtime|test|provided)/.exec(linea);
  if (coordenada) {
    const [, grupo, nombre, version] = coordenada;
    componentes.push({ type: 'library', group: grupo, name: nombre, version, purl: `pkg:maven/${grupo}/${nombre}@${version}` });
  }
}
if (!componentes.length) throw new Error('No hay dependencias Maven que auditar.');
const sbom = resolve(directorio, 'maven.cdx.json');
writeFileSync(sbom, JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.6', version: 1, components: componentes }, null, 2) + '\n');
const cache = resolve(raiz, 'tmp/osv-cache');
const ejecutable = resolve(raiz, 'tmp/herramientas', process.platform === 'win32' ? 'osv-scanner.exe' : 'osv-scanner');
if (!existsSync(ejecutable) || !existsSync(resolve(cache, 'osv-scalibr/Maven/all.zip'))) {
  throw new Error('Prepara OSV-Scanner 2.7.0 y el volcado público Maven según docs/documentaciondev/entorno.md.');
}
// --offline prohíbe cualquier comunicación; solo se compara con el volcado local.
// El archivo exacto y los plugins limitados evitan recorrer o consultar Git.
const proceso = spawnSync(ejecutable, ['scan', 'source', '--offline', '--no-resolve', '--no-ignore',
  '--x-no-default-plugins', '--x-plugins=sbom', '-L', sbom,
  '--format=json', '--all-packages', '--output-file', resolve(directorio, 'maven-osv.json')],
  { cwd: raiz, stdio: 'inherit', env: { ...process.env, OSV_SCANNER_LOCAL_DB_CACHE_DIRECTORY: cache } });
if (proceso.error) throw proceso.error;
console.log(`Inventario local: ${componentes.length} componentes; auditoría sin envío de metadatos.`);
process.exitCode = proceso.status ?? 2;
