import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';

// Comparación reproducible por contenido; no consulta ni ejecuta Git.
const raiz = resolve(import.meta.dirname, '../../..');
const salida = import.meta.dirname;
const excluidos = new Set(['.git', 'tmp', 'temp', 'node_modules', 'target', 'dist', '.angular', 'test-results', 'playwright-report']);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const json = (ruta) => JSON.parse(readFileSync(ruta, 'utf8').replace(/^\uFEFF/, ''));
const entrada = json(resolve(salida, 'huellas-iniciales.json'));
const iniciales = new Map(entrada.map((f) => [f.ruta, f.sha256]));
const finales = new Map();
function recorrer(directorio) {
  for (const archivo of readdirSync(directorio, { withFileTypes: true })) {
    if (excluidos.has(archivo.name)) continue;
    const ruta = resolve(directorio, archivo.name);
    if (archivo.isDirectory()) recorrer(ruta);
    else {
      const nombre = relative(raiz, ruta).replaceAll('\\', '/');
      if (!nombre.startsWith('qa/evidencias/ag010/')) finales.set(nombre, hash(readFileSync(ruta)));
    }
  }
}
recorrer(raiz);
const creados = [];
const modificados = [];
const eliminados = [];
for (const [ruta, sha256] of finales) {
  if (!iniciales.has(ruta)) creados.push({ ruta, sha256 });
  else if (iniciales.get(ruta) !== sha256) modificados.push({ ruta, antes: iniciales.get(ruta), sha256 });
}
for (const [ruta, sha256] of iniciales) if (!finales.has(ruta)) eliminados.push({ ruta, sha256 });
const protegido = (ruta) => /^qa\/evidencias\/ag00[3-9]\//.test(ruta)
  || /^docs\/trazabilidad\/(?:AG-00[3-9]|REV-001)/.test(ruta)
  || /^docs\/decisiones\/ADR-000[12]/.test(ruta)
  || ruta === 'backend/src/main/resources/db/migration/V1__preparar_esquema_tecnico.sql'
  || ruta.startsWith('.agents/') || ruta.startsWith('.codex/');
const historicos = entrada.filter(({ ruta }) => protegido(ruta));
const alterados = historicos.filter(({ ruta, sha256 }) => finales.get(ruta) !== sha256).map(({ ruta }) => ruta);
const prefijo = json(resolve(salida, 'csv-prefijo-inicial.json'));
const csv = readFileSync(resolve(raiz, 'docs/trazabilidad/ejecuciones-agentes.csv'));
const prefijoConservado = csv.length >= prefijo.bytes && hash(csv.subarray(0, prefijo.bytes)) === prefijo.sha256;
const fuentes = [...finales].filter(([ruta]) => /^(?:backend|frontend|infraestructura|qa)\//.test(ruta)
  && !ruta.startsWith('qa/evidencias/')).map(([ruta, sha256]) => ({ ruta, sha256 }));
const fecha = new Date().toISOString();
writeFileSync(resolve(salida, 'entrega-manifiesto.json'), JSON.stringify({ fecha, creados, modificados, eliminados,
  evidenciaNueva: 'qa/evidencias/ag010/; inventario separado para evitar referencias circulares',
  sinOperacionesGit: 'No se ejecuta Git en este verificador. Incidencia inicial documentada en AG-010.' }, null, 2) + '\n');
writeFileSync(resolve(salida, 'entrega-integridad.json'), JSON.stringify({ fecha, historicosComprobados: historicos.length,
  alterados, prefijoCsvBytes: prefijo.bytes, prefijoCsvConservado: prefijoConservado,
  resultado: alterados.length || !prefijoConservado ? 'FAIL' : 'PASS' }, null, 2) + '\n');
writeFileSync(resolve(salida, 'fuentes-verificadas.json'), JSON.stringify({ fecha, archivos: fuentes }, null, 2) + '\n');
console.log(`Fuentes: ${creados.length} nuevos, ${modificados.length} modificados, ${eliminados.length} eliminados. Históricos: ${historicos.length}, alterados: ${alterados.length}; CSV: ${prefijoConservado}.`);
if (alterados.length || !prefijoConservado) process.exitCode = 1;
