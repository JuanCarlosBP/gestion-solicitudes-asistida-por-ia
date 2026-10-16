import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const directorio = import.meta.dirname;
const manifiesto = JSON.parse(readFileSync(resolve(directorio, 'entrega-manifiesto.json'), 'utf8'));
const grupos = [
  { id: 1, mensaje: 'docs(sdd): definir identidad y acceso aprobados en AG-010', archivos: [] },
  { id: 2, mensaje: 'feat(identidad): autenticar y revocar sesiones con JWT y refresh', archivos: [] },
  { id: 3, mensaje: 'feat(frontend): incorporar acceso y cuenta con sesión en memoria', archivos: [] },
  { id: 4, mensaje: 'ci(qa): verificar identidad en Compose y proteger evidencias', archivos: [] },
  { id: 5, mensaje: 'docs(ag010): registrar validación, revisión y entrega local', archivos: [] },
  { id: 6, mensaje: 'docs(proveedores): proponer especificación 003 para revisión humana', archivos: [] },
];
function grupo(ruta) {
  if (ruta.startsWith('especificaciones/003-proveedores/')) return 5;
  if (/^especificaciones\/002-identidad-acceso\/(?:especificacion|plan|tareas)\.md$/.test(ruta)
      || ruta.startsWith('docs/decisiones/ADR-0003')) return 0;
  if (ruta.startsWith('backend/')) return 1;
  if (ruta.startsWith('frontend/')) return 2;
  if (/^(?:infraestructura|\.github)\//.test(ruta) || ruta.startsWith('qa/') && !ruta.startsWith('qa/evidencias/')) return 3;
  return 4;
}
for (const tipo of ['creados', 'modificados', 'eliminados']) {
  for (const archivo of manifiesto[tipo]) grupos[grupo(archivo.ruta)].archivos.push({ estado: tipo, ...archivo });
}
const evidencias = readdirSync(directorio, { withFileTypes: true })
  .filter((entrada) => entrada.isFile()).map((entrada) => `qa/evidencias/ag010/${entrada.name}`).sort();
if (!evidencias.includes('qa/evidencias/ag010/manifiesto-commits.json')) evidencias.push('qa/evidencias/ag010/manifiesto-commits.json');
grupos[4].evidenciasNuevas = evidencias;
writeFileSync(resolve(directorio, 'manifiesto-commits.json'), JSON.stringify({ fecha: new Date().toISOString(),
  estado: 'Propuesta para ejecución humana; no se ejecuta Git ni se crean commits.',
  criterio: 'Agrupación lógica; validar el conjunto completo antes de integrar. Evidencias se enumeran sin hashes circulares.',
  grupos }, null, 2) + '\n');
console.log(`Propuesta: ${grupos.length} grupos, ${evidencias.length} archivos de evidencia nueva.`);
