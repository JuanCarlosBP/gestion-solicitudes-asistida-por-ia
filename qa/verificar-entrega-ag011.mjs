import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { prepararDirectorioEvidencias, raizProyecto } from './rutas-evidencia.mjs';

// Manifiesto de esta ejecución sin consultar Git. Fuentes iniciales y protegidos
// se capturaron antes de implementar; no demuestran historia previa a la captura.
const evidencia = prepararDirectorioEvidencias();
const baseline = resolve(raizProyecto, 'qa/evidencias/ag011');
const leerJson = (nombre) => JSON.parse(readFileSync(resolve(baseline, nombre), 'utf8').replace(/^\uFEFF/, ''));
const sha = (contenido) => createHash('sha256').update(contenido).digest('hex').toUpperCase();
const historicos = leerJson('historicos-inicial.json');
const inicial = new Map([...leerJson('manifiesto-inicial.json'), ...historicos].map((a) => [a.ruta, a.sha256]));
const protegidos = historicos.map((a) => ({ ...a, observado: existsSync(resolve(raizProyecto, a.ruta))
  ? sha(readFileSync(resolve(raizProyecto, a.ruta))) : null }));
const alterados = protegidos.filter((a) => a.sha256 !== a.observado);
const prefijo = readFileSync(resolve(baseline, 'registro-entrada.csv'));
const csvActual = readFileSync(resolve(raizProyecto, 'docs/trazabilidad/ejecuciones-agentes.csv'));
const prefijoCsvConservado = csvActual.subarray(0, prefijo.length).equals(prefijo);
const excluir = new Set(['.git', 'node_modules', 'tmp', 'temp', 'target', 'dist', '.angular',
  'test-results', 'playwright-report', 'coverage']);
const propias = new Set(['entrega-manifiesto.json', 'entrega-integridad.json', 'fuentes-finales.json', 'manifiesto-commits.json']);
const archivos = [];
function recorrer(directorio) {
  for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
    if (excluir.has(entrada.name) || entrada.name === '.env' || /^\.env\.(?!example$)/.test(entrada.name)) continue;
    const absoluto = resolve(directorio, entrada.name);
    if (entrada.isSymbolicLink()) throw new Error('No se siguen enlaces al generar manifiesto.');
    if (entrada.isDirectory()) { recorrer(absoluto); continue; }
    const ruta = relative(raizProyecto, absoluto).replaceAll('\\', '/');
    if (ruta.startsWith('qa/evidencias/ag011/') && propias.has(entrada.name)) continue;
    if (entrada.name.endsWith('.log') && !ruta.startsWith('qa/evidencias/')) continue;
    const contenido = readFileSync(absoluto);
    archivos.push({ ruta, bytes: contenido.length, sha256: sha(contenido) });
  }
}
recorrer(raizProyecto);
archivos.sort((a, b) => a.ruta.localeCompare(b.ruta));
const rutasActuales = new Set(archivos.map((a) => a.ruta));
const modificados = archivos.filter((a) => inicial.has(a.ruta) && inicial.get(a.ruta) !== a.sha256);
const creados = archivos.filter((a) => !inicial.has(a.ruta));
const eliminados = [...inicial.keys()].filter((ruta) => !rutasActuales.has(ruta));
const fecha = new Date().toISOString();
const salidasAutogeneradas = [...propias].map((nombre) => `qa/evidencias/ag011/${nombre}`);
const fuentes = archivos.filter((a) => /^(?:backend|frontend|infraestructura|qa)\//.test(a.ruta)
  && !a.ruta.startsWith('qa/evidencias/') || a.ruta === '.github/workflows/ci.yml');
const escribir = (nombre, valor) => writeFileSync(resolve(evidencia, nombre), JSON.stringify(valor, null, 2) + '\n');
escribir('entrega-manifiesto.json', { fecha, creados, modificados, eliminados, salidasAutogeneradas,
  limite: 'Comparación de contenido desde baseline local; no es Git ni acredita cambios previos a AG-011.' });
escribir('fuentes-finales.json', { fecha, archivos: fuentes });
escribir('entrega-integridad.json', { fecha, historicosComprobados: protegidos.length, alterados,
  prefijoCsvBytes: prefijo.length, prefijoCsvConservado,
  salidasAutogeneradas,
  resultado: alterados.length || !prefijoCsvConservado ? 'FAIL' : 'PASS' });
const cambios = [...creados, ...modificados].map((a) => a.ruta).concat(salidasAutogeneradas);
const grupos = [
  ['docs: aprobar catálogo de proveedores y concurrencia optimista', (r) => r.startsWith('especificaciones/003-') || r.includes('ADR-0004')],
  ['feat: implementar catálogo de proveedores con permisos y versión', (r) => r.startsWith('backend/')],
  ['feat: añadir gestión accesible de proveedores en Angular', (r) => r.startsWith('frontend/')],
  ['test: verificar proveedores en Compose y ampliar CI', (r) => r.startsWith('.github/') || r.startsWith('infraestructura/') || r.startsWith('qa/') && !r.startsWith('qa/evidencias/')],
  ['docs: registrar validación y evidencias de AG-011', () => true],
];
const pendientes = new Set(cambios);
escribir('manifiesto-commits.json', { fecha, ejecutados: false, grupos: grupos.map(([mensaje, seleccionar]) => {
  const rutas = [...pendientes].filter(seleccionar);
  rutas.forEach((r) => pendientes.delete(r));
  return { mensajeSugerido: mensaje, archivos: rutas };
}), nota: 'Propuesta de agrupación para revisión/staging/commits humanos. No se ejecutó Git.' });
console.log(`${alterados.length || !prefijoCsvConservado ? 'FAIL' : 'PASS'}: ${protegidos.length} protegidos, prefijo CSV ${prefijoCsvConservado}; ${creados.length} creados, ${modificados.length} modificados, ${eliminados.length} eliminados.`);
process.exitCode = alterados.length || !prefijoCsvConservado ? 1 : 0;
