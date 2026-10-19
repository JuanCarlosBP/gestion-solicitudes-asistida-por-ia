import { readFileSync, existsSync, openSync, fstatSync, readSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';

// Solo lectura de evidencia ya producida; no consulta Docker ni la aplicación.
const nombre = process.argv[2];
if (!nombre || !/^[a-z0-9-]+$/.test(nombre)) throw Error('Nombre de ejecución obligatorio.');
const carpeta = resolve(import.meta.dirname, '../evidencias/ag016', nombre);
const avisos = [];
function json(archivo) {
  if (!existsSync(resolve(carpeta, archivo))) return null;
  try { return JSON.parse(readFileSync(resolve(carpeta, archivo), 'utf8')); }
  catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    avisos.push(archivo + ': lectura pendiente de JSON completo; puede coincidir con escritura activa.');
    return null;
  }
}
function ultima(archivo) {
  const ruta = resolve(carpeta, archivo);
  if (!existsSync(ruta)) return null;
  const fd = openSync(ruta, 'r');
  try {
    const bytes = fstatSync(fd).size, inicio = Math.max(0, bytes - 65536), buffer = Buffer.alloc(bytes - inicio);
    readSync(fd, buffer, 0, buffer.length, inicio);
    const lineas = buffer.toString('utf8').split('\n');
    if (inicio) lineas.shift();
    for (const linea of lineas.reverse()) { try { return JSON.parse(linea); } catch {} }
    return null;
  } finally { closeSync(fd); }
}
const estado = json('estado.json'), cuota = json('cuotas-inicio.json'), recurso = ultima('recursos.jsonl');
console.log(JSON.stringify({ ejecucion: nombre, observado: new Date().toISOString(), fase: estado?.fase ?? null,
  minutos: estado?.transcurridoMs == null ? null : Math.round(estado.transcurridoMs / 6000) / 10,
  incidencias: estado?.incidencias ?? null, edadEstadoSegundos: estado ? (Date.now() - Date.parse(estado.actualizado)) / 1000 : null,
  recorridosIniciados: estado?.visitantes?.map(v => ({ visitante: v.visitante, cantidad: v.siguienteRecorrido, pausas: v.pausas })),
  ultimaMuestra: recurso?.servicios ? { fecha: recurso.fecha, edadSegundos: (Date.now() - Date.parse(recurso.fecha)) / 1000,
    memoriaConReservaMiB: cuota ? Math.round(recurso.servicios.reduce((s, v) => s + v.memoriaBytes, 0) / 1048576 + cuota.reservaSO_MiB) : null,
    swapBytes: recurso.servicios.reduce((s, v) => s + v.swapBytes, 0),
    oomKillAcumulados: recurso.servicios.reduce((s, v) => s + v.eventos.oom_kill, 0), conexiones: recurso.conexiones } : recurso,
  ultimoEvento: ultima('eventos.jsonl'), resultado: json('resultado-carga.json')?.estado ?? null,
  interrupcion: json('interrupcion.json')?.estado ?? null, avisos }, null, 2));
