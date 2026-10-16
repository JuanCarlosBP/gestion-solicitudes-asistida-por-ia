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
import { Proveedor } from './proveedor-modelo';
import { ProveedorDetalle } from './proveedor-detalle';
import { ProveedorFormulario } from './proveedor-formulario';
import { ProveedoresLista } from './proveedores-lista';
import { PermisosProveedores } from './proveedores-permisos';

const proveedor: Proveedor = {
  id: '00000000-0000-4000-8000-000000000101',
  tipo: 'PROFESIONAL',
  denominacion: 'Proveedor ficticio',
  paisFiscal: 'ES',
  identificadorFiscal: 'FIC-101',
  correoContacto: null,
  telefonoContacto: null,
  activo: true,
  version: 3,
  creadoEn: '2026-10-14T00:00:00Z',
  actualizadoEn: '2026-10-14T00:01:00Z',
};
const urlDetalle = `/api/proveedores/${proveedor.id}`;
const pagina = {
  elementos: [proveedor],
  pagina: 0,
  tamano: 20,
  totalElementos: 1,
  totalPaginas: 1,
};

describe('Páginas, permisos y navegación de proveedores', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        { provide: Autenticacion, useValue: { restaurar: () => of(undefined) } },
      ],
    });
    usarRoles(['ADMINISTRADOR']);
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function usarRoles(roles: Rol[]) {
    const sesion = TestBed.inject(SesionStore);
    sesion.establecer(
      { ...accesoPrueba, usuario: { ...accesoPrueba.usuario, roles } },
      sesion.epoca,
    );
  }
  function listado() {
    return TestBed.inject(HttpTestingController).expectOne((p) => p.url === '/api/proveedores');
  }
  async function estable(vista: RouterTestingHarness) {
    vista.detectChanges();
    await vista.fixture.whenStable();
  }
  function texto(vista: RouterTestingHarness) {
    return vista.routeNativeElement!.textContent!;
  }
  function completar(vista: RouterTestingHarness, denominacion = 'Proveedor nuevo') {
    const html = vista.routeNativeElement!;
    for (const [campo, valor] of Object.entries({
      denominacion,
      paisFiscal: 'ES',
      identificadorFiscal: 'FIC-202',
    }))
      (html.querySelector(`#${campo}`) as HTMLInputElement).value = valor;
    html.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it.each([
    [['SOLICITANTE'], false, false],
    [['SUPERVISOR'], false, false],
    [['AUDITOR'], false, true],
    [['ADMINISTRADOR'], true, true],
    [['SOLICITANTE', 'AUDITOR'], false, true],
    [['AUDITOR', 'ADMINISTRADOR'], true, true],
    [[], false, false],
  ] as [Rol[], boolean, boolean][])(
    'unión de roles %s: escritura=%s, inactivos=%s',
    (roles, escritura, inactivos) => {
      usarRoles(roles);
      const permisos = TestBed.inject(PermisosProveedores);
      expect(permisos.escribir()).toBe(escritura);
      expect(permisos.verInactivos()).toBe(inactivos);
      expect(permisos.consultar()).toBe(roles.length > 0);
    },
  );

  it('rutas sin sesión redirigen a acceso sin consultar proveedores', async () => {
    TestBed.inject(SesionStore).limpiar();
    const vista = await RouterTestingHarness.create('/proveedores');
    expect(texto(vista)).toContain('Acceso');
    TestBed.inject(HttpTestingController).expectNone((p) => p.url.startsWith('/api/proveedores'));
  });

  it.each(['/proveedores/nuevo', `/proveedores/${proveedor.id}/editar`])(
    'escritura directa %s denegada al auditor',
    async (url) => {
      usarRoles(['AUDITOR']);
      const vista = await RouterTestingHarness.create(url);
      listado().flush(pagina);
      await estable(vista);
      expect(TestBed.inject(Router).url).toBe('/proveedores');
      expect(vista.routeNativeElement!.querySelector('a[href="/proveedores/nuevo"]')).toBeNull();
    },
  );

  it('filtros esperan inicialización completa antes de permitir escritura y recuperan disponibilidad', async () => {
    const vista = await RouterTestingHarness.create('/proveedores');
    const html = vista.routeNativeElement!;
    const campo = html.querySelector<HTMLInputElement>('#buscar-denominacion')!;
    expect(campo.matches(':disabled')).toBe(true);
    expect(html.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    html.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    const consulta = listado();
    consulta.flush(pagina);
    await estable(vista);
    expect(campo.matches(':disabled')).toBe(false);
    expect(html.querySelector('form')?.getAttribute('aria-busy')).toBe('false');
    campo.value = 'Entrada después de carga';
    await estable(vista);
    expect(campo.value).toBe('Entrada después de carga');
  });

  it('listado muestra carga, resultados, filtros URL y enlace de detalle conservado', async () => {
    const vista = await RouterTestingHarness.create(
      '/proveedores?denominacion=Ficticio&activo=todos&page=1&size=5&sort=creadoEn,desc',
    );
    expect(texto(vista)).toContain('Cargando proveedores');
    const peticion = listado();
    expect(peticion.request.params.get('denominacion')).toBe('Ficticio');
    expect(peticion.request.params.get('page')).toBe('1');
    peticion.flush({ ...pagina, pagina: 1, tamano: 5, totalElementos: 11, totalPaginas: 3 });
    await estable(vista);
    expect(texto(vista)).toContain('11 proveedores encontrados');
    expect(texto(vista)).toContain('Página 2');
    expect(
      vista
        .routeNativeElement!.querySelector(`a[href^="/proveedores/${proveedor.id}"]`)
        ?.getAttribute('href'),
    ).toContain('denominacion=Ficticio');
    const componente = vista.routeDebugElement!.componentInstance as ProveedoresLista;
    componente.cambiarPagina(2);
    await estable(vista);
    const siguiente = listado();
    expect(siguiente.request.params.get('page')).toBe('2');
    // Se vacía la página anterior antes de recibir la siguiente.
    expect(componente.pagina()).toBeNull();
    siguiente.flush({ ...pagina, pagina: 2 });
  });

  it('nuevo y cancelar conservan filtros, página y orden del listado', async () => {
    const query = 'denominacion=Ficticio&page=2&size=5&sort=creadoEn,desc';
    const vista = await RouterTestingHarness.create(`/proveedores?${query}`);
    listado().flush({ ...pagina, pagina: 2 });
    await estable(vista);
    const enlace = vista
      .routeNativeElement!.querySelector('a[href^="/proveedores/nuevo"]')!
      .getAttribute('href')!;
    expect(enlace).toContain('page=2');
    await vista.navigateByUrl(enlace);
    const cancelar = vista.routeNativeElement!.querySelector('a')!.getAttribute('href')!;
    expect(cancelar).toContain('denominacion=Ficticio');
    expect(cancelar).toContain('page=2');
    expect(cancelar).toContain('sort=creadoEn,desc');
    await vista.navigateByUrl(cancelar);
    const consulta = listado();
    expect(consulta.request.params.get('page')).toBe('2');
    expect(consulta.request.params.get('size')).toBe('5');
    expect(consulta.request.params.get('sort')).toBe('creadoEn,desc');
    consulta.flush({ ...pagina, pagina: 2 });
  });

  it.each([0, 2])(
    'volver de página fuera de rango recupera página disponible con totalPaginas=%s',
    async (totalPaginas) => {
      const vista = await RouterTestingHarness.create('/proveedores?page=999');
      listado().flush({ ...pagina, pagina: 999, elementos: [], totalPaginas });
      await estable(vista);
      const anterior = Array.from(vista.routeNativeElement!.querySelectorAll('button')).find(
        (boton) => boton.textContent?.trim() === 'Anterior',
      )!;
      anterior.click();
      await estable(vista);
      const consulta = listado();
      expect(consulta.request.params.get('page')).toBe(String(Math.max(totalPaginas - 1, 0)));
      consulta.flush({ ...pagina, pagina: Math.max(totalPaginas - 1, 0), totalPaginas });
    },
  );

  it('búsqueda admite Unicode suplementario hasta límites por caracteres, sin truncar UTF-16', async () => {
    const vista = await RouterTestingHarness.create('/proveedores');
    listado().flush(pagina);
    await estable(vista);
    const html = vista.routeNativeElement!;
    const denominacion = html.querySelector('#buscar-denominacion') as HTMLInputElement;
    const fiscal = html.querySelector('#buscar-fiscal') as HTMLInputElement;
    expect(denominacion.maxLength).toBe(256);
    expect(fiscal.maxLength).toBe(128);
    denominacion.value = '😀'.repeat(65);
    fiscal.value = '😀'.repeat(33);
    html.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await estable(vista);
    const consulta = listado();
    expect(consulta.request.params.get('denominacion')).toBe('😀'.repeat(65));
    expect(consulta.request.params.get('identificadorFiscal')).toBe('😀'.repeat(33));
    consulta.flush(pagina);
  });

  it.each([
    ['buscar-denominacion', 129],
    ['buscar-fiscal', 65],
  ] as const)(
    'búsqueda rechaza límite de caracteres en %s antes de navegar',
    async (campo, longitud) => {
      const vista = await RouterTestingHarness.create('/proveedores');
      listado().flush(pagina);
      await estable(vista);
      const html = vista.routeNativeElement!;
      (html.querySelector(`#${campo}`) as HTMLInputElement).value = 'a'.repeat(longitud);
      html.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await estable(vista);
      expect(texto(vista)).toContain('Revisa los filtros');
      expect(TestBed.inject(Router).url).toBe('/proveedores');
      TestBed.inject(HttpTestingController).expectNone((p) => p.url === '/api/proveedores');
    },
  );

  it('formulario de filtros combina valores y reinicia página en URL', async () => {
    const vista = await RouterTestingHarness.create('/proveedores?page=4');
    listado().flush({ ...pagina, pagina: 4 });
    await estable(vista);
    const html = vista.routeNativeElement!;
    (html.querySelector('#buscar-denominacion') as HTMLInputElement).value = 'Álamo %_';
    (html.querySelector('#buscar-pais') as HTMLInputElement).value = 'FR';
    html.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await estable(vista);
    const peticion = listado();
    expect(peticion.request.params.get('page')).toBe('0');
    expect(peticion.request.params.get('denominacion')).toBe('Álamo %_');
    expect(peticion.request.params.get('paisFiscal')).toBe('FR');
    peticion.flush({ ...pagina, elementos: [], totalElementos: 0, totalPaginas: 0 });
    await estable(vista);
    expect(texto(vista)).toContain('No hay proveedores');
  });

  it.each([
    'page=-1',
    'page=1.5',
    'size=0',
    'size=101',
    'sort=id,asc',
    'tipo=OTRO',
    'paisFiscal=ZZ',
    'activo=otro',
    `denominacion=${'x'.repeat(129)}`,
  ])('rechaza filtro URL %s sin petición inválida', async (query) => {
    const vista = await RouterTestingHarness.create(`/proveedores?${query}`);
    expect(texto(vista)).toContain('Los filtros de la dirección no son válidos');
    TestBed.inject(HttpTestingController).expectNone((p) => p.url === '/api/proveedores');
  });

  it.each(['SOLICITANTE', 'SUPERVISOR'] as Rol[])(
    '%s no ofrece inactivos ni acepta filtro todos',
    async (rol) => {
      usarRoles([rol]);
      const vista = await RouterTestingHarness.create('/proveedores?activo=todos');
      expect(vista.routeNativeElement!.querySelector('option[value="todos"]')).toBeNull();
      expect(texto(vista)).toContain('no están permitidos');
    },
  );

  it('listado cancela petición previa y recupera un error sin contenido interno', async () => {
    const vista = await RouterTestingHarness.create('/proveedores');
    const anterior = listado();
    await vista.navigateByUrl('/proveedores?denominacion=Nueva');
    expect(anterior.cancelled).toBe(true);
    listado().flush(
      { error: '<script>SQL privado</script>' },
      { status: 503, statusText: 'Error' },
    );
    await estable(vista);
    expect(texto(vista)).not.toContain('SQL privado');
    expect(texto(vista)).toContain('Inténtalo de nuevo');
    (vista.routeDebugElement!.componentInstance as ProveedoresLista).recargar();
    listado().flush(pagina);
    await estable(vista);
    expect(texto(vista)).toContain(proveedor.denominacion);
  });

  it.each(['SOLICITANTE', 'SUPERVISOR', 'AUDITOR', 'ADMINISTRADOR'] as Rol[])(
    'detalle público para %s con controles correctos',
    async (rol) => {
      usarRoles([rol]);
      const vista = await RouterTestingHarness.create(`/proveedores/${proveedor.id}`);
      expect(texto(vista)).toContain('Cargando proveedor');
      TestBed.inject(HttpTestingController).expectOne(urlDetalle).flush(proveedor);
      await estable(vista);
      expect(texto(vista)).toContain('Sin indicar');
      expect(texto(vista).includes('Editar proveedor')).toBe(rol === 'ADMINISTRADOR');
      expect(texto(vista).includes('Desactivar proveedor')).toBe(rol === 'ADMINISTRADOR');
    },
  );

  it('404 de detalle no revela proveedor y permite recarga', async () => {
    const vista = await RouterTestingHarness.create(`/proveedores/${proveedor.id}`);
    TestBed.inject(HttpTestingController)
      .expectOne(urlDetalle)
      .flush({ detalle: proveedor }, { status: 404, statusText: 'Not found' });
    await estable(vista);
    expect(texto(vista)).toContain('no existe o no está disponible');
    expect(texto(vista)).not.toContain(proveedor.identificadorFiscal);
  });

  it('desactiva/reactiva, evita doble envío y conserva versión recibida', async () => {
    const vista = await RouterTestingHarness.create(`/proveedores/${proveedor.id}`);
    TestBed.inject(HttpTestingController).expectOne(urlDetalle).flush(proveedor);
    await estable(vista);
    const componente = vista.routeDebugElement!.componentInstance as ProveedorDetalle;
    componente.cambiarEstado();
    componente.cambiarEstado();
    TestBed.inject(HttpTestingController)
      .expectOne(`${urlDetalle}/desactivar`)
      .flush({ ...proveedor, activo: false, version: 4 });
    await estable(vista);
    expect(texto(vista)).toContain('Proveedor desactivado');
    componente.cambiarEstado();
    const reactivar = TestBed.inject(HttpTestingController).expectOne(`${urlDetalle}/reactivar`);
    expect(reactivar.request.body).toEqual({ version: 4 });
    reactivar.flush({ ...proveedor, activo: true, version: 5 });
    await estable(vista);
    expect(texto(vista)).toContain('Proveedor reactivado');
  });

  it('conflicto de estado exige recarga y no sobrescribe', async () => {
    const vista = await RouterTestingHarness.create(`/proveedores/${proveedor.id}`);
    TestBed.inject(HttpTestingController).expectOne(urlDetalle).flush(proveedor);
    await estable(vista);
    const componente = vista.routeDebugElement!.componentInstance as ProveedorDetalle;
    componente.cambiarEstado();
    TestBed.inject(HttpTestingController)
      .expectOne(`${urlDetalle}/desactivar`)
      .flush({ error: 'VERSION_OBSOLETA' }, { status: 409, statusText: 'Conflict' });
    await estable(vista);
    expect(texto(vista)).toContain('Otro usuario');
    componente.cambiarEstado();
    TestBed.inject(HttpTestingController).expectNone(`${urlDetalle}/desactivar`);
    componente.recargar();
    TestBed.inject(HttpTestingController)
      .expectOne(urlDetalle)
      .flush({ ...proveedor, version: 4 });
    await estable(vista);
    expect(componente.conflicto()).toBe(false);
  });

  it('alta tiene etiquetas, valida campos antes de enviar y conserva entrada al duplicar', async () => {
    const vista = await RouterTestingHarness.create('/proveedores/nuevo');
    const html = vista.routeNativeElement!;
    for (const campo of html.querySelectorAll('input,select'))
      expect(html.querySelector(`label[for="${campo.id}"]`)).not.toBeNull();
    html.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await estable(vista);
    expect(texto(vista)).toContain('Los datos no se han guardado');
    expect(html.querySelector('#denominacion')?.getAttribute('aria-invalid')).toBe('true');
    TestBed.inject(HttpTestingController).expectNone('/api/proveedores');
    completar(vista);
    html.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    TestBed.inject(HttpTestingController)
      .expectOne('/api/proveedores')
      .flush({ error: 'PROVEEDOR_DUPLICADO' }, { status: 409, statusText: 'Conflict' });
    await estable(vista);
    expect(texto(vista)).toContain('incluso si está inactivo');
    expect((html.querySelector('#denominacion') as HTMLInputElement).value).toBe('Proveedor nuevo');
  });

  it('alta válida navega al detalle conservando filtros sin persistir almacenamiento web', async () => {
    const persistir = vi.spyOn(Storage.prototype, 'setItem');
    const vista = await RouterTestingHarness.create('/proveedores/nuevo?denominacion=Filtro');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    completar(vista);
    const peticion = TestBed.inject(HttpTestingController).expectOne('/api/proveedores');
    expect(peticion.request.body.correoContacto).toBeNull();
    peticion.flush(proveedor);
    await estable(vista);
    expect(navegar).toHaveBeenCalledWith(['/proveedores', proveedor.id], {
      queryParamsHandling: 'preserve',
    });
    expect(persistir).not.toHaveBeenCalled();
    persistir.mockRestore();
  });

  it('edición conserva entrada al conflicto y recarga antes de usar versión vigente', async () => {
    const vista = await RouterTestingHarness.create(`/proveedores/${proveedor.id}/editar`);
    TestBed.inject(HttpTestingController).expectOne(urlDetalle).flush(proveedor);
    await estable(vista);
    completar(vista, 'Cambio sin guardar');
    const guardar = TestBed.inject(HttpTestingController).expectOne(urlDetalle);
    expect(guardar.request.method).toBe('PUT');
    expect(guardar.request.body.version).toBe(3);
    guardar.flush({ error: 'VERSION_OBSOLETA' }, { status: 409, statusText: 'Conflict' });
    await estable(vista);
    expect(
      (vista.routeNativeElement!.querySelector('#denominacion') as HTMLInputElement).value,
    ).toBe('Cambio sin guardar');
    expect(
      vista.routeNativeElement!.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled,
    ).toBe(true);
    const componente = vista.routeDebugElement!.componentInstance as ProveedorFormulario;
    componente.recargar();
    TestBed.inject(HttpTestingController)
      .expectOne(urlDetalle)
      .flush({ ...proveedor, denominacion: 'Cambio concurrente', version: 4 });
    await estable(vista);
    expect(
      (vista.routeNativeElement!.querySelector('#denominacion') as HTMLInputElement).value,
    ).toBe('Cambio concurrente');
    expect(componente.proveedor()?.version).toBe(4);
  });

  it('edición 404 no presenta formulario de alta ni permite escribir', async () => {
    const vista = await RouterTestingHarness.create(`/proveedores/${proveedor.id}/editar`);
    TestBed.inject(HttpTestingController)
      .expectOne(urlDetalle)
      .flush({}, { status: 404, statusText: 'Not found' });
    await estable(vista);
    expect(vista.routeNativeElement!.querySelector('form')).toBeNull();
    expect(texto(vista)).toContain('no existe o no está disponible');
  });
});
