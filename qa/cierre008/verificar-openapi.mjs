import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const METODOS = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'head']);
export function comprobarContrato(spec, esperado) {
  if (!/^3\.1\./.test(spec?.openapi ?? '') || !spec.paths || typeof spec.paths !== 'object') throw Error('Documento OpenAPI 3.1 inválido');
  const real = Object.entries(spec.paths).flatMap(([ruta, item]) => Object.keys(item).filter(m => METODOS.has(m)).map(m => `${m.toUpperCase()} ${ruta}`)).sort();
  const base = esperado.map(x => `${x.metodo} ${x.ruta}`).sort();
  if (new Set(base).size !== base.length || JSON.stringify(real) !== JSON.stringify(base)) {
    throw Error('Inventario API distinto. Faltan: ' + base.filter(x => !real.includes(x)).join(', ') + '; sobran: ' + real.filter(x => !base.includes(x)).join(', '));
  }
  let refs = 0;
  const visitar = (n) => {
    if (!n || typeof n !== 'object') return;
    if (typeof n.$ref === 'string') {
      if (!n.$ref.startsWith('#/')) throw Error('Referencia externa no prevista: ' + n.$ref);
      let actual = spec;
      for (const trozo of n.$ref.slice(2).split('/')) {
        const k = decodeURIComponent(trozo).replaceAll('~1', '/').replaceAll('~0', '~');
        if (!actual || typeof actual !== 'object' || !Object.hasOwn(actual, k)) throw Error('Referencia sin destino: ' + n.$ref);
        actual = actual[k];
      }
      refs++;
    }
    for (const v of Object.values(n)) visitar(v);
  };
  visitar(spec);
  for (const { metodo, ruta } of esperado) {
    const operacion = spec.paths[ruta][metodo.toLowerCase()];
    if (!operacion.responses || Object.keys(operacion.responses).length === 0) throw Error('Operación sin respuestas: ' + metodo + ' ' + ruta);
  }
  return { estado: 'PASS', rutas: Object.keys(spec.paths).length, operaciones: real.length, referenciasResueltas: refs, inventario: real,
    limite: 'Verifica contrato y referencias. La ejecución funcional corresponde a las suites API y de navegador, no a esta comparación.' };
}
async function main() {
  const base = new URL(process.env.BASE_URL ?? 'http://127.0.0.1:18080');
  if (!['127.0.0.1', 'localhost'].includes(base.hostname) || base.protocol !== 'http:') throw Error('Este verificador de Swagger se ejecuta solo en laboratorio local/CI.');
  const r = await fetch(new URL('/v3/api-docs', base), { signal: AbortSignal.timeout(20000) });
  if (r.status !== 200) throw Error('OpenAPI local no devuelve 200: ' + r.status);
  const doc = await r.json();
  const esperado = JSON.parse(fs.readFileSync(new URL('./operaciones-esperadas.json', import.meta.url), 'utf8'));
  const resultado = comprobarContrato(doc, esperado);
  const dir = path.resolve(process.env.QA_EVIDENCE_DIR ?? 'tmp/evidencias/contrato-api');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'contrato-api-comprobado.json'), JSON.stringify({ fecha: new Date().toISOString(), ...resultado }, null, 2) + '\n');
  console.log(`OPENAPI PASS: ${resultado.rutas} rutas, ${resultado.operaciones} operaciones y ${resultado.referenciasResueltas} referencias resueltas.`);
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(e => { console.error(e.message); process.exitCode = 1; });
}
