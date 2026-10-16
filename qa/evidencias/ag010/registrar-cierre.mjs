import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const fase = process.argv[2];
if (!['verificado', 'cierre'].includes(fase)) throw new Error('Indica verificado o cierre.');
const directorio = import.meta.dirname;
const raiz = resolve(directorio, '../../..');
const leer = (ruta) => JSON.parse(readFileSync(resolve(directorio, ruta), 'utf8').replace(/^\uFEFF/, ''));
const inicio = leer('inicio.json');
const prefijo = leer('csv-prefijo-inicial.json');
const rutaCsv = resolve(raiz, 'docs/trazabilidad/ejecuciones-agentes.csv');
const anterior = readFileSync(rutaCsv);
const historia = anterior.subarray(0, prefijo.bytes);
if (createHash('sha256').update(historia).digest('hex').toUpperCase() !== prefijo.sha256) throw new Error('Prefijo histórico alterado; no escribir.');
const sufijo = anterior.subarray(prefijo.bytes).toString('utf8').trim();
if (sufijo && (!sufijo.startsWith('"AG-010",') || sufijo.includes('\n'))) throw new Error('Hay filas ajenas posteriores al prefijo; no escribir.');
const ahora = new Date();
const partes = Object.fromEntries(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', year: 'numeric',
  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false, timeZoneName: 'longOffset' }).formatToParts(ahora).map(({ type, value }) => [type, value]));
const horaMadrid = `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}${partes.timeZoneName.replace('GMT', '')}`;
const segundos = Math.floor((new Date(horaMadrid) - new Date(inicio.inicio_registrado)) / 1000);
const duracion = [Math.floor(segundos / 3600), Math.floor(segundos % 3600 / 60), segundos % 60].map((valor) => String(valor).padStart(2, '0')).join(':');
const pendiente = fase === 'verificado';
const datos = { ejecucion: 'AG-010', fase, inicio: inicio.inicio_registrado, limite: inicio.limite,
  zona: 'Europe/Madrid', fecha: horaMadrid, duracionSegundos: segundos, duracion,
  margenMinutosHastaLimite: Math.floor((new Date(inicio.limite) - new Date(horaMadrid)) / 60000),
  resultado: 'IA-01–IA-14 verificados localmente; no aceptada ni integrada.',
  git: 'Incidencia inicial de git status --short, sin salida; ningún Git posterior ni mutación Git.',
  servicios: 'Detenidos, volumen conservado',
  pendientes: ['CI remota tras push humano', 'Aceptación e integración humanas'],
};
writeFileSync(resolve(directorio, pendiente ? 'verificacion-local.json' : 'cierre.json'), JSON.stringify(datos, null, 2) + '\n');
const campos = ['AG-010', inicio.inicio_registrado, pendiente ? '' : horaMadrid,
  'Coordinador y dos implementadores; planificador y revisor independientes de solo lectura por instrucción',
  'Definir, implementar y comprobar 002 identidad y acceso',
  'Decisiones humanas AG-010; monolito, PostgreSQL, JWT RS256, refresh, CSRF y Angular; sin módulos de negocio',
  `SDD002, ADR0003, backend/V2, frontend, Compose, CI, QA y documentación; manifiesto AG010${pendiente ? '' : ';003 solo especificación borrador tras verificar002 y margen564min'}`,
  '55 backend;56 Angular;8 E2E;88 controles sesiones;Docker sin caché;503/200/persistencia;auditorías/actionlint/documentación/huellas PASS',
  `VERIFICADA LOCALMENTE. ${pendiente ? 'Cierre de ejecución pendiente.' : `Duración ${duracion}.`} R00201/R00202 corregidos;303 protegidos intactos;incidencia inicial git status de lectura sin cambios y ningún Git posterior`,
  'Push y CI remota humanos; aceptación e integración pendientes; al entregar se detiene',
  'docs/trazabilidad/AG-010-informe.md;especificaciones/002-identidad-acceso/validacion.md;qa/evidencias/ag010/;manifiesto-commits.json'];
const fila = campos.map((campo) => `"${campo.replaceAll('"', '""')}"`).join(',') + '\r\n';
writeFileSync(rutaCsv, Buffer.concat([historia, Buffer.from((historia.at(-1) === 10 ? '' : '\r\n') + fila)]));
console.log(`${fase}: ${horaMadrid}; duración ${duracion}; margen ${datos.margenMinutosHastaLimite} minutos.`);
