import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { prepararDirectorioEvidencias, raizProyecto } from './rutas-evidencia.mjs';

// Alternativa explícita a npm audit: no contacta el registro ni envía inventarios.
// No representa un resultado de npm audit y tiene la cobertura del volcado OSV.
const directorio = prepararDirectorioEvidencias();
const lock = JSON.parse(readFileSync(resolve(raizProyecto, 'frontend/package-lock.json'), 'utf8'));
const cache = resolve(raizProyecto, 'tmp/osv-cache');
const ejecutable = resolve(raizProyecto, 'tmp/herramientas', process.platform === 'win32' ? 'osv-scanner.exe' : 'osv-scanner');
if (!existsSync(ejecutable) || !existsSync(resolve(cache, 'osv-scalibr/npm/all.zip'))) {
  throw new Error('Se requiere OSV-Scanner 2.7.0 y el volcado público npm completo descargado en tmp.');
}
const resultados = [];
for (const alcance of ['produccion', 'completo']) {
  const componentes = new Map();
  for (const [ruta, paquete] of Object.entries(lock.packages)) {
    if (!ruta || !paquete.version || (alcance === 'produccion' && paquete.dev)) continue;
    const nombreCompleto = paquete.name || ruta.slice(ruta.lastIndexOf('node_modules/') + 13);
    const partes = nombreCompleto.split('/');
    const nombre = partes.at(-1);
    const grupo = partes.length === 2 ? partes[0] : undefined;
    const purl = `pkg:npm/${grupo ? encodeURIComponent(grupo) + '/' : ''}${encodeURIComponent(nombre)}@${paquete.version}`;
    componentes.set(purl, { type: 'library', group: grupo, name: nombre, version: paquete.version, purl });
  }
  const sbom = resolve(directorio, `npm-${alcance}.cdx.json`);
  writeFileSync(sbom, JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.6', version: 1, components: [...componentes.values()] }, null, 2) + '\n');
  const proceso = spawnSync(ejecutable, ['scan', 'source', '--offline', '--no-resolve', '--no-ignore',
    '--x-no-default-plugins', '--x-plugins=sbom', '-L', sbom, '--format=json', '--all-packages',
    '--output-file', resolve(directorio, `npm-${alcance}-osv.json`)], {
    cwd: raizProyecto, encoding: 'utf8', windowsHide: true,
    env: { ...process.env, OSV_SCANNER_LOCAL_DB_CACHE_DIRECTORY: cache },
  });
  writeFileSync(resolve(directorio, `npm-${alcance}-osv.log`), `${proceso.stdout || ''}${proceso.stderr || ''}`);
  resultados.push({ alcance, componentes: componentes.size, salida: proceso.status, errorEjecucion: Boolean(proceso.error) });
  console.log(`OSV npm ${alcance}: ${componentes.size} componentes; salida ${proceso.status}; modo offline.`);
  if (proceso.status !== 0 || proceso.error) process.exitCode = 1;
}
writeFileSync(resolve(directorio, 'npm-offline-resumen.json'), JSON.stringify({ fecha: new Date().toISOString(),
  herramienta: 'OSV-Scanner 2.7.0', inventarioEnviado: false, resultados,
  limites: 'No equivale a npm audit. Cobertura de vulnerabilidades publicadas en el volcado local OSV; sin CVE desconocidas ni análisis de código. Producción excluye entradas dev del lockfile.' }, null, 2) + '\n');
