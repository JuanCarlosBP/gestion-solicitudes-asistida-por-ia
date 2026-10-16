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
import { paginaPrueba, solicitudPrueba, supervisorPrueba } from './datos-prueba';
import { SolicitudDetalle } from './solicitud-detalle';
import { SolicitudFormulario } from './solicitud-formulario';
import { DetalleSolicitud } from './solicitud-modelo';
import { SolicitudesLista } from './solicitudes-lista';
import { PermisosSolicitudes } from './solicitudes-permisos';

const url = `/api/solicitudes/${solicitudPrueba.id}`;
const presentada: DetalleSolicitud = {
  ...solicitudPrueba,
  estado: 'PRESENTADA',
  version: 4,
  presentadoEn: '2026-10-14T01:00:00Z',
  proveedor: { ...solicitudPrueba.proveedor!, activo: null },
};
const resultadoPresentacion = {
  id: presentada.id,
  numero: presentada.numero,
  estado: presentada.estado,
  version: presentada.version,
  actualizadoEn: presentada.actualizadoEn,
  presentadoEn: presentada.presentadoEn,
  moneda: presentada.moneda,
  importeTotal: presentada.importeTotal,
};

describe('Solicitudes: páginas, rutas y permisos SCI-01–12', () => {
  beforeEach(() => {
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
    roles(['SOLICITANTE']);
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function roles(roles: Rol[]) {
    const sesion = TestBed.inject(SesionStore);
    sesion.establecer(
      { ...accesoPrueba, usuario: { ...accesoPrueba.usuario, roles } },
      sesion.epoca,
    );
  }
  function http() {
    return TestBed.inject(HttpTestingController);
  }
  function texto(vista: RouterTestingHarness) {
    return vista.routeNativeElement!.textContent!;
  }
  async function estable(vista: RouterTestingHarness) {
    vista.detectChanges();
    await vista.fixture.whenStable();
  }
  function lista() {
    return http().expectOne((p) => p.url === '/api/solicitudes');
  }
  function selectores() {
    http()
      .expectOne((p) => p.url === '/api/proveedores')
      .flush(
        paginaPrueba([
          {
            ...solicitudPrueba.proveedor,
            version: 0,
            creadoEn: solicitudPrueba.creadoEn,
            actualizadoEn: solicitudPrueba.actualizadoEn,
          },
        ]),
      );
    http()
      .expectOne((p) => p.url === '/api/identidad/supervisores')
      .flush(paginaPrueba([supervisorPrueba]));
  }
  async function editor(actual = solicitudPrueba) {
    const vista = await RouterTestingHarness.create(`/solicitudes/${actual.id}/editar`);
    http().expectOne(url).flush(actual);
    vista.detectChanges();
    if (TestBed.inject(PermisosSolicitudes).editar(actual)) selectores();
    await estable(vista);
    return vista;
  }
  async function detalle(actual = solicitudPrueba) {
    const vista = await RouterTestingHarness.create(`/solicitudes/${actual.id}`);
    http().expectOne(url).flush(actual);
    await estable(vista);
    return vista;
  }
  function campo(vista: RouterTestingHarness, id: string, valor: string) {
    const input = vista.routeNativeElement!.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function enviar(vista: RouterTestingHarness) {
    vista
      .routeNativeElement!.querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it.each([
    [['SOLICITANTE'], true, false],
    [['SUPERVISOR'], false, false],
    [['AUDITOR'], false, true],
    [['ADMINISTRADOR'], false, true],
    [['ADMINISTRADOR', 'SOLICITANTE'], true, true],
    [['SUPERVISOR', 'SOLICITANTE'], true, false],
    [[], false, false],
  ] as [Rol[], boolean, boolean][])(
    'unión de roles %s: crear=%s global=%s',
    (valores, crear, global) => {
      roles(valores);
      const permisos = TestBed.inject(PermisosSolicitudes);
      expect(permisos.crear()).toBe(crear);
      expect(permisos.global()).toBe(global);
      expect(permisos.consultar()).toBe(valores.length > 0);
      expect(permisos.editar(solicitudPrueba)).toBe(crear);
      expect(permisos.editar(presentada)).toBe(false);
      expect(permisos.editar({ ...solicitudPrueba, autor: supervisorPrueba })).toBe(false);
    },
  );
  it('sin sesión redirige a acceso sin cargar solicitudes', async () => {
    TestBed.inject(SesionStore).limpiar();
    const vista = await RouterTestingHarness.create('/solicitudes');
    expect(texto(vista)).toContain('Acceso');
    http().expectNone((p) => p.url.startsWith('/api/solicitudes'));
  });
  it.each(['SUPERVISOR', 'AUDITOR', 'ADMINISTRADOR'] as Rol[])(
    '%s no puede abrir nueva ni recibe controles de alta',
    async (rol) => {
      roles([rol]);
      const vista = await RouterTestingHarness.create('/solicitudes/nueva');
      lista().flush(paginaPrueba([]));
      await estable(vista);
      expect(TestBed.inject(Router).url).toBe('/solicitudes');
      expect(texto(vista)).not.toContain('Nueva solicitud');
    },
  );
  it('sin roles redirige a cuenta', async () => {
    roles([]);
    const vista = await RouterTestingHarness.create('/solicitudes');
    await estable(vista);
    expect(TestBed.inject(Router).url).toBe('/mi-cuenta');
  });
  it('listado muestra carga, total, estados, importes y enlaces con filtros', async () => {
    const vista = await RouterTestingHarness.create('/solicitudes?asunto=Material&size=1');
    expect(texto(vista)).toContain('Cargando solicitudes');
    lista().flush({
      ...paginaPrueba([solicitudPrueba]),
      totalElementos: 2,
      totalPaginas: 2,
      tamano: 1,
    });
    await estable(vista);
    expect(texto(vista)).toContain('2 solicitudes encontradas');
    expect(texto(vista)).toContain('21,32 €');
    expect(texto(vista)).toContain('Borrador');
    expect(
      vista.routeNativeElement!.querySelector('.solicitudes a')?.getAttribute('href'),
    ).toContain('asunto=Material');
    const componente = vista.routeDebugElement!.componentInstance as SolicitudesLista;
    componente.cambiarPagina(1);
    await estable(vista);
    const peticion = lista();
    expect(peticion.request.params.get('page')).toBe('1');
    expect(peticion.request.params.has('autor')).toBe(false);
    peticion.flush({ ...paginaPrueba([presentada]), pagina: 1, totalPaginas: 2 });
    await estable(vista);
    expect(TestBed.inject(Router).url).toContain('page=1');
    expect(texto(vista)).toContain('Presentada');
  });
  it('formulario de filtros navega y recarga conserva su búsqueda', async () => {
    const vista = await RouterTestingHarness.create('/solicitudes');
    lista().flush(paginaPrueba([]));
    await estable(vista);
    campo(vista, 'asunto-filtro', 'Álamo %_');
    enviar(vista);
    await estable(vista);
    const peticion = lista();
    expect(peticion.request.params.get('asunto')).toBe('Álamo %_');
    peticion.flush(paginaPrueba([]));
    await estable(vista);
    expect(texto(vista)).toContain('No hay solicitudes');
    expect(vista.routeNativeElement!.querySelector<HTMLInputElement>('#asunto-filtro')?.value).toBe(
      'Álamo %_',
    );
  });
  it('filtro autor local denegado y restablecimiento recupera listado', async () => {
    const vista = await RouterTestingHarness.create(
      `/solicitudes?autor=${solicitudPrueba.autor.id}`,
    );
    expect(texto(vista)).toContain('no están permitidos');
    http().expectNone((p) => p.url === '/api/solicitudes');
    (vista.routeDebugElement!.componentInstance as SolicitudesLista).restablecer();
    await estable(vista);
    lista().flush(paginaPrueba([]));
    await estable(vista);
    expect(texto(vista)).toContain('0 solicitudes encontradas');
  });
  it('lista cancela petición anterior y reintenta 503 sin mostrar mensaje interno', async () => {
    const vista = await RouterTestingHarness.create('/solicitudes');
    const anterior = lista();
    await vista.navigateByUrl('/solicitudes?asunto=Nuevo');
    expect(anterior.cancelled).toBe(true);
    lista().flush({ error: 'SQL privado' }, { status: 503, statusText: 'Error' });
    await estable(vista);
    expect(texto(vista)).not.toContain('SQL privado');
    expect(texto(vista)).toContain('Inténtalo de nuevo');
    (vista.routeDebugElement!.componentInstance as SolicitudesLista).recargar();
    lista().flush(paginaPrueba([solicitudPrueba]));
    await estable(vista);
    expect(texto(vista)).toContain(solicitudPrueba.asunto);
  });
  it('alta valida asunto, presenta etiquetas y nunca persiste almacenamiento web', async () => {
    const persistir = vi.spyOn(Storage.prototype, 'setItem');
    const vista = await RouterTestingHarness.create('/solicitudes/nueva?estado=BORRADOR');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(vista.routeNativeElement!.querySelector('label[for="asunto"]')).not.toBeNull();
    enviar(vista);
    await estable(vista);
    expect(texto(vista)).toContain('Los datos no se han guardado');
    expect(vista.routeNativeElement!.querySelector('#asunto')?.getAttribute('aria-invalid')).toBe(
      'true',
    );
    campo(vista, 'asunto', '  Nueva solicitud  ');
    enviar(vista);
    enviar(vista);
    const alta = http().expectOne('/api/solicitudes');
    expect(alta.request.body).toEqual({ asunto: 'Nueva solicitud' });
    alta.flush(solicitudPrueba);
    await estable(vista);
    expect(navegar).toHaveBeenCalledWith(['/solicitudes', solicitudPrueba.id, 'editar'], {
      queryParamsHandling: 'preserve',
    });
    expect(persistir).not.toHaveBeenCalled();
    persistir.mockRestore();
  });
  it('editor recupera agregado, etiquetas y estimación exacta diferenciada del total confirmado', async () => {
    const vista = await editor();
    expect(texto(vista)).toContain('Total estimado');
    expect(texto(vista)).toContain('21,32 €');
    expect(texto(vista)).toContain('Último total confirmado');
    for (const control of vista.routeNativeElement!.querySelectorAll('input,select,textarea'))
      expect(vista.routeNativeElement!.querySelector(`label[for="${control.id}"]`)).not.toBeNull();
    expect(vista.routeNativeElement!.querySelectorAll('caption').length).toBe(1);
    expect(
      vista.routeNativeElement!.querySelector<HTMLSelectElement>('#proveedor-seleccion')?.value,
    ).toBe(solicitudPrueba.proveedorId);
  });
  it('guardar colección completa conserva los UUID y elimina importes de entrada', async () => {
    const vista = await editor();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    campo(vista, 'descripcion', '  Cambiada  ');
    campo(vista, 'concepto-0-cantidad', '2');
    enviar(vista);
    const peticion = http().expectOne(url);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body.descripcion).toBe('Cambiada');
    expect(peticion.request.body.conceptos[0].cantidad).toBe('2');
    expect(peticion.request.body.conceptos[0].importeLinea).toBeUndefined();
    peticion.flush({ ...solicitudPrueba, version: 4 });
    await estable(vista);
    expect(navegar).toHaveBeenCalledWith(['/solicitudes', solicitudPrueba.id], {
      queryParamsHandling: 'preserve',
    });
  });
  it('conceptos inválidos muestran errores asociados y bloquean HTTP', async () => {
    const vista = await editor();
    campo(vista, 'concepto-0-cantidad', '-1');
    enviar(vista);
    await estable(vista);
    expect(
      vista.routeNativeElement!.querySelector('#concepto-0-cantidad')?.getAttribute('aria-invalid'),
    ).toBe('true');
    expect(texto(vista)).toContain('Mayor que 0');
    http().expectNone(url);
  });
  it('409 conserva todos los cambios y exige recarga antes de usar versión nueva', async () => {
    const vista = await editor();
    campo(vista, 'asunto', 'Cambio local');
    campo(vista, 'concepto-0-precio', '11.1234');
    enviar(vista);
    http()
      .expectOne(url)
      .flush({ error: 'VERSION_OBSOLETA' }, { status: 409, statusText: 'Conflict' });
    await estable(vista);
    expect(texto(vista)).toContain('Tus cambios siguen aquí');
    expect(vista.routeNativeElement!.querySelector<HTMLInputElement>('#asunto')?.value).toBe(
      'Cambio local',
    );
    expect(
      vista.routeNativeElement!.querySelector<HTMLInputElement>('#concepto-0-precio')?.value,
    ).toBe('11.1234');
    expect(
      vista.routeNativeElement!.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled,
    ).toBe(true);
    enviar(vista);
    http().expectNone(url);
    const componente = vista.routeDebugElement!.componentInstance as SolicitudFormulario;
    componente.recargar();
    vista.detectChanges();
    http()
      .expectOne(url)
      .flush({ ...solicitudPrueba, asunto: 'Cambio remoto', version: 4 });
    vista.detectChanges();
    selectores();
    await estable(vista);
    expect(vista.routeNativeElement!.querySelector<HTMLInputElement>('#asunto')?.value).toBe(
      'Cambio remoto',
    );
    expect(componente.conflicto()).toBe(false);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    enviar(vista);
    const nuevo = http().expectOne(url);
    expect(nuevo.request.body.version).toBe(4);
    nuevo.flush(solicitudPrueba);
    await estable(vista);
    expect(navegar).toHaveBeenCalled();
  });
  it.each(['presentada', 'ajena'])(
    'edición de %s no ofrece formulario ni mutaciones',
    async (caso) => {
      const vista = await editor(
        caso === 'presentada' ? presentada : { ...solicitudPrueba, autor: supervisorPrueba },
      );
      expect(vista.routeNativeElement!.querySelector('form')).toBeNull();
      expect(texto(vista)).toContain('no es un borrador propio');
      (vista.routeDebugElement!.componentInstance as SolicitudFormulario).guardar(
        new Event('submit'),
      );
      http().expectNone(url);
    },
  );
  it('404 de edición no se convierte en alta y permite reintentar', async () => {
    const vista = await RouterTestingHarness.create(`/solicitudes/${solicitudPrueba.id}/editar`);
    http().expectOne(url).flush({}, { status: 404, statusText: 'Not found' });
    await estable(vista);
    expect(vista.routeNativeElement!.querySelector('form')).toBeNull();
    expect(texto(vista)).toContain('Reintentar consulta');
  });
  it('proveedor invisible conserva referencia y advierte sin exponer datos', async () => {
    const vista = await editor({ ...solicitudPrueba, proveedor: null });
    expect(texto(vista)).toContain('inactivo o no está disponible');
    expect(
      (vista.routeDebugElement!.componentInstance as SolicitudFormulario).datos().proveedorId,
    ).toBe(solicitudPrueba.proveedorId);
  });
  it.each(['SOLICITANTE', 'SUPERVISOR', 'AUDITOR', 'ADMINISTRADOR'] as Rol[])(
    'detalle %s muestra fotografía presentada sin edición',
    async (rol) => {
      roles([rol]);
      const vista = await detalle(presentada);
      expect(texto(vista)).toContain('Datos del proveedor conservados');
      expect(texto(vista)).toContain('21,32 €');
      expect(texto(vista)).not.toContain('Editar borrador');
      expect(texto(vista)).not.toContain('Presentar solicitud');
    },
  );
  it('detalle inexistente/no visible responde con mensaje seguro y recarga', async () => {
    const vista = await RouterTestingHarness.create(`/solicitudes/${solicitudPrueba.id}`);
    http()
      .expectOne(url)
      .flush({ detalle: solicitudPrueba }, { status: 404, statusText: 'Not found' });
    await estable(vista);
    expect(texto(vista)).not.toContain(solicitudPrueba.asunto);
    expect(texto(vista)).toContain('no existe o no está disponible');
  });
  it('presentar requiere confirmación, evita doble envío y consulta detalle posterior', async () => {
    const vista = await detalle();
    const componente = vista.routeDebugElement!.componentInstance as SolicitudDetalle;
    componente.presentar();
    http().expectNone(`${url}/presentar`);
    componente.pedirConfirmacion();
    await estable(vista);
    expect(texto(vista)).toContain('Confirmar presentación');
    componente.cancelar();
    expect(componente.confirmar()).toBe(false);
    componente.pedirConfirmacion();
    componente.presentar();
    componente.presentar();
    const peticion = http().expectOne(`${url}/presentar`);
    expect(peticion.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
    expect(peticion.request.body).toEqual({ version: 3 });
    peticion.flush(resultadoPresentacion);
    http().expectOne(url).flush(presentada);
    await estable(vista);
    expect(texto(vista)).toContain('Solicitud presentada.');
    expect(texto(vista)).not.toContain('Editar borrador');
  });
  it('respuesta incierta conserva la misma clave y versión al reintentar', async () => {
    const vista = await detalle();
    const componente = vista.routeDebugElement!.componentInstance as SolicitudDetalle;
    componente.pedirConfirmacion();
    componente.presentar();
    const primera = http().expectOne(`${url}/presentar`);
    const clave = primera.request.headers.get('Idempotency-Key');
    primera.flush({}, { status: 503, statusText: 'Error' });
    await estable(vista);
    componente.presentar();
    const repetida = http().expectOne(`${url}/presentar`);
    expect(repetida.request.headers.get('Idempotency-Key')).toBe(clave);
    expect(repetida.request.body).toEqual(primera.request.body);
    repetida.flush(resultadoPresentacion);
    http().expectOne(url).flush(presentada);
    await estable(vista);
  });
  it('éxito de presentación con fallo GET no habilita escritura de estado obsoleto', async () => {
    const vista = await detalle();
    const componente = vista.routeDebugElement!.componentInstance as SolicitudDetalle;
    componente.pedirConfirmacion();
    componente.presentar();
    http().expectOne(`${url}/presentar`).flush(resultadoPresentacion);
    http().expectOne(url).flush({}, { status: 503, statusText: 'Error' });
    await estable(vista);
    expect(texto(vista)).toContain('presentación se ha confirmado');
    expect(componente.puedePresentar()).toBe(false);
    expect(texto(vista)).not.toContain('Editar borrador');
    componente.recargar();
    http().expectOne(url).flush(presentada);
    await estable(vista);
    expect(texto(vista)).toContain('Presentada');
  });
  it.each([
    'VERSION_OBSOLETA',
    'SOLICITUD_NO_EDITABLE',
    'PROVEEDOR_INACTIVO',
    'SUPERVISOR_INVALIDO',
  ])('presentación rechazada %s conserva detalle y estado', async (codigo) => {
    const vista = await detalle();
    const componente = vista.routeDebugElement!.componentInstance as SolicitudDetalle;
    componente.pedirConfirmacion();
    componente.presentar();
    http()
      .expectOne(`${url}/presentar`)
      .flush({ error: codigo }, { status: 409, statusText: 'Conflict' });
    await estable(vista);
    expect(componente.solicitud()?.estado).toBe('BORRADOR');
    expect(componente.aviso()).toBe('');
    expect(vista.routeNativeElement!.querySelector('[role="alert"]')).not.toBeNull();
    if (codigo === 'VERSION_OBSOLETA') {
      componente.presentar();
      http().expectNone(`${url}/presentar`);
    }
  });
});
