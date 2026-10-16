import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontend = join(raiz, 'frontend');
const manifiesto = JSON.parse(readFileSync(join(frontend, 'package.json'), 'utf8'));
const bloqueo = JSON.parse(readFileSync(join(frontend, 'package-lock.json'), 'utf8'));
const paquetes = bloqueo.packages;
const preliminar = /^\d+\.\d+\.\d+-[0-9A-Za-z.-]+(?:\+[0-9A-Za-z.-]+)?$/;
const exacta = /^\d+\.\d+\.\d+(?:\+[0-9A-Za-z.-]+)?$/;
const directas = { ...manifiesto.dependencies, ...manifiesto.devDependencies, ...manifiesto.optionalDependencies };
const errores = [];
if (manifiesto.overrides || manifiesto.resolutions) errores.push('No se permiten overrides ni resolutions.');
if (!paquetes || bloqueo.lockfileVersion !== 3) throw new Error('Se requiere package-lock v3.');

function resolver(desde, nombre) {
  let posicion = desde;
  while (posicion) {
    const candidata = `${posicion}/node_modules/${nombre}`;
    if (paquetes[candidata]) return candidata;
    const corte = posicion.lastIndexOf('/node_modules/');
    posicion = corte < 0 ? '' : posicion.slice(0, corte);
  }
  return paquetes[`node_modules/${nombre}`] ? `node_modules/${nombre}` : undefined;
}

const cadenas = new Map([['', []]]);
const padres = new Map();
const cola = [''];
for (let i = 0; i < cola.length; i++) {
  const ruta = cola[i];
  const paquete = paquetes[ruta];
  const dependencias = ruta === '' ? directas : { ...paquete.dependencies, ...paquete.optionalDependencies };
  for (const nombre of Object.keys(dependencias)) {
    const destino = resolver(ruta, nombre);
    // Los opcionales ausentes pueden ser específicos de otra plataforma.
    if (!destino) continue;
    const origenes = padres.get(destino) ?? new Set();
    origenes.add(ruta);
    padres.set(destino, origenes);
    if (!cadenas.has(destino)) {
      cadenas.set(destino, [...cadenas.get(ruta), `${nombre}@${paquetes[destino].version}`]);
      cola.push(destino);
    }
  }
}

const fuentes = [];
function leerFuentes(carpeta) {
  for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) leerFuentes(ruta);
    else if (/\.(?:ts|js|mjs)$/.test(entrada.name)) fuentes.push({ ruta, texto: readFileSync(ruta, 'utf8') });
  }
}
try { leerFuentes(join(frontend, 'src')); } catch (error) { if (error.code !== 'ENOENT') throw error; }

for (const [nombre, version] of Object.entries(directas)) {
  if (!exacta.test(version)) errores.push(`Directa sin versión estable exacta: ${nombre}@${version}`);
  if (paquetes[`node_modules/${nombre}`]?.version !== version) errores.push(`Manifiesto y lockfile incoherentes: ${nombre}`);
}

const inventario = [];
for (const [ruta, paquete] of Object.entries(paquetes)) {
  if (!ruta) continue;
  const nombre = paquete.name ?? ruta.slice(ruta.lastIndexOf('node_modules/') + 13);
  const motivos = [];
  let origenOficial = false;
  try { const url = new URL(paquete.resolved); origenOficial = url.protocol === 'https:' && url.hostname === 'registry.npmjs.org' && !url.username && !url.password; } catch { /* Se informa sin reproducir posibles credenciales. */ }
  if (!origenOficial) motivos.push('Origen no autorizado o ausente');
  const sri = /^sha(256|384|512)-([A-Za-z0-9+/]+={0,2})$/.exec(paquete.integrity ?? '');
  if (!sri || Buffer.from(sri[2], 'base64').length !== Number(sri[1]) / 8) motivos.push('Integridad ausente o incoherente');
  if (motivos.length) errores.push(`${nombre}@${paquete.version}: ${motivos.join('; ')}`);
  if (!preliminar.test(paquete.version ?? '')) continue;
  const directa = Object.hasOwn(directas, nombre) && ruta === `node_modules/${nombre}`;
  const importada = fuentes.some(({ texto }) => [...texto.matchAll(/(?:from\s*|import\s*(?:\(|)|require\s*\()\s*['"]([^'"]+)['"]/g)].some(([, modulo]) => modulo === nombre || modulo.startsWith(`${nombre}/`)));
  if (importada) motivos.push('Importación directa desde código del proyecto');
  if (!cadenas.has(ruta)) motivos.push('Cadena introductora no identificada');
  const clasificacion = directa ? 'DIRECTA_BLOQUEANTE' : motivos.length ? 'TRANSITIVA_BLOQUEANTE' : !paquete.license ? 'TRANSITIVA_ADVERTENCIA' : 'TRANSITIVA_CONTROLADA';
  if (clasificacion.endsWith('BLOQUEANTE')) errores.push(`${nombre}@${paquete.version}: ${clasificacion}`);
  const rutasIntroductoras = [...(padres.get(ruta) ?? [])].map((padre) => [...(cadenas.get(padre) ?? []), `${nombre}@${paquete.version}`]);
  inventario.push({ nombre, version: paquete.version, ruta, directa, clasificacion, cadenas: rutasIntroductoras, origen: origenOficial ? 'https://registry.npmjs.org/' : 'NO_AUTORIZADO', integridad: Boolean(sri) && motivos.every((m) => !m.startsWith('Integridad')), licencia: paquete.license ?? 'No declarada (metadato opcional)', motivos });
}

const resultado = { fecha: new Date().toISOString(), paquetes: Object.keys(paquetes).length - 1, preliminares: inventario.length, inventario, errores, controlesExternos: 'La clasificación estática requiere npm ci, auditorías, build y pruebas para su aceptación final conforme a ADR-0002.' };
const salida = process.argv.indexOf('--salida');
if (salida >= 0) writeFileSync(resolve(process.argv[salida + 1]), `${JSON.stringify(resultado, null, 2)}\n`);
console.log(`Inventario completo: ${resultado.paquetes} paquetes; ${inventario.length} preliminares.`);
for (const paquete of inventario) {
  console.log(`${paquete.clasificacion}: ${paquete.nombre}@${paquete.version}`);
  for (const cadena of paquete.cadenas) console.log(`  ${cadena.join(' → ')}`);
}
for (const error of errores) console.error(error);
console.log(resultado.controlesExternos);
process.exitCode = errores.length ? 1 : 0;
