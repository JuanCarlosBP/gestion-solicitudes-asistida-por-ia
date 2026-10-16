import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { prepararDirectorioEvidencias, raizProyecto } from './rutas-evidencia.mjs';

// Comparación del workspace desde captura inicial, sin invocar Git.
const evidencia = prepararDirectorioEvidencias();
const baseline = resolve(raizProyecto, 'qa/evidencias/ag012');
const sha = (contenido) => createHash('sha256').update(contenido).digest('hex').toUpperCase();
const iniciales = JSON.parse(readFileSync(resolve(baseline, 'huellas-entrada.json'), 'utf8').replace(/^\uFEFF/, ''));
const inicial = new Map(iniciales.map((a) => [a.ruta, a.sha256]));
const esProtegido = (ruta) => /^qa\/evidencias\/ag(?:00[3-9]|01[01])\//.test(ruta)
  || /^docs\/trazabilidad\/(?:AG-00[3-9]|AG-01[01]|REV-001)/.test(ruta)
  || /^docs\/decisiones\/ADR-000[1-4]-/.test(ruta)
  || /^especificaciones\/00[1-3]-[^/]+\/validacion\.md$/.test(ruta)
  || /^backend\/src\/main\/resources\/db\/migration\/V[1-3]__/.test(ruta);
// La captura inicial con rg omitió logs ignorados. Se contrastan con huellas
// históricas ya existentes y protegidas; nunca se inventa una captura inicial.
const referenciasHistoricas = new Map();
for (const ruta of ['qa/evidencias/ag011/historicos-inicial.json',
  'qa/evidencias/ag011/entrega-manifiesto.json']) {
  const contenido = readFileSync(resolve(raizProyecto, ruta));
  if (inicial.get(ruta) !== sha(contenido)) throw new Error('Referencia histórica alterada.');
  const documento = JSON.parse(contenido.toString('utf8').replace(/^\uFEFF/, ''));
  for (const archivo of Array.isArray(documento) ? documento : [...documento.creados, ...documento.modificados]) {
    if (esProtegido(archivo.ruta) && !inicial.has(archivo.ruta))
      referenciasHistoricas.set(archivo.ruta, archivo.sha256.toUpperCase());
  }
}
const comprobacionHistorica = [...referenciasHistoricas].map(([ruta, sha256]) => ({ ruta, sha256,
  observado: existsSync(resolve(raizProyecto, ruta)) ? sha(readFileSync(resolve(raizProyecto, ruta))) : null }));
const protegidos = iniciales.filter((a) => esProtegido(a.ruta)).map((a) => ({ ...a,
  observado: existsSync(resolve(raizProyecto, a.ruta)) ? sha(readFileSync(resolve(raizProyecto, a.ruta))) : null }));
const alterados = [...protegidos, ...comprobacionHistorica].filter((a) => a.sha256 !== a.observado);
const cierre004 = resolve(baseline, 'cierre004');
let fase004 = null;
if (existsSync(resolve(cierre004, 'snapshot.json'))) {
  const leer004 = (nombre) => JSON.parse(readFileSync(resolve(cierre004, nombre), 'utf8').replace(/^\uFEFF/, ''));
  const snapshot = leer004('snapshot.json');
  const fuentes = leer004('fuentes-finales.json');
  const manifiesto = leer004('entrega-manifiesto.json');
  const v4 = fuentes.archivos.find((a) => /\/V4__/.test(a.ruta));
  if (!v4) throw new Error('El cierre004 no registra V4.');
  const comprobados = [{ ruta: 'qa/evidencias/ag012/cierre004/fuentes004.zip', sha256: snapshot.sha256,
    observado: sha(readFileSync(resolve(cierre004, 'fuentes004.zip'))) },
  { ...v4, observado: sha(readFileSync(resolve(raizProyecto, v4.ruta))) }];
  alterados.push(...comprobados.filter((a) => a.sha256 !== a.observado));
  fase004 = { snapshot: 'qa/evidencias/ag012/cierre004/fuentes004.zip', comprobados,
    mapa: new Map([...inicial, ...[...fuentes.archivos, ...manifiesto.creados, ...manifiesto.modificados]
      .map((a) => [a.ruta, a.sha256])]) };
}
const prefijo = readFileSync(resolve(baseline, 'registro-entrada.csv'));
const registro = readFileSync(resolve(raizProyecto, 'docs/trazabilidad/ejecuciones-agentes.csv'));
const prefijoConservado = registro.subarray(0, prefijo.length).equals(prefijo);
const excluir = new Set(['.git', 'node_modules', 'tmp', 'temp', 'target', 'dist', '.angular',
  'test-results', 'playwright-report', 'coverage']);
const autogenerados = new Set(['entrega-manifiesto.json', 'entrega-integridad.json', 'fuentes-finales.json', 'manifiesto-commits.json']);
const archivos = [];
function recorrer(directorio) {
  for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
    if (excluir.has(entrada.name) || entrada.name === '.env' || /^\.env\.(?!example$)/.test(entrada.name)) continue;
    const absoluto = resolve(directorio, entrada.name);
    if (entrada.isSymbolicLink()) throw new Error('No se siguen enlaces al generar manifiesto.');
    if (entrada.isDirectory()) { recorrer(absoluto); continue; }
    const ruta = relative(raizProyecto, absoluto).replaceAll('\\', '/');
    if (ruta.startsWith('qa/evidencias/ag012/') && autogenerados.has(entrada.name)) continue;
    if (entrada.name.endsWith('.log') && !ruta.startsWith('qa/evidencias/')) continue;
    const contenido = readFileSync(absoluto);
    archivos.push({ ruta, bytes: contenido.length, sha256: sha(contenido) });
  }
}
recorrer(raizProyecto);
archivos.sort((a, b) => a.ruta.localeCompare(b.ruta));
const rutas = new Set(archivos.map((a) => a.ruta));
const modificados = archivos.filter((a) => inicial.has(a.ruta) && inicial.get(a.ruta) !== a.sha256);
const historicosSinReferencia = archivos.filter((a) => esProtegido(a.ruta)
  && !inicial.has(a.ruta) && !referenciasHistoricas.has(a.ruta));
if (historicosSinReferencia.length) throw new Error('Hay históricos sin referencia; no se clasifican como creados.');
const creados = archivos.filter((a) => !inicial.has(a.ruta) && !referenciasHistoricas.has(a.ruta));
const eliminados = [...inicial.keys()].filter((ruta) => !rutas.has(ruta));
const fecha = new Date().toISOString();
const escribir = (nombre, contenido) => writeFileSync(resolve(evidencia, nombre), JSON.stringify(contenido, null, 2) + '\n');
const salidasAutogeneradas = [...autogenerados].map((n) =>
  `${relative(raizProyecto, evidencia).replaceAll('\\', '/')}/${n}`);
escribir('entrega-manifiesto.json', { fecha, creados, modificados, eliminados, salidasAutogeneradas,
  historicosComplementarios: comprobacionHistorica,
  limite: 'Huellas desde captura AG-012; no es Git ni atribuye cambios anteriores a la sesión.' });
escribir('entrega-integridad.json', { fecha, protegidos: protegidos.length,
  historicosComplementarios: comprobacionHistorica.length, alterados,
  cierre004: fase004?.comprobados ?? [],
  prefijoCsvBytes: prefijo.length, prefijoCsvConservado: prefijoConservado,
  resultado: alterados.length || !prefijoConservado ? 'FAIL' : 'PASS' });
escribir('fuentes-finales.json', { fecha, archivos: archivos.filter((a) =>
  /^(?:backend|frontend|infraestructura|qa)\//.test(a.ruta) && !a.ruta.startsWith('qa/evidencias/')
  || a.ruta === '.github/workflows/ci.yml') });
const grupos = [
  ['test: aislar datos y preparación del E2E de proveedores', (r) => r === 'frontend/e2e/proveedores.spec.ts'
    || r === 'especificaciones/003-proveedores/validacion-ag012.md'
    || /^qa\/evidencias\/ag012\/(?:primer-fallo-remoto|proveedores-e2e-entrada|e2e-proveedores|e2e-regresion001-003|heredado-|regresion001-003)/.test(r)],
  ['docs: aprobar solicitudes, importes y presentación AG-012', (r) => r.startsWith('especificaciones/004-') || r.includes('ADR-0005')],
  ['docs: aprobar decisiones y evento mínimo de005', (r) => r.startsWith('especificaciones/005-') || r.includes('ADR-0006')],
  ['docs: proponer borrador006 sin implementación', (r) => r.startsWith('especificaciones/006-')],
  ['feat: implementar solicitudes e idempotencia transaccional', (r) => r.startsWith('backend/')],
  ['feat: incorporar interfaz de solicitudes y sistema visual', (r) => r.startsWith('frontend/')],
  ['test: verificar solicitudes en Compose y CI', (r) => r.startsWith('.github/') || r.startsWith('infraestructura/') || r.startsWith('qa/') && !r.startsWith('qa/evidencias/')],
  ['docs: conservar resultados, revisión y evidencias AG-012', () => true],
];
const pendientes = new Set([...creados, ...modificados].map((a) => a.ruta).concat(salidasAutogeneradas));
const separables = (a) => /^(?:backend|frontend|infraestructura|qa|docs|especificaciones)\//.test(a.ruta)
  && !a.ruta.startsWith('qa/evidencias/') || ['.github/workflows/ci.yml', 'README.md', 'MEMORY.md'].includes(a.ruta);
escribir('manifiesto-commits.json', { fecha, gitEjecutado: false,
  separacion004005: fase004 ? { snapshot004: fase004.snapshot,
    nuevosDesde004: archivos.filter((a) => separables(a) && !fase004.mapa.has(a.ruta)),
    modificadosDesde004: archivos.filter((a) => separables(a) && fase004.mapa.has(a.ruta) && fase004.mapa.get(a.ruta) !== a.sha256),
    instruccion: 'Para separar archivos compartidos, revisar primero su versión completa en snapshot004; después aplicar las diferencias005 actuales. El arreglo heredado mantiene su grupo propio.' } : null,
  grupos: grupos.map(([mensaje, seleccionar]) => {
  const seleccionados = [...pendientes].filter(seleccionar);
  seleccionados.forEach((r) => pendientes.delete(r));
  return { mensajeSugerido: mensaje, archivos: seleccionados };
}), nota: 'Propuesta para revisión y commits humanos; no se ejecutó Git. Separar cambios compartidos004/005 por bloques cuando corresponda.' });
console.log(`${alterados.length || !prefijoConservado ? 'FAIL' : 'PASS'}: ${protegidos.length} protegidos y${comprobacionHistorica.length} históricos contrastados; prefijo CSV ${prefijoConservado}; ${creados.length} creados, ${modificados.length} modificados, ${eliminados.length} eliminados.`);
process.exitCode = alterados.length || !prefijoConservado ? 1 : 0;
