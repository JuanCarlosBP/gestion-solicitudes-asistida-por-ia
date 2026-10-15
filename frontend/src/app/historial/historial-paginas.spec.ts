import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../app.routes';
import { Autenticacion } from '../identidad/autenticacion';
import { accesoPrueba } from '../identidad/datos-prueba';
import { Rol } from '../identidad/identidad-modelo';
import { SesionStore } from '../identidad/sesion-store';
import { prepararOperacionesPrueba } from '../operaciones/datos-prueba';
import { solicitudPrueba } from '../solicitudes/datos-prueba';
import { SolicitudDetalle } from '../solicitudes/solicitud-detalle';
import { eventoPrueba, paginaHistorialPrueba } from './datos-prueba';
import { PermisosHistorial } from './historial-permisos';

describe('Historial: rutas, estados, permisos y navegación HA01/04/05/06/08', () => {
  beforeEach(() => {
    prepararOperacionesPrueba();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        {
          provide: Autenticacion,
          useValue: { restaurar: () => of(undefined), identidad: () => of(accesoPrueba.usuario) },
        },
      ],
    });
    roles(['AUDITOR']);
  });
  afterEach(() => http().verify());
  function http() {
    return TestBed.inject(HttpTestingController);
  }
  function roles(roles: Rol[]) {
    const sesion = TestBed.inject(SesionStore);
    sesion.establecer(
      { ...accesoPrueba, usuario: { ...accesoPrueba.usuario, roles } },
      sesion.epoca,
    );
  }
  function consulta(url = '/api/historial') {
    return http().expectOne((p) => p.url === url);
  }
  async function estable(vista: RouterTestingHarness) {
    vista.detectChanges();
    await vista.fixture.whenStable();
  }
  const texto = (vista: RouterTestingHarness) => vista.routeNativeElement!.textContent!;
  it.each([
    ['AUDITOR', true],
    ['ADMINISTRADOR', true],
    ['SUPERVISOR', false],
    ['SOLICITANTE', false],
  ] as [Rol, boolean][])('visibilidad global %s=%s', (rol, permitido) => {
    roles([rol]);
    expect(TestBed.inject(PermisosHistorial).global()).toBe(permitido);
  });
  it('sin sesión redirige acceso y no consulta datos', async () => {
    TestBed.inject(SesionStore).limpiar();
    const vista = await RouterTestingHarness.create('/historial');
    expect(texto(vista)).toContain('Acceso');
    http().expectNone('/api/historial');
  });
  it.each(['/historial', `/proveedores/${eventoPrueba.recursoId}/historial`])(
    'sin rol impide ruta %s',
    async (ruta) => {
      roles(['SOLICITANTE']);
      await RouterTestingHarness.create(ruta);
      expect(TestBed.inject(Router).url).toBe('/mi-cuenta');
      http().expectNone((p) => p.url.includes('historial'));
    },
  );
  it('muestra carga, zona, cobertura, evento escapado y fuente V5', async () => {
    const vista = await RouterTestingHarness.create('/historial');
    expect(texto(vista)).toContain('Cargando historial');
    consulta().flush(
      paginaHistorialPrueba([
        {
          ...eventoPrueba,
          accion: 'APROBADA',
          origen: 'DECISION_V5',
          actor: { ...eventoPrueba.actor, nombreVisible: '<b>Nombre ficticio</b>' },
          resumen: '<img src=x onerror=alert(1)>',
        },
      ]),
    );
    await estable(vista);
    expect(texto(vista)).toContain('1 eventos encontrados');
    expect(texto(vista)).toContain('Fechas mostradas en');
    expect(texto(vista)).toContain('cobertura anterior');
    expect(texto(vista)).toContain('Decisión registrada');
    expect(vista.routeNativeElement!.querySelector('.timeline b, .timeline img')).toBeNull();
    expect(vista.routeNativeElement!.querySelector('time')?.getAttribute('datetime')).toBe(
      eventoPrueba.ocurridoEn,
    );
  });
  it('directa solicitud indica historia desconocida incluso sin eventos filtrados', async () => {
    roles(['SOLICITANTE']);
    const ruta = `/solicitudes/${eventoPrueba.recursoId}/historial`;
    const vista = await RouterTestingHarness.create(`${ruta}?accion=APROBADA`);
    consulta(`/api${ruta}`).flush({
      ...paginaHistorialPrueba(),
      historiaAnteriorDesconocida: true,
    });
    await estable(vista);
    expect(texto(vista)).toContain('Historia anterior desconocida');
    expect(texto(vista)).toContain('No hay eventos registrados');
    expect(vista.routeNativeElement!.querySelector('a')?.getAttribute('href')).toBe(
      `/solicitudes/${eventoPrueba.recursoId}`,
    );
  });
  it('asocia etiquetas independientes y selecciona los veinte eventos iniciales', async () => {
    const vista = await RouterTestingHarness.create('/historial');
    consulta().flush(paginaHistorialPrueba());
    await estable(vista);
    for (const [nombre, etiqueta] of [
      ['tipoRecurso', 'Tipo de recurso'],
      ['recursoId', 'Recurso (UUID)'],
      ['accion', 'Acción'],
      ['actor', 'Actor (UUID)'],
      ['desde', 'Desde (ISO con zona)'],
      ['hasta', 'Hasta (ISO con zona)'],
      ['size', 'Eventos por página'],
    ]) {
      const control = vista.routeNativeElement!.querySelector<HTMLInputElement | HTMLSelectElement>(
        `[name="${nombre}"]`,
      )!;
      expect(control.labels).toHaveLength(1);
      expect(control.labels![0].textContent?.trim()).toBe(etiqueta);
    }
    const tamano = vista.routeNativeElement!.querySelector<HTMLSelectElement>('[name="size"]')!;
    expect(tamano.value).toBe('20');
    expect(new FormData(vista.routeNativeElement!.querySelector('form')!).get('size')).toBe('20');
  });
  it('restaura las opciones y el tamaño no predefinido de la URL', async () => {
    const vista = await RouterTestingHarness.create(
      '/historial?tipoRecurso=SOLICITUD&accion=APROBADA&size=37',
    );
    consulta().flush({ ...paginaHistorialPrueba(), tamano: 37 });
    await estable(vista);
    const valor = (nombre: string) =>
      vista.routeNativeElement!.querySelector<HTMLSelectElement>(`[name="${nombre}"]`)!.value;
    expect(valor('tipoRecurso')).toBe('SOLICITUD');
    expect(valor('accion')).toBe('APROBADA');
    expect(valor('size')).toBe('37');
    await vista.navigateByUrl('/historial?tipoRecurso=PROVEEDOR&accion=PROVEEDOR_CREADO&size=10');
    consulta().flush({ ...paginaHistorialPrueba(), tamano: 10 });
    await estable(vista);
    expect(valor('tipoRecurso')).toBe('PROVEEDOR');
    expect(valor('accion')).toBe('PROVEEDOR_CREADO');
    expect(valor('size')).toBe('10');
  });
  it('restablece campos editados sin aplicar cuando la URL ya es la inicial', async () => {
    const vista = await RouterTestingHarness.create('/historial?page=0&size=20');
    consulta().flush(paginaHistorialPrueba());
    await estable(vista);
    const control = (nombre: string) =>
      vista.routeNativeElement!.querySelector<HTMLInputElement | HTMLSelectElement>(
        `[name="${nombre}"]`,
      )!;
    control('accion').value = 'APROBADA';
    control('desde').value = '2026-10-15T00:00:00Z';
    control('size').value = '1';
    [...vista.routeNativeElement!.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Restablecer filtros'))!
      .click();
    await estable(vista);
    const recargada = consulta();
    expect(recargada.request.params.get('size')).toBe('20');
    expect(recargada.request.params.has('accion')).toBe(false);
    expect(recargada.request.params.has('desde')).toBe(false);
    recargada.flush(paginaHistorialPrueba());
    await estable(vista);
    expect(control('accion').value).toBe('');
    expect(control('desde').value).toBe('');
    expect(control('size').value).toBe('20');
  });
  it.each([401, 403, 404, 503])('HTTP%s limpia datos y devuelve error seguro', async (status) => {
    const vista = await RouterTestingHarness.create('/historial');
    consulta().flush({ secreto: 'SQL interno' }, { status, statusText: 'Error' });
    await estable(vista);
    expect(vista.routeNativeElement!.querySelector('[role="alert"]')).not.toBeNull();
    expect(texto(vista)).not.toContain('SQL interno');
    expect(vista.routeNativeElement!.querySelectorAll('.evento-historial')).toHaveLength(0);
    if (status === 404) expect(texto(vista)).toContain('no existe o no está disponible');
    vista.routeNativeElement!.querySelector<HTMLButtonElement>('.error-historial button')!.click();
    consulta().flush(paginaHistorialPrueba());
    await estable(vista);
    expect(texto(vista)).toContain('0 eventos encontrados');
  });
  it('rechaza query desconocida sin consultar y permite restablecer', async () => {
    const vista = await RouterTestingHarness.create('/historial?sort=libre');
    http().expectNone('/api/historial');
    expect(texto(vista)).toContain('filtros de la dirección no son válidos');
    [...vista.routeNativeElement!.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Restablecer'))!
      .click();
    await estable(vista);
    consulta().flush(paginaHistorialPrueba());
    await estable(vista);
    expect(texto(vista)).toContain('0 eventos encontrados');
  });
  it('aplica filtros, pagina, recarga ruta y vuelve atrás preservando URL', async () => {
    const vista = await RouterTestingHarness.create('/historial?size=1');
    consulta().flush({
      ...paginaHistorialPrueba([eventoPrueba]),
      totalPaginas: 2,
      totalElementos: 2,
      tamano: 1,
    });
    await estable(vista);
    const select = vista.routeNativeElement!.querySelector<HTMLSelectElement>('[name="accion"]')!;
    select.value = 'BORRADOR_CREADO';
    vista
      .routeNativeElement!.querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await estable(vista);
    const filtrada = consulta();
    expect(filtrada.request.params.get('accion')).toBe('BORRADOR_CREADO');
    filtrada.flush({
      ...paginaHistorialPrueba([eventoPrueba]),
      totalPaginas: 2,
      totalElementos: 2,
      tamano: 1,
    });
    await estable(vista);
    [...vista.routeNativeElement!.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Siguiente página'))!
      .click();
    await estable(vista);
    const siguiente = consulta();
    expect(siguiente.request.params.get('page')).toBe('1');
    siguiente.flush({
      ...paginaHistorialPrueba([eventoPrueba]),
      pagina: 1,
      totalPaginas: 2,
      totalElementos: 2,
      tamano: 1,
    });
    await estable(vista);
    expect(TestBed.inject(Router).url).toContain('accion=BORRADOR_CREADO');
    expect(TestBed.inject(Router).url).toContain('page=1');
    await vista.navigateByUrl('/historial?size=1&accion=BORRADOR_CREADO&page=0');
    consulta().flush(paginaHistorialPrueba([eventoPrueba]));
    await estable(vista);
    expect(texto(vista)).toContain('Página 1');
  });
  it('integrado solicitud mantiene filtros de listado y refresca con versión nueva', async () => {
    roles(['SOLICITANTE']);
    const vista = await RouterTestingHarness.create(
      `/solicitudes/${solicitudPrueba.id}?asunto=Anterior&historial_size=1`,
    );
    http().expectOne(`/api/solicitudes/${solicitudPrueba.id}`).flush(solicitudPrueba);
    await estable(vista);
    const p = consulta(`/api/solicitudes/${solicitudPrueba.id}/historial`);
    expect(p.request.params.get('size')).toBe('1');
    expect(p.request.params.has('asunto')).toBe(false);
    p.flush(paginaHistorialPrueba([eventoPrueba]));
    await estable(vista);
    expect(vista.routeNativeElement!.querySelector('app-historial-timeline')).not.toBeNull();
    const volver = vista.routeNativeElement!.querySelector<HTMLAnchorElement>('a.volver')!;
    expect(volver.getAttribute('href')).toBe('/solicitudes?asunto=Anterior');
    expect(
      vista.routeNativeElement!.querySelector('app-historial-timeline a')?.getAttribute('href'),
    ).toContain('size=1');
    const boton = [...vista.routeNativeElement!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Restablecer filtros'),
    )!;
    boton.click();
    await estable(vista);
    consulta(`/api/solicitudes/${solicitudPrueba.id}/historial`).flush(paginaHistorialPrueba());
    await estable(vista);
    expect(TestBed.inject(Router).url).toContain('asunto=Anterior');
    (vista.routeDebugElement!.componentInstance as SolicitudDetalle).actualizarDecision({
      ...solicitudPrueba,
      version: solicitudPrueba.version + 1,
      estado: 'APROBADA',
    });
    await estable(vista);
    consulta(`/api/solicitudes/${solicitudPrueba.id}/historial`).flush(
      paginaHistorialPrueba([{ ...eventoPrueba, accion: 'APROBADA', origen: 'DECISION_V5' }]),
    );
    await estable(vista);
    expect(texto(vista)).toContain('Decisión registrada');
  });
  it('recupera una validación fallida al reaplicar la misma URL válida', async () => {
    const vista = await RouterTestingHarness.create('/historial?page=0&size=20');
    consulta().flush(paginaHistorialPrueba([eventoPrueba]));
    await estable(vista);
    const desde = vista.routeNativeElement!.querySelector<HTMLInputElement>('[name="desde"]')!;
    desde.value = 'invalido';
    vista
      .routeNativeElement!.querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await estable(vista);
    expect(texto(vista)).toContain('Revisa los UUID');
    expect(vista.routeNativeElement!.querySelectorAll('.evento-historial')).toHaveLength(0);
    desde.value = '';
    vista
      .routeNativeElement!.querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await estable(vista);
    consulta().flush(paginaHistorialPrueba([eventoPrueba]));
    await estable(vista);
    expect(vista.routeNativeElement!.querySelector('[role="alert"]')).toBeNull();
  });
  it.each([
    ['SOLICITANTE', false],
    ['SUPERVISOR', false],
    ['AUDITOR', true],
    ['ADMINISTRADOR', true],
  ] as [Rol, boolean][])('proveedor integrado visible para %s=%s', async (rol, visible) => {
    roles([rol]);
    const id = eventoPrueba.recursoId;
    const vista = await RouterTestingHarness.create(`/proveedores/${id}`);
    http().expectOne(`/api/proveedores/${id}`).flush({
      id,
      tipo: 'PROFESIONAL',
      denominacion: 'Proveedor ficticio007',
      paisFiscal: 'ES',
      identificadorFiscal: 'FICTICIO007',
      correoContacto: null,
      telefonoContacto: null,
      activo: true,
      version: 0,
      creadoEn: eventoPrueba.ocurridoEn,
      actualizadoEn: eventoPrueba.ocurridoEn,
    });
    await estable(vista);
    if (visible) {
      consulta(`/api/proveedores/${id}/historial`).flush(paginaHistorialPrueba());
      await estable(vista);
    } else http().expectNone((p) => p.url.endsWith('/historial'));
    expect(vista.routeNativeElement!.querySelector('app-historial-timeline') !== null).toBe(
      visible,
    );
  });
});
