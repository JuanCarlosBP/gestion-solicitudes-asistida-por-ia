import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

// Escaneo acotado de evidencia nueva y salidas de prueba, sin reproducir hallazgos.
const raiz = resolve(import.meta.dirname, '../../..');
const destinos = ['qa/evidencias/ag010', 'backend/target/surefire-reports', 'backend/target/failsafe-reports', 'frontend/test-results'];
const patrones = [
  ['jwt', /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ['argon2-completo', /\$argon2id\$v=\d+\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]{12,}\$[A-Za-z0-9+/]{20,}/],
  ['refresh-completo', /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/i],
  ['clave-privada', /-----BEGIN (?:RSA )?PRIVATE KEY-----\s+[A-Za-z0-9+/=\s]{80,}/],
];
const ubicaciones = [];
let archivos = 0;
function recorrer(directorio) {
  let entradas;
  try { entradas = readdirSync(directorio, { withFileTypes: true }); } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entrada of entradas) {
    const ruta = resolve(directorio, entrada.name);
    if (entrada.isDirectory()) recorrer(ruta);
    else if (/\.(?:json|xml|txt|log|md|dump|dumpstream)$/.test(ruta)) {
      const contenido = readFileSync(ruta, 'utf8');
      archivos++;
      for (const [tipo, patron] of patrones) if (patron.test(contenido)) {
        ubicaciones.push({ ruta: relative(raiz, ruta).replaceAll('\\', '/'), tipo });
      }
    }
  }
}
for (const destino of destinos) recorrer(resolve(raiz, destino));
writeFileSync(resolve(import.meta.dirname, 'datos-sensibles-control.json'), JSON.stringify({ fecha: new Date().toISOString(),
  archivos, ubicaciones, resultado: ubicaciones.length ? 'REVISAR' : 'PASS',
  limite: 'Búsqueda acotada de formatos reconocibles en evidencia nueva y resultados. No garantiza ausencia de todo secreto; no imprime valores.' }, null, 2) + '\n');
console.log(`${archivos} archivos examinados; ${ubicaciones.length} ubicaciones requieren revisión.`);
for (const ubicacion of ubicaciones) console.log(`${ubicacion.tipo}: ${ubicacion.ruta}`);
if (ubicaciones.length) process.exitCode = 1;
