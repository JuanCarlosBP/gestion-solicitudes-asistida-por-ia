import { expect, Page, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

type RolDemo = 'ADMINISTRADOR' | 'SOLICITANTE' | 'SUPERVISOR' | 'AUDITOR';

async function acceder(page: Page, rol: RolDemo) {
  await page.goto('/acceso');
  await page
    .getByLabel('Correo electrónico', { exact: true })
    .fill(process.env[`DEMO_${rol}_CORREO`] ?? `${rol.toLowerCase()}@demo.invalid`);
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill(process.env[`DEMO_${rol}_CLAVE`] ?? `Ejemplo local ${rol.toLowerCase()} 2026`);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/mi-cuenta$/);
}

async function rellenarProveedor(page: Page, denominacion: string, fiscal: string) {
  await page.getByLabel('Tipo *', { exact: true }).selectOption('PROFESIONAL');
  await page.getByLabel('Denominación *', { exact: false }).fill(denominacion);
  await page.getByLabel('País fiscal *', { exact: false }).fill('ES');
  await page.getByLabel('Identificador fiscal *', { exact: false }).fill(fiscal);
  await page.getByLabel('Correo de contacto', { exact: false }).fill('proveedor@demo.invalid');
  await page.getByLabel('Teléfono de contacto', { exact: false }).fill('+34 000 000 000');
}

async function captura(page: Page, nombre: string) {
  await page.screenshot({
    path: join(
      process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
      `frontend-proveedores-${nombre}.png`,
    ),
    fullPage: true,
  });
}

test('PR-10: doce pasos de proveedores con Angular, API y PostgreSQL reales', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(120000);
  const marca = randomUUID();
  const prefijo = `E2E ${marca}`;
  const fiscal = `FICTICIO-${marca}`;
  // 63 puntos de código y 90 unidades UTF-16: conserva el caso Unicode y la unicidad.
  const fiscalUnicode = '😀'.repeat(27) + marca;
  const denominacionUnicode = `${prefijo} B ${'😀'.repeat(65)}`;
  let rutaDetalle = '';
  let escriturasConCsrf = 0;
  let escriturasSinBearerOCcsrf = 0;
  page.on('request', (peticion) => {
    if (
      new URL(peticion.url()).pathname.startsWith('/api/proveedores') &&
      ['POST', 'PUT'].includes(peticion.method())
    ) {
      const cabeceras = peticion.headers();
      if (cabeceras['x-xsrf-token'] && cabeceras['authorization']?.startsWith('Bearer '))
        escriturasConCsrf++;
      else escriturasSinBearerOCcsrf++;
    }
  });

  await test.step('01 ADMINISTRADOR crea proveedor válido', async () => {
    await acceder(page, 'ADMINISTRADOR');
    await page.getByRole('link', { name: 'Proveedores', exact: true }).click();
    await page.getByRole('link', { name: 'Nuevo proveedor', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nuevo proveedor', exact: true })).toBeFocused();
    await rellenarProveedor(page, `${prefijo} A`, fiscal);
    await page.getByRole('button', { name: 'Guardar proveedor', exact: true }).click();
    await expect(page).toHaveURL(/\/proveedores\/[0-9a-f-]{36}$/);
    rutaDetalle = new URL(page.url()).pathname;
    await expect(page.getByRole('heading', { name: `${prefijo} A`, exact: true })).toBeFocused();
  });

  await test.step('02 Detalle público y listado muestran la misma alta', async () => {
    await expect(page.locator('dd')).toContainText([
      'Profesional',
      'ES',
      fiscal,
      'proveedor@demo.invalid',
      '+34 000 000 000',
    ]);
    await expect(page.locator('.estado')).toHaveText('Activo');
    await captura(page, 'detalle-escritorio');
    await page.getByRole('link', { name: 'Volver a proveedores', exact: true }).click();
    await page.getByLabel('Denominación contiene', { exact: true }).fill(prefijo);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByRole('link', { name: `${prefijo} A`, exact: true })).toBeVisible();
    await page.getByRole('link', { name: `${prefijo} A`, exact: true }).click();
  });

  await test.step('03 ADMINISTRADOR modifica los datos editables', async () => {
    await page.getByRole('link', { name: 'Editar proveedor', exact: true }).click();
    await page.getByLabel('Denominación *', { exact: false }).fill(`${prefijo} A editado`);
    await page.getByRole('button', { name: 'Guardar proveedor', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: `${prefijo} A editado`, exact: true }),
    ).toBeVisible();
  });

  await test.step('04 Dos ediciones reales producen conflicto visible sin sobrescribir', async () => {
    await page.getByRole('link', { name: 'Editar proveedor', exact: true }).click();
    const concurrente = await context.newPage();
    await concurrente.goto(`${rutaDetalle}/editar`);
    await expect(concurrente.getByLabel('Denominación *', { exact: false })).toHaveValue(
      `${prefijo} A editado`,
    );
    await concurrente
      .getByLabel('Denominación *', { exact: false })
      .fill(`${prefijo} A concurrente`);
    await concurrente.getByRole('button', { name: 'Guardar proveedor', exact: true }).click();
    await expect(
      concurrente.getByRole('heading', { name: `${prefijo} A concurrente`, exact: true }),
    ).toBeVisible();
    await page.getByLabel('Denominación *', { exact: false }).fill(`${prefijo} cambio obsoleto`);
    await page.getByRole('button', { name: 'Guardar proveedor', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Otro usuario ha cambiado este proveedor');
    await expect(page.getByRole('alert')).toBeFocused();
    await expect(page.getByLabel('Denominación *', { exact: false })).toHaveValue(
      `${prefijo} cambio obsoleto`,
    );
    await expect(
      page.getByRole('button', { name: 'Guardar proveedor', exact: true }),
    ).toBeDisabled();
    await captura(page, 'conflicto');
    await page.getByRole('button', { name: 'Recargar datos', exact: true }).click();
    await expect(page.getByLabel('Denominación *', { exact: false })).toHaveValue(
      `${prefijo} A concurrente`,
    );
    await expect(
      page.getByRole('button', { name: 'Guardar proveedor', exact: true }),
    ).toBeEnabled();
    await concurrente.close();
  });

  await test.step('05 ADMINISTRADOR desactiva y conserva detalle', async () => {
    await page.getByRole('link', { name: 'Cancelar y volver', exact: true }).click();
    await page.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
    await expect(page.locator('.estado')).toHaveText('Inactivo');
    await expect(page.getByRole('status')).toHaveText('Proveedor desactivado.');
  });

  await test.step('06 SOLICITANTE y SUPERVISOR no ven el inactivo', async () => {
    for (const rol of ['SOLICITANTE', 'SUPERVISOR'] as const) {
      const separado = await browser.newContext({
        baseURL: process.env['BASE_URL'] ?? 'http://127.0.0.1:18080',
      });
      try {
        const lector = await separado.newPage();
        await acceder(lector, rol);
        await lector.goto(`/proveedores?denominacion=${encodeURIComponent(prefijo)}`);
        await expect(
          lector.getByText('No hay proveedores para estos filtros o esta página.'),
        ).toBeVisible();
        await expect(
          lector.getByRole('link', { name: 'Nuevo proveedor', exact: true }),
        ).toHaveCount(0);
        await expect(lector.locator('option[value="todos"]')).toHaveCount(0);
        await lector.goto(rutaDetalle);
        await expect(lector.getByRole('alert')).toHaveText(
          'El proveedor no existe o no está disponible para tu cuenta.',
        );
      } finally {
        await separado.close();
      }
    }
  });

  await test.step('07 AUDITOR ve inactivo y carece de escritura', async () => {
    const separado = await browser.newContext({
      baseURL: process.env['BASE_URL'] ?? 'http://127.0.0.1:18080',
    });
    try {
      const auditor = await separado.newPage();
      await acceder(auditor, 'AUDITOR');
      await auditor.goto(`/proveedores?denominacion=${encodeURIComponent(prefijo)}&activo=false`);
      await auditor.getByRole('link', { name: `${prefijo} A concurrente`, exact: true }).click();
      await expect(auditor.locator('.estado')).toHaveText('Inactivo');
      await expect(
        auditor.getByRole('link', { name: 'Editar proveedor', exact: true }),
      ).toHaveCount(0);
      await expect(
        auditor.getByRole('button', { name: 'Reactivar proveedor', exact: true }),
      ).toHaveCount(0);
      await captura(auditor, 'auditor');
      await auditor.goto(`${rutaDetalle}/editar`);
      await expect(auditor).toHaveURL(/\/proveedores$/);
    } finally {
      await separado.close();
    }
  });

  await test.step('08 ADMINISTRADOR reactiva', async () => {
    await page.getByRole('button', { name: 'Reactivar proveedor', exact: true }).click();
    await expect(page.locator('.estado')).toHaveText('Activo');
    await expect(page.getByRole('status')).toHaveText('Proveedor reactivado.');
  });

  await test.step('09 Duplicado se explica y conserva los datos introducidos', async () => {
    await page.goto('/proveedores/nuevo');
    await rellenarProveedor(page, `${prefijo} duplicado`, fiscal);
    await page.getByRole('button', { name: 'Guardar proveedor', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(
      'Ya existe un proveedor con ese país e identificador fiscal',
    );
    await expect(page.getByRole('alert')).toBeFocused();
    await expect(page.getByLabel('Denominación *', { exact: false })).toHaveValue(
      `${prefijo} duplicado`,
    );
  });

  await test.step('10 Búsqueda combinada, orden y páginas con datos reales', async () => {
    await rellenarProveedor(page, denominacionUnicode, fiscalUnicode);
    await page.getByRole('button', { name: 'Guardar proveedor', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: denominacionUnicode, exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Volver a proveedores', exact: true }).click();
    // El foco se asigna después de completar y renderizar la consulta inicial.
    // Evita escribir filtros mientras Angular todavía restaura los de la URL.
    await expect(page.getByRole('heading', { name: 'Proveedores', exact: true })).toBeFocused();
    await expect(page.getByRole('form', { name: 'Filtros de proveedores' })).toHaveAttribute(
      'aria-busy',
      'false',
    );
    await page.getByLabel('Denominación contiene', { exact: true }).fill(denominacionUnicode);
    await page.getByLabel('Identificador fiscal exacto', { exact: true }).fill(fiscalUnicode);
    await expect(page.getByLabel('Identificador fiscal exacto', { exact: true })).toHaveValue(
      fiscalUnicode,
    );
    await page.getByLabel('Tipo', { exact: true }).selectOption('PROFESIONAL');
    await page.getByLabel('País fiscal (ISO, dos letras)', { exact: true }).fill('ES');
    await page.getByLabel('Resultados por página (1–100)', { exact: true }).fill('1');
    await page.getByLabel('Orden', { exact: true }).selectOption('denominacion,asc');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.get('denominacion') === denominacionUnicode &&
        url.searchParams.get('identificadorFiscal') === fiscalUnicode &&
        url.searchParams.get('size') === '1',
    );
    await expect(page.getByRole('status')).toHaveText('1 proveedores encontrados.');
    await expect(page.getByRole('link', { name: denominacionUnicode, exact: true })).toBeVisible();
    await page.getByLabel('Denominación contiene', { exact: true }).fill(prefijo);
    await page.getByLabel('Identificador fiscal exacto', { exact: true }).fill('');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('2 proveedores encontrados.');
    await expect(page.locator('.proveedores li')).toHaveCount(1);
    await expect(
      page.getByRole('link', { name: `${prefijo} A concurrente`, exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(page.getByRole('link', { name: denominacionUnicode, exact: true })).toBeVisible();
    await expect(page).toHaveURL(/page=1/);
  });

  await test.step('11 Recarga restaura sesión, filtros y página sin web storage', async () => {
    const url = page.url();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Proveedores', exact: true })).toBeFocused();
    await expect(page).toHaveURL(url);
    await expect(page.getByLabel('Denominación contiene', { exact: true })).toHaveValue(prefijo);
    await expect(page.getByRole('link', { name: denominacionUnicode, exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0),
    ).toBe(true);
  });

  await test.step('12 Móvil, teclado, foco, etiquetas y mensajes', async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await captura(page, 'lista-movil');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('link', { name: 'Nuevo proveedor', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nuevo proveedor', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Tipo *', { exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Denominación *', { exact: false })).toBeFocused();
    await page.getByRole('button', { name: 'Guardar proveedor', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alert')).toContainText('Los datos no se han guardado');
    await expect(page.getByRole('alert')).toBeFocused();
    await expect(page.getByLabel('Denominación *', { exact: false })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await captura(page, 'formulario-movil');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(escriturasConCsrf).toBeGreaterThanOrEqual(7);
    expect(escriturasSinBearerOCcsrf).toBe(0);
  });
});
