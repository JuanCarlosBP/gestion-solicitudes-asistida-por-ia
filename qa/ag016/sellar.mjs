import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { inventariar } from './inventario-entrega.mjs';

const raiz = resolve(import.meta.dirname, '../..');
const prefijo = 'qa/evidencias/ag016/';
const manifiesto = prefijo + 'manifiesto-commits.json';
const integridad = prefijo + 'entrega-integridad.json';
const sumas = prefijo + 'SHA256SUMS.txt';
const sha = b => createHash('sha256').update(b).digest('hex');
const leer = ruta => readFileSync(resolve(raiz, ruta));
export function rutaSegura(ruta) {
  if (typeof ruta !== 'string' || !ruta || isAbsolute(ruta) || /[:\\\r\n\0]/.test(ruta) || ruta.split('/').includes('..'))
    throw Error('Ruta no válida en entrega.');
  const relativa = relative(raiz, resolve(raiz, ruta));
  if (!relativa || isAbsolute(relativa) || relativa.startsWith('..')) throw Error('Ruta fuera del paquete.');
  return ruta;
}

export function verificarCobertura(rutas, archivos, exclusiones) {
  const esperadas = new Set(rutas.filter(r => !exclusiones.has(r)));
  const observadas = new Set(archivos.map(a => a.ruta));
  if (observadas.size !== archivos.length || observadas.size !== esperadas.size
    || [...esperadas].some(r => !observadas.has(r)))
    throw Error('Cobertura de integridad incompleta o con rutas repetidas.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
if (process.argv[2] === '--comprobar') {
  const m = JSON.parse(leer(manifiesto)), sello = JSON.parse(leer(integridad));
  const rutas = m.grupos.flatMap(g => g.archivos);
  if (new Set(rutas).size !== rutas.length) throw Error('Rutas repetidas en manifiesto.');
  for (const ruta of rutas) { rutaSegura(ruta); if (!existsSync(resolve(raiz, ruta))) throw Error('Archivo ausente: ' + ruta); }
  const excluidos = new Set([integridad, sumas]);
  verificarCobertura(rutas, sello.archivos, excluidos);
  for (const a of sello.archivos) {
    rutaSegura(a.ruta);
    if (!rutas.includes(a.ruta) || excluidos.has(a.ruta) || sha(leer(a.ruta)) !== a.sha256)
      throw Error('Huella no válida: ' + a.ruta);
  }
  const lineas = leer(sumas).toString('utf8').trim().split('\n');
  const selladas = new Set();
  for (const linea of lineas) {
    const pareja = /^([a-f0-9]{64})  (.+)$/.exec(linea);
    if (!pareja || selladas.has(pareja[2]) || pareja[2] === sumas || !rutas.includes(pareja[2])
      || sha(leer(rutaSegura(pareja[2]))) !== pareja[1]) throw Error('Sello SHA256 no válido.');
    selladas.add(pareja[2]);
  }
  if (selladas.size !== rutas.length - 1) throw Error('Cobertura SHA256 incompleta.');
  console.log(JSON.stringify({ estado: 'PASS', archivosManifiesto: rutas.length, hashes: sello.archivos.length,
    sellados: selladas.size, grupos: m.grupos.length, escritura: false }));
} else if (process.argv[2] === '--crear') {
  if (!existsSync(resolve(raiz, prefijo + 'cierre.json'))) throw Error('Falta cierre documentado.');
  if (existsSync(resolve(raiz, 'tmp/ag016/carga-activa.lock'))) throw Error('No sellar con carga activa.');
  for (const p of [manifiesto, integridad, sumas]) if (existsSync(resolve(raiz, p))) throw Error('El sello ya existe; no sobrescribir.');
  const inventario = inventariar();
  if (inventario.protegidos.diferencias.length || inventario.cambios.some(c => c.estado === 'eliminado'))
    throw Error('Diferencia histórica o archivo eliminado requiere revisión.');
  const rutas = [...new Set([...inventario.cambios.map(c => c.ruta), manifiesto, integridad, sumas])].sort();
  const grupos = [
    { id: '01-documentacion', mensajeSugerido: 'docs: cerrar 007 y documentar diseño, validación y operación de la demo 008', archivos: [] },
    { id: '02-backend', mensajeSugerido: 'feat: aislar reservas y generaciones demo con provisión externa y drenaje seguro', archivos: [] },
    { id: '03-frontend', mensajeSugerido: 'feat: incorporar demo por roles y ámbito seguro de reserva en Angular', archivos: [] },
    { id: '04-infraestructura', mensajeSugerido: 'feat: preparar laboratorio demo con cuotas, secretos externos y perfil TLS', archivos: [] },
    { id: '05-qa', mensajeSugerido: 'test: verificar aislamiento, regresión y capacidad con contexto Docker explícito', archivos: [] },
    { id: '06-evidencias', mensajeSugerido: 'docs: conservar resultados, incidencias y sello de entrega local AG-016', archivos: [] },
  ];
  for (const ruta of rutas) {
    rutaSegura(ruta);
    const i = ruta.startsWith(prefijo) ? 5 : ruta.startsWith('backend/') ? 1 : ruta.startsWith('frontend/') ? 2
      : ruta.startsWith('infraestructura/') ? 3 : /^(qa\/|\.github\/|\.gitignore$|\.gitattributes$)/.test(ruta) ? 4
        : /^(docs\/|especificaciones\/|README\.md$|CONTRIBUTING\.md$|MEMORY\.md$)/.test(ruta) ? 0 : -1;
    if (i < 0) throw Error('Archivo sin asignación revisada: ' + ruta);
    grupos[i].archivos.push(ruta);
  }
  const m = { observado: new Date().toISOString(), estado: 'PROPUESTA_LOCAL_SIN_OPERACIONES_GIT',
    base: 'eaa0baec78ed9b99d8039ea7e6256b254be295d3', metodoInventario: inventario.metodo,
    indiceSha256: inventario.indiceSha256, grupos, totalArchivos: rutas.length,
    exclusiones: ['tmp/ y secretos privados', 'node_modules/', 'backend/target/ y frontend/dist/: artefactos reproducibles con huellas en evidencia',
      'Archivos históricos sin cambios; no se duplican'],
    nota: 'Mensajes y agrupación propuestos para la persona responsable; no se ejecutó add, commit ni otra operación Git.' };
  writeFileSync(resolve(raiz, manifiesto), JSON.stringify(m, null, 2) + '\n', { flag: 'wx' });
  const archivos = rutas.filter(p => p !== integridad && p !== sumas).map(ruta => {
    const contenido = leer(ruta); return { ruta, bytes: contenido.length, sha256: sha(contenido) };
  });
  const sello = { observado: new Date().toISOString(), totalArchivos: archivos.length,
    exclusionesDeAutorreferencia: [integridad, sumas], archivos };
  writeFileSync(resolve(raiz, integridad), JSON.stringify(sello, null, 2) + '\n', { flag: 'wx' });
  const texto = rutas.filter(p => p !== sumas).map(p => `${sha(leer(p))}  ${p}`).join('\n') + '\n';
  writeFileSync(resolve(raiz, sumas), texto, { flag: 'wx' });
  console.log(JSON.stringify({ estado: 'SELLADO_LOCAL', archivos: rutas.length, grupos: grupos.length,
    autorreferencias: 'Integridad excluye integridad y SHA256SUMS; SHA256SUMS incluye integridad y se excluye a sí mismo.' }));
} else throw Error('Usar --crear una vez o --comprobar en lectura.');
}
