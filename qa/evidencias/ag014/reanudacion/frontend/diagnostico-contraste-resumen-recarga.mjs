import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
const { chromium } = await import(pathToFileURL(resolve('node_modules/playwright/index.mjs')));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
  await page.goto('http://127.0.0.1:18080/acceso');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(process.env.DEMO_AUDITOR_CORREO ?? 'auditor@demo.invalid');
  await page.getByLabel('Contraseña', { exact: true }).fill(process.env.DEMO_AUDITOR_CLAVE ?? 'Ejemplo local auditor 2026');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.waitForURL('**/mi-cuenta');
  await page.goto('http://127.0.0.1:18080/inicio');
  await page.waitForFunction(() => document.querySelector('.resumen-inicio button')?.disabled === false);
  await page.evaluate(() => {
    window.__diagnosticoContraste = { terminado: false, muestras: [] };
    let vistoDeshabilitado = false, iniciado = false;
    const luminancia = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number).map((c) => {
      const valor = c / 255;
      return valor <= 0.04045 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
    }).reduce((suma, valor, i) => suma + valor * [0.2126, 0.7152, 0.0722][i], 0);
    new MutationObserver(() => {
      const boton = document.querySelector('.resumen-inicio button');
      if (!boton || iniciado) return;
      if (boton.disabled) { vistoDeshabilitado = true; return; }
      if (!vistoDeshabilitado) return;
      iniciado = true;
      const inicio = performance.now();
      const muestra = () => {
        const estilo = getComputedStyle(boton), l1 = luminancia(estilo.color), l2 = luminancia(estilo.backgroundColor);
        const animaciones = boton.getAnimations();
        window.__diagnosticoContraste.muestras.push({
          milisegundos: performance.now() - inicio,
          texto: estilo.color,
          fondo: estilo.backgroundColor,
          contraste: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05),
          deshabilitado: boton.disabled,
          animaciones: animaciones.length,
        });
        if (animaciones.length) requestAnimationFrame(muestra);
        else window.__diagnosticoContraste.terminado = true;
      };
      muestra();
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] });
  });
  await page.getByRole('button', { name: 'Actualizar resumen', exact: true }).click();
  await page.waitForFunction(() => window.__diagnosticoContraste?.terminado);
  const datos = await page.evaluate(() => window.__diagnosticoContraste);
  const resultado = { fechaUTC: new Date().toISOString(), ...datos };
  await writeFile(resolve('../qa/evidencias/ag014/reanudacion/frontend/contraste-resumen-recarga-01.json'), JSON.stringify(resultado, null, 2));
  console.log(JSON.stringify(resultado));
} finally { await browser.close(); }


