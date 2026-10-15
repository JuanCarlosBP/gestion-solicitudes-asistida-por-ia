import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const destino = resolve(raiz, 'qa/evidencias/ag014');
if (existsSync(resolve(destino, 'entrada.json'))) throw new Error('La entrada AG014 ya existe; no sobrescribir.');
mkdirSync(destino, { recursive: true });
const excluir = new Set(['.git', 'node_modules', 'target', 'dist', '.angular', 'tmp', 'test-results', 'playwright-report', 'coverage']);
const archivos = [];
function recorrer(directorio) {
  for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
    if (excluir.has(entrada.name) || /^\.env(?:$|\.(?!example$))/.test(entrada.name)) continue;
    if (entrada.isSymbolicLink()) throw new Error('No seguir enlaces en inventario.');
    const absoluto = resolve(directorio, entrada.name);
    const ruta = relative(raiz, absoluto).replaceAll('\\', '/');
    if (ruta.startsWith('qa/evidencias/ag014/')) continue;
    if (entrada.isDirectory()) { recorrer(absoluto); continue; }
    if (/\.(?:pem|key|p12|pfx|keystore)$/.test(ruta)) continue;
    if (ruta.endsWith('.log') && !ruta.startsWith('qa/evidencias/')) continue;
    const contenido = readFileSync(absoluto);
    archivos.push({ ruta, bytes: contenido.length, sha256: createHash('sha256').update(contenido).digest('hex') });
  }
}
recorrer(raiz);
const protegidos = archivos.filter(({ ruta }) => /^qa\/evidencias\/ag(?:00[3-9]|01[0-3])\//.test(ruta) || /^docs\/trazabilidad\/(?:AG-0(?:0[3-9]|1[0-3])|REV-001)/.test(ruta) || /^backend\/src\/main\/resources\/db\/migration\/V[1-6]__/.test(ruta));
writeFileSync(resolve(destino, 'entrada.json'), JSON.stringify({ fecha: new Date().toISOString(), archivos, protegidos }, null, 2) + '\n');
for (const [origen, nombre] of [['MEMORY.md','memoria-entrada.txt'],['especificaciones/007-historial-auditoria/especificacion.md','especificacion-borrador-entrada.txt'],['docs/trazabilidad/ejecuciones-agentes.csv','registro-entrada.csv']]) copyFileSync(resolve(raiz, origen), resolve(destino, nombre));
writeFileSync(resolve(destino, 'sesion.json'), JSON.stringify({ inicioObservado: '2026-10-15T20:09:15+02:00', limiteConservador: '2026-10-16T04:05:00+02:00', zona: 'Europe/Madrid', notaTiempo: 'Primera lectura de reloj tras reconocimiento inicial; límite conservador anterior a ocho horas desde esa observación.', ramaLeidaEnHead: 'feature/007-historial-auditoria', desviaciones: ['git status --short ejecutado antes de leer la prohibición adjunta; salida vacía. No autoriza más comandos Git.'], autorizacion: 'AG-014 y D-007-01–10 por encargo humano; implementación007 autorizada; aceptación humana pendiente.' }, null, 2) + '\n');
console.log(`Entrada conservada: ${archivos.length} archivos, ${protegidos.length} protegidos.`);
