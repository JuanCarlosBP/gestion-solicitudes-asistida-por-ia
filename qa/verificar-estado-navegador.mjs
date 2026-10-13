import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prepararDirectorioEvidencias } from './rutas-evidencia.mjs';

const esperado = process.argv[2];
if (!['disponible', 'error'].includes(esperado)) throw new Error('Indica disponible o error.');
const directorio = prepararDirectorioEvidencias();
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:18080';
console.log(`Navegador: ${baseUrl}; evidencias: ${directorio}`);
const navegador = await chromium.launch();
try {
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
  await pagina.goto(new URL('/inicio', baseUrl).href);
  const mensaje = esperado === 'disponible' ? 'Sistema disponible' : 'Servicio no disponible';
  await pagina.getByRole('status').getByText(mensaje, { exact: false }).waitFor({ timeout: 15000 });
  const texto = await pagina.getByRole('status').innerText();
  await pagina.screenshot({ path: resolve(directorio, `inicio-${esperado}.png`), fullPage: true });
  writeFileSync(resolve(directorio, `navegador-${esperado}.json`), JSON.stringify({ fecha: new Date().toISOString(), baseUrl, esperado: mensaje, observado: texto, resultado: 'PASS', origen: 'PostgreSQL real de Compose, sin interceptar HTTP' }, null, 2));
} finally {
  await navegador.close();
}
