import { expect, Page, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import {
  acceder,
  baseURL,
  borradorCompleto,
  escritura,
  RolDemo,
  Sesion,
  sesionApi,
} from './operaciones-ayudas';
import type { DetalleSolicitud } from '../src/app/solicitudes/solicitud-modelo';
import type { PaginaHistorial } from '../src/app/historial/historial-modelo';
import type { ResumenInicio } from '../src/app/historial/historial-api';
import type { Proveedor } from '../src/app/proveedores/proveedor-modelo';

test.describe('007: diez recorridos de historial y resumen', () => {
  let admin: Sesion, autor: Sesion, supervisor: Sesion;
  let aprobada: DetalleSolicitud, rechazada: DetalleSolicitud, borrador: DetalleSolicitud;
  let proveedor: Proveedor;
  let claveAprobacion: string, versionAprobacion: number;
  const sesiones: Sesion[] = [];
  test.beforeAll(async () => {
    admin = await sesionApi('ADMINISTRADOR');
    sesiones.push(admin);
    autor = await sesionApi('SOLICITANTE');
    sesiones.push(autor);
    supervisor = await sesionApi('SUPERVISOR');
    sesiones.push(supervisor);
    borrador = await borradorCompleto(
      admin,
      autor,
      supervisor,
      `Historial007 borrador ${randomUUID()}`,
    );
    async function decidir(tipo: 'aprobar' | 'rechazar') {
      const solicitud = await borradorCompleto(
        admin,
        autor,
        supervisor,
        `Historial007 ${tipo} ${randomUUID()}`,
      );
      const enviada = await autor.api.post(`/api/solicitudes/${solicitud.id}/presentar`, {
        headers: await escritura(autor.api, autor.headers),
        data: { version: solicitud.version },
      });
      expect(enviada.status()).toBe(200);
      const version = ((await enviada.json()) as { version: number }).version;
      const clave = randomUUID();
      if (tipo === 'aprobar') {
        claveAprobacion = clave;
        versionAprobacion = version;
      }
      const decision = await supervisor.api.post(`/api/solicitudes/${solicitud.id}/${tipo}`, {
        headers: await escritura(supervisor.api, supervisor.headers, clave),
        data: {
          version,
          [tipo === 'aprobar' ? 'comentario' : 'motivo']:
            'Texto privado ficticio007 que no pertenece al historial.',
        },
      });
      expect(decision.status()).toBe(200);
      const detalle = await autor.api.get(`/api/solicitudes/${solicitud.id}`, {
        headers: autor.headers,
      });
      expect(detalle.status()).toBe(200);
      return (await detalle.json()) as DetalleSolicitud;
    }
    aprobada = await decidir('aprobar');
    rechazada = await decidir('rechazar');
    const p = await admin.api.get(`/api/proveedores/${borrador.proveedorId}`, {
      headers: admin.headers,
    });
    expect(p.status()).toBe(200);
    proveedor = (await p.json()) as Proveedor;
    const editar = await admin.api.put(`/api/proveedores/${proveedor.id}`, {
      headers: await escritura(admin.api, admin.headers),
      data: {
        tipo: proveedor.tipo,
        denominacion: `${proveedor.denominacion} actualizado`,
        paisFiscal: proveedor.paisFiscal,
        identificadorFiscal: proveedor.identificadorFiscal,
        correoContacto: null,
        telefonoContacto: null,
        version: proveedor.version,
      },
    });
    expect(editar.status()).toBe(200);
    proveedor = (await editar.json()) as Proveedor;
    for (const accion of ['desactivar', 'reactivar']) {
      const estado = await admin.api.post(`/api/proveedores/${proveedor.id}/${accion}`, {
        headers: await escritura(admin.api, admin.headers),
        data: { version: proveedor.version },
      });
      expect(estado.status()).toBe(200);
      proveedor = (await estado.json()) as Proveedor;
    }
  });
  test.afterAll(async () => {
    for (const sesion of sesiones) await sesion.api.dispose();
  });
  async function historial(page: Page, id: string, recurso = 'solicitudes') {
    await page.goto(`/${recurso}/${id}/historial`);
    await expect(page.locator('.estado-consulta')).toContainText('eventos encontrados');
  }
  async function contrastes(page: Page, selectores: string[]) {
    const resultados = await page.evaluate((selectores) => {
      function luminancia(color: string): number {
        const rgb = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((c) => {
            const v = c / 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      }
      return selectores.map((selector) => {
        const elemento = document.querySelector<HTMLElement>(selector);
        if (!elemento) throw new Error(`Muestra de contraste ausente: ${selector}`);
        const color = getComputedStyle(elemento).color;
        let fondo = 'rgb(255, 255, 255)',
          actual: HTMLElement | null = elemento;
        while (actual) {
          const candidato = getComputedStyle(actual).backgroundColor;
          if (candidato !== 'transparent' && candidato !== 'rgba(0, 0, 0, 0)') {
            fondo = candidato;
            break;
          }
          actual = actual.parentElement;
        }
        const l1 = luminancia(color),
          l2 = luminancia(fondo);
        return {
          selector,
          color,
          fondo,
          contraste: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05),
        };
      });
    }, selectores);
    for (const muestra of resultados)
      expect(muestra.contraste, muestra.selector).toBeGreaterThanOrEqual(4.5);
    return resultados;
  }

  test('HA-E2E01: autor lee timeline integrado y directo con fuentes y transición real', async ({
    page,
  }) => {
    await acceder(page, 'SOLICITANTE');
    await page.goto(`/solicitudes/${aprobada.id}`);
    const timeline = page.locator('app-historial-timeline');
    await expect(timeline.locator('.evento-historial')).toHaveCount(4);
    await expect(timeline.locator('h3').first()).toHaveText('Solicitud aprobada');
    await expect(timeline).toContainText('PRESENTADA → APROBADA');
    await expect(timeline).toContainText('Decisión registrada');
    await expect(timeline).not.toContainText('Texto privado ficticio007');
    await timeline.getByRole('link', { name: 'Abrir historial completo' }).click();
    await expect(page).toHaveURL(new RegExp(`/solicitudes/${aprobada.id}/historial\\?`));
    await expect(page.locator('.evento-historial')).toHaveCount(4);
    const antes = await autor.api.get(`/api/solicitudes/${aprobada.id}/historial`, {
      headers: autor.headers,
    });
    const idsAntes = ((await antes.json()) as PaginaHistorial).elementos.map((e) => e.id);
    const replay = await supervisor.api.post(`/api/solicitudes/${aprobada.id}/aprobar`, {
      headers: await escritura(supervisor.api, supervisor.headers, claveAprobacion),
      data: {
        version: versionAprobacion,
        comentario: 'Texto privado ficticio007 que no pertenece al historial.',
      },
    });
    expect(replay.status()).toBe(200);
    const despues = await autor.api.get(`/api/solicitudes/${aprobada.id}/historial`, {
      headers: autor.headers,
    });
    expect(((await despues.json()) as PaginaHistorial).elementos.map((e) => e.id)).toEqual(
      idsAntes,
    );
    await page.reload();
    await expect(page.locator('.evento-historial')).toHaveCount(4);
  });
  test('HA-E2E02: supervisor ve rechazo y el historial omite el motivo del detalle', async ({
    page,
  }) => {
    await acceder(page, 'SUPERVISOR');
    await page.goto(`/solicitudes/${rechazada.id}`);
    await expect(page.locator('.resultado-decision')).toContainText('Texto privado ficticio007');
    const timeline = page.locator('app-historial-timeline');
    await expect(timeline.locator('h3').first()).toHaveText('Solicitud rechazada');
    await expect(timeline).not.toContainText('Texto privado ficticio007');
    await expect(timeline).toContainText('PRESENTADA → RECHAZADA');
    await timeline.getByRole('link', { name: 'Abrir historial completo' }).click();
    await page.reload();
    await expect(page.locator('.evento-historial')).toHaveCount(4);
  });
  test('HA-E2E03: global filtra, pagina, recarga y vuelve atrás con URL persistente', async ({
    page,
  }) => {
    await acceder(page, 'AUDITOR');
    await page.getByRole('link', { name: 'Historial', exact: true }).click();
    await expect(page.locator('.estado-consulta')).toContainText('eventos encontrados');
    await page.getByLabel('Tipo de recurso', { exact: true }).selectOption('SOLICITUD');
    await page.getByLabel('Recurso (UUID)', { exact: true }).fill(aprobada.id);
    await page.getByLabel('Eventos por página', { exact: true }).selectOption('1');
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
    await expect(page.locator('.evento-historial')).toHaveCount(1);
    await expect(page.locator('.estado-consulta')).toHaveText('4 eventos encontrados');
    const primera = await page.locator('.evento-historial h3').textContent();
    await page.getByRole('button', { name: 'Siguiente página de eventos', exact: true }).click();
    await expect(page).toHaveURL(/page=1/);
    await expect(page.locator('.evento-historial h3')).not.toHaveText(primera!);
    await page.reload();
    await expect(page.locator('.paginacion-historial')).toContainText('Página 2 de 4');
    await page.goBack();
    await expect(page.locator('.paginacion-historial')).toContainText('Página 1 de 4');
    await page.getByLabel('Acción', { exact: true }).selectOption('APROBADA');
    await page.getByLabel('Actor (UUID)', { exact: true }).fill(supervisor.usuarioId);
    await page
      .getByLabel('Desde (ISO con zona)', { exact: true })
      .fill('2020-01-01T00:00:00+02:00');
    await page.getByLabel('Hasta (ISO con zona)', { exact: true }).fill('2030-01-01T00:00:00Z');
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
    await expect(page.locator('.estado-consulta')).toHaveText('1 eventos encontrados');
    await expect(page.locator('.evento-historial h3')).toHaveText('Solicitud aprobada');
  });
  test('HA-E2E04: administrador y auditor consultan ciclo completo de proveedor', async ({
    page,
  }) => {
    await acceder(page, 'ADMINISTRADOR');
    await page.goto(`/proveedores/${proveedor.id}`);
    await expect(page.locator('.evento-historial')).toHaveCount(4);
    await expect(page.locator('.evento-historial h3')).toHaveText([
      'Proveedor reactivado',
      'Proveedor desactivado',
      'Proveedor modificado',
      'Proveedor creado',
    ]);
    await expect(page.locator('app-historial-timeline')).not.toContainText(
      proveedor.identificadorFiscal,
    );
    await page.getByRole('link', { name: 'Abrir historial completo' }).click();
    await expect(page.locator('.evento-historial')).toHaveCount(4);
    await page.goto(`/historial?tipoRecurso=PROVEEDOR&recursoId=${proveedor.id}`);
    await expect(page.locator('.evento-historial')).toHaveCount(4);
  });
  test('HA-E2E05: resumen corresponde a API por cuatro perfiles y conserva salud', async ({
    browser,
  }) => {
    for (const rol of ['SOLICITANTE', 'SUPERVISOR', 'AUDITOR', 'ADMINISTRADOR'] as RolDemo[]) {
      const contexto = await browser.newContext({ baseURL });
      try {
        const page = await contexto.newPage();
        await acceder(page, rol);
        const respuesta = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/resumen');
        await page.getByRole('link', { name: 'Inicio', exact: true }).click();
        const resumen = (await (await respuesta).json()) as ResumenInicio;
        await expect(page.locator('.total-resumen')).toContainText(
          `${resumen.solicitudes.total} solicitudes visibles`,
        );
        await expect(page.locator('.contadores dd')).toHaveText(
          ['BORRADOR', 'PRESENTADA', 'APROBADA', 'RECHAZADA'].map((k) =>
            String(resumen.solicitudes[k as keyof typeof resumen.solicitudes]),
          ),
        );
        await expect(page.locator('.tarjeta')).toContainText('Sistema disponible');
        await expect(page.locator('.pendientes-resumen a')).toHaveCount(
          rol === 'SOLICITANTE' || rol === 'SUPERVISOR' ? 1 : 0,
        );
      } finally {
        await contexto.close();
      }
    }
  });
  test('HA-E2E06: sin rol no hay global/proveedor y recurso ajeno equivale a inexistente', async ({
    page,
    browser,
  }) => {
    await acceder(page, 'SUPERVISOR');
    await expect(page.getByRole('link', { name: 'Historial', exact: true })).toHaveCount(0);
    for (const ruta of ['/historial', `/proveedores/${proveedor.id}/historial`]) {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/mi-cuenta$/);
    }
    let texto: string | null = null;
    for (const id of [borrador.id, randomUUID()]) {
      const respuesta = page.waitForResponse((r) =>
        r.url().includes(`/api/solicitudes/${id}/historial`),
      );
      await page.goto(`/solicitudes/${id}/historial`);
      expect((await respuesta).status()).toBe(404);
      await expect(page.getByRole('alert')).toContainText(
        'El recurso no existe o no está disponible para tu cuenta.',
      );
      const actual = await page.getByRole('alert').textContent();
      if (texto !== null) expect(actual).toBe(texto);
      texto = actual;
      await expect(page.locator('.evento-historial')).toHaveCount(0);
    }
    const correoAjeno = process.env['E2E_AJENO_CORREO'];
    if (!correoAjeno)
      throw new Error('Falta fixture E2E_AJENO_CORREO para probar solicitudes de otro autor.');
    const contexto = await browser.newContext({ baseURL });
    try {
      const ajeno = await contexto.newPage();
      await acceder(ajeno, 'SOLICITANTE', correoAjeno);
      const respuesta = ajeno.waitForResponse((r) =>
        r.url().includes(`/api/solicitudes/${aprobada.id}/historial`),
      );
      await ajeno.goto(`/solicitudes/${aprobada.id}/historial`);
      expect((await respuesta).status()).toBe(404);
      await expect(ajeno.getByRole('alert')).toContainText('no existe o no está disponible');
      await expect(ajeno.locator('.evento-historial')).toHaveCount(0);
    } finally {
      await contexto.close();
    }
  });
  test('HA-E2E07: historia anterior a V7 explícita y decisión previa conservada', async ({
    page,
  }) => {
    const id = process.env['E2E_HISTORIAL_ANTERIOR_ID'];
    if (!id || !/^[0-9a-f-]{36}$/i.test(id))
      throw new Error(
        'Falta fixture preV7 E2E_HISTORIAL_ANTERIOR_ID; no se sustituye por datos nuevos.',
      );
    await acceder(page, 'AUDITOR');
    await historial(page, id);
    await expect(page.locator('.limite-historia')).toContainText('Historia anterior desconocida');
    if (process.env['E2E_HISTORIAL_ANTERIOR_DECISION'] === 'true') {
      await expect(page.locator('.timeline')).toContainText('Decisión registrada');
    }
    await page.getByLabel('Acción', { exact: true }).selectOption('BORRADOR_CREADO');
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
    await expect(page.locator('.historial-vacio')).toBeVisible();
    await expect(page.locator('.limite-historia')).toContainText('Historia anterior desconocida');
  });
  test('HA-E2E08: vacío e inválidos muestran recuperación sin inventar eventos', async ({
    page,
  }) => {
    await acceder(page, 'AUDITOR');
    await historial(page, aprobada.id);
    await page.getByLabel('Acción', { exact: true }).selectOption('RECHAZADA');
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
    await expect(page.locator('.historial-vacio')).toHaveText(
      'No hay eventos registrados para esta consulta.',
    );
    await page.goto('/historial?size=101');
    await expect(page.getByRole('alert')).toContainText(
      'Los filtros de la dirección no son válidos',
    );
    await page.getByRole('button', { name: 'Restablecer filtros', exact: true }).click();
    await expect(page.locator('.estado-consulta')).toContainText('eventos encontrados');
    await expect(page.getByLabel('Eventos por página', { exact: true })).toHaveValue('20');
    await page.getByLabel('Acción', { exact: true }).selectOption('APROBADA');
    await page.getByLabel('Desde (ISO con zona)', { exact: true }).fill('2026-10-15T00:00:00Z');
    await page.getByLabel('Eventos por página', { exact: true }).selectOption('1');
    const restablecida = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/historial',
    );
    await page.getByRole('button', { name: 'Restablecer filtros', exact: true }).click();
    expect((await restablecida).status()).toBe(200);
    await expect(page.getByLabel('Acción', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Desde (ISO con zona)', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Eventos por página', { exact: true })).toHaveValue('20');
    await page.getByLabel('Desde (ISO con zona)', { exact: true }).fill('2026-02-30T12:00:00Z');
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Revisa los UUID y las fechas');
  });
  test('HA-E2E09: fallo de red controlado y recuperación consulta PostgreSQL real', async ({
    page,
  }) => {
    await acceder(page, 'AUDITOR');
    await page.route('**/api/historial?*', (ruta) => ruta.abort('connectionfailed'));
    await page.goto('/historial');
    await expect(page.getByRole('alert')).toContainText('No se ha podido cargar el historial');
    await expect(page.locator('.evento-historial')).toHaveCount(0);
    await page.unroute('**/api/historial?*');
    const respuesta = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/historial');
    await page.getByRole('button', { name: 'Reintentar historial', exact: true }).click();
    const datos = (await (await respuesta).json()) as PaginaHistorial;
    expect(datos.elementos.length).toBeGreaterThan(0);
    await expect(page.locator('.evento-historial')).toHaveCount(datos.elementos.length);
  });
  test('HA-E2E10: teclado, foco, etiquetas y capturas360/768/1440', async ({ page }) => {
    await acceder(page, 'AUDITOR');
    const teclado: {
      anchoVentana: number;
      accionEnfocada: boolean;
      actorEnfocado: boolean;
      ancho: string;
      estilo: string;
    }[] = [];
    const muestras: {
      ancho: number;
      pantalla: string;
      resultados: Awaited<ReturnType<typeof contrastes>>;
    }[] = [];
    for (const ancho of [360, 768, 1440]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await historial(page, aprobada.id);
      await expect(
        page.getByRole('heading', { name: 'Historial registrado', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Acción', { exact: true })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Actor (UUID)', { exact: true })).toBeFocused();
      const foco = await page.getByLabel('Actor (UUID)', { exact: true }).evaluate((el) => ({
        ancho: getComputedStyle(el).outlineWidth,
        estilo: getComputedStyle(el).outlineStyle,
      }));
      expect(foco).toEqual({ ancho: '3px', estilo: 'solid' });
      teclado.push({ anchoVentana: ancho, accionEnfocada: true, actorEnfocado: true, ...foco });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      muestras.push({
        ancho,
        pantalla: 'timeline',
        resultados: await contrastes(page, [
          '.historial-panel h2',
          '.historial-panel .ayuda',
          '.historial-panel label',
          '.evento-historial .actor',
          '.transicion span',
          '.acciones-historial button[type=submit]',
          '.acciones-historial button.secundario',
        ]),
      });
      await page.screenshot({
        path: join(
          process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
          `frontend007-timeline-${ancho}.png`,
        ),
        fullPage: true,
      });
      await page.goto(`/historial?tipoRecurso=SOLICITUD&recursoId=${aprobada.id}`);
      await expect(page.locator('.evento-historial')).toHaveCount(4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: join(
          process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
          `frontend007-global-${ancho}.png`,
        ),
        fullPage: true,
      });
      muestras.push({
        ancho,
        pantalla: 'global',
        resultados: await contrastes(page, ['.limite-historia']),
      });
      await historial(page, proveedor.id, 'proveedores');
      await expect(page.locator('.evento-historial')).toHaveCount(4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: join(
          process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
          `frontend007-proveedor-${ancho}.png`,
        ),
        fullPage: true,
      });
      await page.goto('/inicio');
      await expect(page.locator('.total-resumen')).toBeVisible();
      for (const [nombre, ruta] of [
        ['Actualizar resumen', '/api/resumen'],
        ['Volver a comprobar', '/api/salud'],
      ]) {
        const boton = page.getByRole('button', { name: nombre, exact: true });
        await expect(boton).toBeEnabled();
        const respuesta = page.waitForResponse((r) => new URL(r.url()).pathname === ruta);
        await boton.click();
        expect((await respuesta).status()).toBe(200);
        await expect(boton).toBeEnabled();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: join(
          process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
          `frontend007-resumen-${ancho}.png`,
        ),
        fullPage: true,
      });
      muestras.push({
        ancho,
        pantalla: 'resumen',
        resultados: await contrastes(page, [
          '.resumen-inicio h2',
          '.resumen-inicio .detalle',
          '.contadores dt',
          '.contadores dd',
          '.resumen-inicio button',
          '.tarjeta button',
        ]),
      });
    }
    await writeFile(
      join(process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results', 'frontend007-contrastes.json'),
      JSON.stringify(
        {
          criterio:
            'Texto normal >=4.5:1 sobre fondo computado; muestra acotada, no auditoría WCAG completa.',
          teclado,
          muestras,
        },
        null,
        2,
      ),
    );
  });
});
