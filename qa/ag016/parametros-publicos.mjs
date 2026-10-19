import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const numericas = ['cupo', 'duracion.minutos', 'pool.maximo', 'peticiones.minuto',
  'autenticacion.minuto', 'reservas.minuto', 'almacenamiento.bytes', 'metricas.segundos'];
const permitidas = new Set(['entorno', 'espacios', ...numericas]);

/** Proyección cerrada del formato generado por preparar.mjs. Nunca devuelve valores desconocidos. */
export function proyectarParametros(texto) {
  const salida = {};
  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.trim() || /^[#!]/.test(linea)) continue;
    const igual = linea.indexOf('=');
    if (igual < 1) throw Error('Formato de configuración no comprobable.');
    const clave = linea.slice(0, igual), valor = linea.slice(igual + 1);
    if (!permitidas.has(clave)) continue;
    if (Object.hasOwn(salida, clave)) throw Error('Parámetro público duplicado.');
    if (clave === 'entorno') {
      if (valor !== 'local') throw Error('Solo configuración local inventariada.');
      salida[clave] = valor;
    } else if (clave === 'espacios') {
      const espacios = valor.split(',');
      if (espacios.length !== 3 || new Set(espacios).size !== 3 || espacios.some(x => !/^ag016_demo_0[1-3]$/.test(x)))
        throw Error('Inventario público no comprobable.');
      salida[clave] = espacios;
    } else {
      if (!/^\d+$/.test(valor) || !Number.isSafeInteger(Number(valor)) || Number(valor) <= 0)
        throw Error('Parámetro numérico público inválido.');
      salida[clave] = Number(valor);
    }
  }
  if ([...permitidas].some(k => !Object.hasOwn(salida, k))) throw Error('Falta un parámetro público explícito.');
  return Object.fromEntries([...permitidas].map(k => [k, salida[k]]));
}

export function parametrosPublicos(directorioSecretos) {
  return {
    runtime: proyectarParametros(readFileSync(resolve(directorioSecretos, 'runtime.properties'), 'utf8')),
    provisionador: proyectarParametros(readFileSync(resolve(directorioSecretos, 'provision.properties'), 'utf8')),
  };
}
