import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { prepararDirectorioEvidencias, raizProyecto } from './rutas-evidencia.mjs';

const evidencia = prepararDirectorioEvidencias();
const baseline = resolve(raizProyecto, 'qa/evidencias/ag013');
const leer = (nombre) => JSON.parse(readFileSync(resolve(baseline, nombre), 'utf8').replace(/^\uFEFF/, ''));
const sha = (datos) => createHash('sha256').update(datos).digest('hex').toUpperCase();
const entrada = leer('huellas-entrada.json');
const historicos = leer('huellas-historicas-incluye-ignorados.json');
const inicial = new Map([...entrada, ...historicos].map((a) => [a.ruta, a.sha256.toUpperCase()]));
const protegido = (ruta) => /^qa\/evidencias\/ag(?:00[3-9]|01[0-2])\//.test(ruta)
  || /^docs\/trazabilidad\/(?:AG-00[3-9]|AG-01[0-2]|REV-001)/.test(ruta)
  || /^docs\/decisiones\/ADR-000[1-6]-/.test(ruta)
  || /^especificaciones\/00[1-5]-/.test(ruta)
  || /^backend\/src\/main\/resources\/db\/migration\/V[1-5]__/.test(ruta);
const protegidos = [...inicial].filter(([ruta]) => protegido(ruta)).map(([ruta, sha256]) => ({ ruta, sha256,
  observado: existsSync(resolve(raizProyecto, ruta)) ? sha(readFileSync(resolve(raizProyecto, ruta))) : null }));
const alterados = protegidos.filter((a) => a.sha256 !== a.observado);
const prefijo = readFileSync(resolve(baseline, 'ejecuciones-entrada.csv'));
const csv = readFileSync(resolve(raizProyecto, 'docs/trazabilidad/ejecuciones-agentes.csv'));
const prefijoConservado = csv.subarray(0, prefijo.length).equals(prefijo);
const excluir = new Set(['.git', 'node_modules', 'tmp', 'temp', 'target', 'dist', '.angular', 'test-results', 'playwright-report', 'coverage']);
const autogenerados = new Set(['entrega-manifiesto.json', 'entrega-integridad.json', 'fuentes-finales.json', 'manifiesto-commits.json']);
const archivos = [];
function recorrer(directorio) {
  for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
    if (excluir.has(entrada.name) || /^\.env(?:$|\.(?!example$))/.test(entrada.name)) continue;
    if (entrada.isSymbolicLink()) throw new Error('No seguir enlaces en manifiesto.');
    const absoluto = resolve(directorio, entrada.name);
    if (entrada.isDirectory()) { recorrer(absoluto); continue; }
    const ruta = relative(raizProyecto, absoluto).replaceAll('\\', '/');
    if (ruta.startsWith('qa/evidencias/ag013/') && autogenerados.has(entrada.name)) continue;
    if (/\.(?:pem|key|p12|pfx|keystore)$/.test(ruta)) continue;
    if (ruta.endsWith('.log') && !ruta.startsWith('qa/evidencias/')) continue;
    const contenido = readFileSync(absoluto);
    archivos.push({ ruta, bytes: contenido.length, sha256: sha(contenido) });
  }
}
recorrer(raizProyecto);
archivos.sort((a, b) => a.ruta.localeCompare(b.ruta));
const rutas = new Set(archivos.map((a) => a.ruta));
const creados = archivos.filter((a) => !inicial.has(a.ruta));
const modificados = archivos.filter((a) => inicial.has(a.ruta) && inicial.get(a.ruta) !== a.sha256);
const eliminados = [...inicial.keys()].filter((ruta) => !rutas.has(ruta));
const fecha = new Date().toISOString();
const guardar = (nombre, valor) => writeFileSync(resolve(evidencia, nombre), JSON.stringify(valor, null, 2) + '\n');
const salidasAutogeneradas = [...autogenerados].map((n) => `qa/evidencias/ag013/${n}`);
guardar('entrega-integridad.json', { fecha, protegidos: protegidos.length, alterados,
  prefijoCsvBytes: prefijo.length, prefijoCsvConservado: prefijoConservado,
  resultado: alterados.length || !prefijoConservado ? 'FAIL' : 'PASS' });
guardar('entrega-manifiesto.json', { fecha, creados, modificados, eliminados, salidasAutogeneradas,
  limite: 'Comparación SHA256 desde capturas AG013; incluye suplemento histórico ignorado. No representa un diff Git.' });
guardar('fuentes-finales.json', { fecha, archivos: archivos.filter((a) =>
  /^(?:backend|frontend|infraestructura|qa)\//.test(a.ruta) && !a.ruta.startsWith('qa/evidencias/') || a.ruta === '.github/workflows/ci.yml') });
const pendientes = new Set([...creados, ...modificados].map((a) => a.ruta).concat(salidasAutogeneradas));
// El log ya existía: debe incluirse con sus bytes originales, no reescribirse.
pendientes.add('qa/evidencias/ag011/backend-verify-final.log');
const grupos = [
  ['fix: incluir evidencia histórica enlazada en CI', (r) => r === '.gitignore' || r === 'qa/evidencias/ag011/backend-verify-final.log' || /ag013\/ci-(?:remota|heredada)/.test(r)],
  ['docs: aprobar contrato transversal de idempotencia006', (r) => r.startsWith('especificaciones/006-') || r.includes('ADR-0007')],
  ['feat: coordinar operaciones y preservar replays con V6', (r) => r.startsWith('backend/')],
  ['feat: recuperar operaciones seguras entre pestañas', (r) => r.startsWith('frontend/')],
  ['test: verificar concurrencia y recuperación en CI', (r) => r.startsWith('.github/') || r.startsWith('qa/') && !r.startsWith('qa/evidencias/')],
  ['docs: registrar evidencias y cierre AG013', () => true],
];
guardar('manifiesto-commits.json', { fecha, operacionesGit: ['git status --short, lectura inicial antes de conocer prohibición'],
  cambiosGitEjecutados: false, grupos: grupos.map(([mensajeSugerido, seleccionar]) => {
    const seleccionados = [...pendientes].filter(seleccionar); seleccionados.forEach((r) => pendientes.delete(r));
    return { mensajeSugerido, archivos: seleccionados };
  }), nota: 'Propuesta para selección, commit y push humanos. Sin integración ni publicación por el agente.' });
console.log(`${alterados.length || !prefijoConservado ? 'FAIL' : 'PASS'}: ${protegidos.length} protegidos, ${alterados.length} alterados; prefijoCSV ${prefijoConservado}; ${creados.length} creados/${modificados.length} modificados/${eliminados.length} eliminados.`);
process.exitCode = alterados.length || !prefijoConservado ? 1 : 0;
