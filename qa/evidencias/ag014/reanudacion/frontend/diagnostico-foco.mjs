import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
const { chromium } = await import(pathToFileURL(resolve('node_modules/playwright/index.mjs')));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  let bloqueosHandlerInline = 0;
  page.on('console', (mensaje) => {
    if (mensaje.text().includes('Executing inline event handler violates')) bloqueosHandlerInline++;
  });
  const respuesta = await page.goto('http://127.0.0.1:18080/inicio');
  await page.getByRole('heading', { name: 'Gestión de Solicitudes', exact: true }).waitFor();
  const hojas = await page.locator('link[rel=stylesheet]').evaluateAll((enlaces) => enlaces.map((enlace) => ({
    archivo: new URL(enlace.href).pathname,
    media: enlace.media,
    tieneOnload: enlace.hasAttribute('onload'),
  })));
  await page.keyboard.press('Tab');
  const foco = await page.evaluate(() => ({
    elemento: document.activeElement.tagName,
    focusVisible: document.activeElement.matches(':focus-visible'),
    outlineAncho: getComputedStyle(document.activeElement).outlineWidth,
    outlineEstilo: getComputedStyle(document.activeElement).outlineStyle,
  }));
  const resultado = { fechaUTC: new Date().toISOString(), status: respuesta.status(), cspScriptRestringido: respuesta.headers()['content-security-policy'].includes("script-src 'self'"), bloqueosHandlerInline, hojas, foco };
  await writeFile(resolve('../qa/evidencias/ag014/reanudacion/frontend/foco-diagnostico-01.json'), JSON.stringify(resultado, null, 2));
  console.log(JSON.stringify(resultado));
} finally {
  await browser.close();
}
