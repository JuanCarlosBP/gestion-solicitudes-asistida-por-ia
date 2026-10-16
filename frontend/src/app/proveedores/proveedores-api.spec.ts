import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { filtrosIniciales, mensajeErrorProveedor, Proveedor } from './proveedor-modelo';
import { ProveedoresApi } from './proveedores-api';

export const proveedorPrueba: Proveedor = {
  id: '00000000-0000-4000-8000-000000000101',
  tipo: 'PROFESIONAL',
  denominacion: 'Proveedor ficticio Álamo',
  paisFiscal: 'ES',
  identificadorFiscal: 'FICTICIO-101',
  correoContacto: 'contacto@demo.invalid',
  telefonoContacto: null,
  activo: true,
  version: 3,
  creadoEn: '2026-10-14T00:00:00Z',
  actualizadoEn: '2026-10-14T00:01:00Z',
};

describe('Contrato HTTP proveedores', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista con parámetros exactos, literales Unicode y filtros combinados', () => {
    const filtros = {
      ...filtrosIniciales,
      denominacion: 'Álamo %_\\',
      identificadorFiscal: '  Ａbc  101 ',
      tipo: 'PROFESIONAL',
      paisFiscal: 'FR',
      page: 2,
      size: 5,
      activo: 'todos' as const,
      sort: 'actualizadoEn,desc' as const,
    };
    TestBed.inject(ProveedoresApi).listar(filtros).subscribe();
    const peticion = TestBed.inject(HttpTestingController).expectOne(
      (p) => p.url === '/api/proveedores',
    );
    expect(peticion.request.method).toBe('GET');
    for (const [clave, valor] of Object.entries(filtros))
      expect(peticion.request.params.get(clave)).toBe(String(valor));
    peticion.flush({ elementos: [], pagina: 2, tamano: 5, totalElementos: 0, totalPaginas: 0 });
  });

  it('omite filtros vacíos y fija valores predeterminados', () => {
    TestBed.inject(ProveedoresApi).listar(filtrosIniciales).subscribe();
    const peticion = TestBed.inject(HttpTestingController).expectOne(
      (p) => p.url === '/api/proveedores',
    );
    expect(peticion.request.params.keys().sort()).toEqual(['activo', 'page', 'size', 'sort']);
    expect(peticion.request.params.get('activo')).toBe('true');
    expect(peticion.request.params.get('size')).toBe('20');
    peticion.flush({ elementos: [], pagina: 0, tamano: 20, totalElementos: 0, totalPaginas: 0 });
  });

  it('consulta detalle y recibe el DTO público', () => {
    let recibido: Proveedor | undefined;
    TestBed.inject(ProveedoresApi)
      .consultar(proveedorPrueba.id)
      .subscribe((p) => (recibido = p));
    TestBed.inject(HttpTestingController)
      .expectOne(`/api/proveedores/${proveedorPrueba.id}`)
      .flush(proveedorPrueba);
    expect(recibido).toEqual(proveedorPrueba);
  });

  it.each(['crear', 'modificar'] as const)(
    '%s envía solo editables y versión únicamente en PUT',
    (accion) => {
      const api = TestBed.inject(ProveedoresApi);
      (accion === 'crear'
        ? api.crear(proveedorPrueba)
        : api.modificar(proveedorPrueba.id, proveedorPrueba, 3)
      ).subscribe();
      const peticion = TestBed.inject(HttpTestingController).expectOne(
        accion === 'crear' ? '/api/proveedores' : `/api/proveedores/${proveedorPrueba.id}`,
      );
      expect(peticion.request.method).toBe(accion === 'crear' ? 'POST' : 'PUT');
      expect(Object.keys(peticion.request.body).sort()).toEqual(
        [
          'correoContacto',
          'denominacion',
          'identificadorFiscal',
          'paisFiscal',
          'telefonoContacto',
          'tipo',
          ...(accion === 'modificar' ? ['version'] : []),
        ].sort(),
      );
      if (accion === 'modificar') expect(peticion.request.body.version).toBe(3);
      peticion.flush(proveedorPrueba);
    },
  );

  it.each([true, false])(
    'estado activo=%s envía POST con versión y sin campos editables',
    (activo) => {
      TestBed.inject(ProveedoresApi)
        .cambiarEstado({ ...proveedorPrueba, activo })
        .subscribe();
      const peticion = TestBed.inject(HttpTestingController).expectOne(
        `/api/proveedores/${proveedorPrueba.id}/${activo ? 'desactivar' : 'reactivar'}`,
      );
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({ version: 3 });
      peticion.flush({ ...proveedorPrueba, activo: !activo, version: 4 });
    },
  );

  it.each([400, 401, 403, 404, 409, 500, 503])(
    'propaga fallo %s sin transformarlo en éxito',
    (status) => {
      const error = vi.fn();
      TestBed.inject(ProveedoresApi).crear(proveedorPrueba).subscribe({ error });
      TestBed.inject(HttpTestingController)
        .expectOne('/api/proveedores')
        .flush({ error: 'ERROR_INTERNO' }, { status, statusText: 'Error' });
      expect(error).toHaveBeenCalledOnce();
      expect(mensajeErrorProveedor(error.mock.calls[0][0])).not.toContain('ERROR_INTERNO');
    },
  );
});
