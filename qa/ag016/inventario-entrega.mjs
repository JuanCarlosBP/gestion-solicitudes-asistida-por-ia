import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const raiz = resolve(import.meta.dirname, '../..');
const hash = (bytes, algoritmo = 'sha256') => createHash(algoritmo).update(bytes).digest('hex');
const objeto = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');

/** Lectura binaria del índice v2; no invoca Git ni escribe sus metadatos. */
export function leerIndice() {
  const bytes = readFileSync(resolve(raiz, '.git/index'));
  if (bytes.subarray(0, 4).toString() !== 'DIRC' || bytes.readUInt32BE(4) !== 2
    || hash(bytes.subarray(0, -20), 'sha1') !== bytes.subarray(-20).toString('hex'))
    throw Error('Índice v2 ausente o checksum inválido.');
  const entradas = new Map();
  let cursor = 12;
  for (let i = 0; i < bytes.readUInt32BE(8); i++) {
    const banderas = bytes.readUInt16BE(cursor + 60);
    if (banderas & 0x7000) throw Error('Entrada extendida o no resuelta no compatible.');
    const fin = bytes.indexOf(0, cursor + 62);
    if (fin < 0) throw Error('Entrada de índice truncada.');
    const ruta = bytes.subarray(cursor + 62, fin).toString('utf8');
    if (!ruta || ruta.startsWith('/') || ruta.split('/').includes('..') || entradas.has(ruta))
      throw Error('Ruta de índice inválida.');
    entradas.set(ruta, bytes.subarray(cursor + 40, cursor + 60).toString('hex'));
    cursor += Math.ceil((fin + 1 - cursor) / 8) * 8;
  }
  return { entradas, sha256: hash(bytes) };
}

export function inventariar() {
  const indice = leerIndice(), cambios = [], protegidos = [];
  const encontrados = new Set(execFileSync('rg', ['--files', '--hidden', '--null', '-g', '!.git'],
    { cwd: raiz, windowsHide: true, maxBuffer: 8 * 1024 * 1024 }).toString('utf8').split('\0').filter(Boolean).map(x => x.replaceAll('\\', '/')));
  // Incluye todas las evidencias propias, también si una regla de ignore futura las oculta.
  function evidencias(dir) {
    for (const entrada of readdirSync(resolve(raiz, dir), { withFileTypes: true })) {
      const ruta = `${dir}/${entrada.name}`;
      if (entrada.isDirectory()) evidencias(ruta); else if (entrada.isFile()) encontrados.add(ruta);
    }
  }
  evidencias('qa/evidencias/ag016');
  for (const ruta of indice.entradas.keys()) encontrados.add(ruta);
  for (const ruta of [...encontrados].sort()) {
    const original = indice.entradas.get(ruta), absoluta = resolve(raiz, ruta);
    let igual = false, dato;
    if (!existsSync(absoluta)) dato = { ruta, estado: 'eliminado', sha256: null, bytes: 0 };
    else {
      if (!statSync(absoluta).isFile()) throw Error('Entrada no es archivo regular: ' + ruta);
      const bytes = readFileSync(absoluta);
      igual = original === objeto(bytes);
      // .gitattributes normaliza texto; AG014/015 y el log AG011 conservan bytes.
      const sinNormalizar = /^qa\/evidencias\/ag01[45]\//.test(ruta) || ruta === 'qa/evidencias/ag011/backend-verify-final.log';
      if (original && !igual && !sinNormalizar && !bytes.includes(0))
        igual = original === objeto(Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n')));
      dato = { ruta, estado: original ? 'modificado' : 'nuevo', sha256: hash(bytes), bytes: bytes.length };
    }
    const protegida = (/^qa\/evidencias\//.test(ruta) && !ruta.startsWith('qa/evidencias/ag016/'))
      || /^backend\/src\/main\/resources\/db\/migration\/V[1-7]__/.test(ruta)
      || /^docs\/trazabilidad\/AG-0(?:0[1-9]|1[0-5])/.test(ruta);
    if (protegida && original) protegidos.push({ ruta, coincide: igual });
    if (!igual) cambios.push(dato);
  }
  return { observado: new Date().toISOString(), metodo: 'Lectura del índice v2 y SHA de contenido; rg para archivos. Ningún comando Git.',
    indiceSha256: indice.sha256, entradasIndice: indice.entradas.size, cambios,
    protegidos: { comprobados: protegidos.length, diferencias: protegidos.filter(x => !x.coincide).map(x => x.ruta) } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  console.log(JSON.stringify(inventariar(), null, 2));
