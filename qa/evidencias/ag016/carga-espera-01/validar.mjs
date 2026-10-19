import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

// Prueba offline: extrae la función real sin arrancar el arnés ni abrir red.
const ruta = 'qa/ag016/carga.mjs';
const fuente = readFileSync(ruta, 'utf8');
const funcion = fuente.match(/^async function hasta\(instante\) \{[\s\S]*?^\}/m)?.[0];
if (!funcion) throw new Error('FUNCION_HASTA_NO_ENCONTRADA');
const casos = [
  { nombre: 'retorno anticipado de 0,5 ms', inicio: 0, objetivo: 1000, anticipos: [0.5], esperas: 2 },
  { nombre: 'dos retornos anticipados sucesivos', inicio: 50, objetivo: 50.75, anticipos: [0.5, 0.25], esperas: 3 },
  { nombre: 'temporizador llega al plazo', inicio: 5, objetivo: 6.25, anticipos: [], esperas: 1 },
  { nombre: 'plazo ya alcanzado', inicio: 10, objetivo: 10, anticipos: [], esperas: 0 },
  { nombre: 'plazo pasado', inicio: 10, objetivo: 9, anticipos: [], esperas: 0 },
];
const resultados = [];
for (const caso of casos) {
  let ahora = caso.inicio;
  const esperas = [];
  const hasta = new Function('performance', 'esperar', `return (${funcion});`)(
    { now: () => ahora },
    async (ms) => {
      if (esperas.length >= 10) throw new Error('ESPERA_NO_TERMINA');
      const anticipo = caso.anticipos[esperas.length] ?? 0;
      esperas.push(ms);
      ahora += ms - anticipo;
    },
  );
  await hasta(caso.objetivo);
  resultados.push({
    caso: caso.nombre,
    objetivoMs: caso.objetivo,
    observadoMs: ahora,
    esperasMs: esperas,
    resultado: ahora >= caso.objetivo && esperas.length === caso.esperas ? 'PASS' : 'FAIL',
  });
}
const evidencia = {
  fecha: new Date().toISOString(),
  comando: `node qa/evidencias/ag016/carga-espera-01/validar.mjs ${process.argv[2] ?? ''}`.trim(),
  entorno: { node: process.version, plataforma: process.platform },
  criterio: 'hasta no termina antes del instante objetivo, incluso si el temporizador retorna anticipadamente',
  metodo: 'Reloj y temporizador deterministas inyectados en la función real extraída; sin HTTP ni carga',
  fuente: { ruta, sha256: createHash('sha256').update(fuente).digest('hex') },
  resultados,
  resultado: resultados.every((caso) => caso.resultado === 'PASS') ? 'PASS' : 'FAIL',
};
if (process.argv[2]) writeFileSync(process.argv[2], `${JSON.stringify(evidencia, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(evidencia, null, 2));
process.exitCode = evidencia.resultado === 'PASS' ? 0 : 1;
