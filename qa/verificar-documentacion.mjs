import { readdirSync, readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { prepararDirectorioEvidencias } from './rutas-evidencia.mjs';

const raiz = resolve(import.meta.dirname, '..');
const evidencia = prepararDirectorioEvidencias();
console.log(`Evidencias documentales: ${evidencia}`);
const excluidos = new Set(['.git', 'node_modules', 'tmp', 'target', 'dist', '.angular', 'test-results', 'playwright-report']);
const archivos = [];
function recorrer(directorio) {
  for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
    if (excluidos.has(entrada.name)) continue;
    const ruta = resolve(directorio, entrada.name);
    if (entrada.isDirectory()) recorrer(ruta);
    else archivos.push(ruta);
  }
}
recorrer(raiz);
const errores = [];
let enlaces = 0;
for (const ruta of archivos.filter((archivo) => archivo.endsWith('.md'))) {
  const texto = readFileSync(ruta, 'utf8');
  for (const enlace of texto.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const destino = enlace[1].replace(/^<|>$/g, '').split('#')[0];
    if (!destino || /^(?:https?:|mailto:|app:|codex:)/.test(destino)) continue;
    enlaces++;
    if (!existsSync(resolve(dirname(ruta), decodeURIComponent(destino)))) errores.push(`${relative(raiz, ruta)}: destino ausente ${destino}`);
  }
}
const hallazgosSecretos = [];
const patrones = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /\bAKIA[0-9A-Z]{16}\b/, /\bgh[pousr]_[A-Za-z0-9]{30,}\b/, /\bgithub_pat_[A-Za-z0-9_]{50,}\b/];
for (const ruta of archivos) {
  if (/\.(?:png|zip|jar|exe|ico)$/.test(ruta) || statSync(ruta).size > 2_000_000) continue;
  if (ruta === resolve(raiz, 'qa/verificar-documentacion.mjs')) continue;
  const texto = readFileSync(ruta, 'utf8');
  if (patrones.some((patron) => patron.test(texto))) hallazgosSecretos.push(relative(raiz, ruta));
}
const resultado = { fecha: new Date().toISOString(), archivos: archivos.length, enlaces, errores, ubicacionesPatronesSecretos: hallazgosSecretos, limite: 'Búsqueda acotada; no garantiza ausencia de todo secreto. No imprime valores encontrados.' };
writeFileSync(resolve(evidencia, 'documentacion-control.json'), `${JSON.stringify(resultado, null, 2)}\n`);
console.log(`${enlaces} enlaces; ${errores.length} destinos ausentes; ${hallazgosSecretos.length} ubicaciones con patrones de secretos.`);
for (const error of errores) console.error(error);
for (const ruta of hallazgosSecretos) console.error(`Revisar ubicación sin reproducir contenido: ${ruta}`);
process.exitCode = errores.length || hallazgosSecretos.length ? 1 : 0;
