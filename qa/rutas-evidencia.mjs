import { existsSync, lstatSync, mkdirSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const raizProyecto = resolve(import.meta.dirname, '..');

/** Resuelve rutas dentro del proyecto sin atravesar enlaces a otros destinos. */
export function rutaDelProyecto(valor) {
  const destino = resolve(raizProyecto, valor);
  const relativa = relative(raizProyecto, destino);
  if (!relativa || isAbsolute(relativa) || relativa === '..' || relativa.startsWith(`..${sep}`)) {
    throw new Error('La ruta QA debe estar dentro del proyecto y no ser su raíz.');
  }
  let actual = raizProyecto;
  for (const parte of relativa.split(sep)) {
    actual = resolve(actual, parte);
    if (existsSync(actual) && lstatSync(actual).isSymbolicLink()) {
      throw new Error('La ruta QA no puede atravesar enlaces simbólicos o junctions.');
    }
  }
  return destino;
}

/** AG-003 a AG-012 son evidencia de solo lectura, incluso con destino explícito. */
export function prepararDirectorioEvidencias(valor = process.env.QA_EVIDENCE_DIR || 'tmp/evidencias/local') {
  const destino = rutaDelProyecto(valor);
  const relativa = relative(raizProyecto, destino).replaceAll('\\', '/');
  if (/^qa\/evidencias\/ag(?:00[3-9]|01[0-2])(?:\/|$)/i.test(relativa) || /^\.git(?:\/|$)/i.test(relativa)) {
    throw new Error('El destino QA está protegido; las evidencias históricas no se pueden sobrescribir.');
  }
  mkdirSync(destino, { recursive: true });
  return destino;
}

// Entrada compartida con PowerShell: una única línea con la ruta validada.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(prepararDirectorioEvidencias(process.argv[2]));
}
