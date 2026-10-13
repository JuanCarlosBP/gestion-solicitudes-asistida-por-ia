import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { prepararDirectorioEvidencias, rutaDelProyecto } from './rutas-evidencia.mjs';

const raiz = resolve(import.meta.dirname, '..');
const baseline = rutaDelProyecto(process.env.QA_BASELINE_DIR || 'qa/evidencias/ag006');
const destino = rutaDelProyecto(process.env.QA_EVIDENCE_DIR || 'tmp/evidencias/local');
const respectoBaseline = relative(baseline, destino);
if (!respectoBaseline || (!isAbsolute(respectoBaseline) && respectoBaseline !== '..' && !respectoBaseline.startsWith(`..${sep}`))) {
  throw new Error('La baseline es de solo lectura; el destino QA no puede estar dentro de ella.');
}
const evidencia = prepararDirectorioEvidencias(destino);
console.log(`Baseline de solo lectura: ${baseline}; salidas de entrega: ${evidencia}`);
const normalizar = (ruta) => ruta.replaceAll('\\', '/');
const huella = (datos) => createHash('sha256').update(datos).digest('hex').toUpperCase();
const inicial = JSON.parse(readFileSync(resolve(baseline, 'inventario-inicial.json'), 'utf8'));
const anteriores = new Map(inicial.map((archivo) => [normalizar(archivo.ruta), archivo]));
const prefijos = [
  'docs/trazabilidad/ejecuciones-agentes.csv',
  'docs/documentaciondev/versiones.md',
  'docs/decisiones/ADR-0001-dependencia-transitiva-rolldown-angular-21.md',
  'especificaciones/001-base-verificable/validacion.md',
];
const controles = prefijos.map((ruta) => {
  const anterior = anteriores.get(ruta);
  const actual = readFileSync(resolve(raiz, ruta));
  return { ruta, tipo: 'prefijo histórico', bytes: anterior.bytes,
    esperado: anterior.sha256, observado: huella(actual.subarray(0, anterior.bytes)) };
});
for (const [ruta, anterior] of [
  ['docs/trazabilidad/memoria-hasta-ag005.md', anteriores.get('MEMORY.md')],
  ['frontend/package-lock.json', anteriores.get('frontend/package-lock.json')],
]) {
  controles.push({ ruta, tipo: 'archivo íntegro', bytes: anterior.bytes,
    esperado: anterior.sha256, observado: huella(readFileSync(resolve(raiz, ruta))) });
}
const permitidos = new Set([
  ...prefijos, 'MEMORY.md', 'README.md', 'docs/README.md',
  'especificaciones/README.md', 'especificaciones/001-base-verificable/especificacion.md',
  'especificaciones/001-base-verificable/plan.md', 'especificaciones/001-base-verificable/tareas.md',
  'frontend/package.json',
]);
const omitir = new Set(['.git', 'node_modules', 'tmp', 'target', 'dist', '.angular', 'test-results', 'playwright-report']);
const salidasPropias = new Set(['entrega-manifiesto.json', 'entrega-integridad.json'].map((nombre) => normalizar(relative(raiz, resolve(evidencia, nombre)))));
const archivos = [];
function recorrer(directorio) {
  for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
    if (omitir.has(entrada.name) || entrada.name === '.env') continue;
    const absoluto = resolve(directorio, entrada.name);
    if (entrada.isDirectory()) { recorrer(absoluto); continue; }
    const ruta = normalizar(relative(raiz, absoluto));
    if (salidasPropias.has(ruta)) continue;
    const contenido = readFileSync(absoluto);
    const sha256 = huella(contenido);
    const anterior = anteriores.get(ruta);
    archivos.push({ ruta, bytes: contenido.length, sha256,
      estado: !anterior ? 'CREADO' : sha256 === anterior.sha256 ? 'SIN_CAMBIOS' : 'MODIFICADO',
      tipo: ruta.startsWith('qa/evidencias/') ? 'EVIDENCIA' : 'FUENTE_O_DOCUMENTACION' });
  }
}
recorrer(raiz);
archivos.sort((a, b) => a.ruta.localeCompare(b.ruta));
const eliminados = [...anteriores.keys()].filter((ruta) => !existsSync(resolve(raiz, ruta)));
const inesperados = archivos.filter((archivo) =>
  archivo.estado === 'MODIFICADO' && !permitidos.has(archivo.ruta) ||
  archivo.estado === 'CREADO' && !/^(?:backend\/|frontend\/|infraestructura\/|qa\/|\.github\/workflows\/|docs\/trazabilidad\/|docs\/documentaciondev\/|docs\/decisiones\/ADR-0002)/.test(archivo.ruta));
const csv = readFileSync(resolve(raiz, 'docs/trazabilidad/ejecuciones-agentes.csv'), 'utf8');
const filasAg006 = csv.split(/\r?\n/).filter((linea) => /^"?AG-006"?,/.test(linea)).length;
const resultado = { fecha: new Date().toISOString(), baseline, directorioEvidencias: evidencia,
  alcance: 'Controles históricos del inventario inicial AG-006; no sustituye la revisión del delta ni las huellas históricas de una ejecución posterior.', controles,
  filasAg006, eliminados, inesperados: inesperados.map((archivo) => archivo.ruta),
  resumen: Object.fromEntries(['CREADO', 'MODIFICADO', 'SIN_CAMBIOS'].map((estado) => [estado, archivos.filter((archivo) => archivo.estado === estado).length])),
  exclusiones: [...omitir, '.env', ...salidasPropias],
  resultado: controles.every((control) => control.esperado === control.observado) && filasAg006 === 1 && !eliminados.length && !inesperados.length ? 'PASS' : 'FAIL' };
writeFileSync(resolve(evidencia, 'entrega-manifiesto.json'), JSON.stringify(archivos, null, 2) + '\n');
writeFileSync(resolve(evidencia, 'entrega-integridad.json'), JSON.stringify(resultado, null, 2) + '\n');
console.log(JSON.stringify({ resultado: resultado.resultado, resumen: resultado.resumen, eliminados, inesperados: resultado.inesperados, filasAg006 }));
process.exitCode = resultado.resultado === 'PASS' ? 0 : 1;
