import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { borradorPrueba, paginaPrueba, solicitudPrueba, supervisorPrueba } from './datos-prueba';
import { filtrosSolicitudesIniciales } from './solicitud-modelo';
import { SolicitudesApi } from './solicitudes-api';
import { prepararOperacionesPrueba } from '../operaciones/datos-prueba';

beforeEach(prepararOperacionesPrueba);

describe('Contrato HTTP SCI-01–11', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  const url = `/api/solicitudes/${solicitudPrueba.id}`;
  it('lista con todos los filtros, orden y paginación exactos', () => {
    const filtros = {
      ...filtrosSolicitudesIniciales,
      numero: solicitudPrueba.numero,
      asunto: 'Árbol %_\\',
      estado: 'BORRADOR',
      proveedor: solicitudPrueba.proveedorId!,
      autor: solicitudPrueba.autor.id,
      supervisor: supervisorPrueba.id,
      fechaDesde: '2026-01-01',
      fechaHasta: '2026-12-31',
      page: 1,
      size: 7,
      sort: 'importeTotal,asc' as const,
    };
    TestBed.inject(SolicitudesApi).listar(filtros).subscribe();
    const peticion = TestBed.inject(HttpTestingController).expectOne(
      (p) => p.url === '/api/solicitudes',
    );
    for (const [clave, valor] of Object.entries(filtros))
      expect(peticion.request.params.get(clave)).toBe(String(valor));
    peticion.flush(paginaPrueba([solicitudPrueba]));
  });
  it('omite filtros vacíos y usa 0/20/actualizadoEn desc', () => {
    TestBed.inject(SolicitudesApi).listar(filtrosSolicitudesIniciales).subscribe();
    const peticion = TestBed.inject(HttpTestingController).expectOne(
      (p) => p.url === '/api/solicitudes',
    );
    expect(peticion.request.params.keys().sort()).toEqual(['page', 'size', 'sort']);
    expect(peticion.request.params.get('sort')).toBe('actualizadoEn,desc');
    peticion.flush(paginaPrueba([]));
  });
  it('consulta detalle conservando cadenas decimales', () => {
    const recibido = vi.fn();
    TestBed.inject(SolicitudesApi).consultar(solicitudPrueba.id).subscribe(recibido);
    TestBed.inject(HttpTestingController).expectOne(url).flush(solicitudPrueba);
    expect(recibido).toHaveBeenCalledWith(solicitudPrueba);
  });
  it('alta envía únicamente asunto', () => {
    TestBed.inject(SolicitudesApi).crear('Asunto nuevo').subscribe();
    const peticion = TestBed.inject(HttpTestingController).expectOne('/api/solicitudes');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ asunto: 'Asunto nuevo' });
    expect(peticion.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
    peticion.flush(solicitudPrueba);
  });
  it('PUT elimina campos autoritativos de agregado y conceptos', () => {
    TestBed.inject(SolicitudesApi).guardar(solicitudPrueba.id, solicitudPrueba).subscribe();
    const peticion = TestBed.inject(HttpTestingController).expectOne(url);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.headers.has('Idempotency-Key')).toBe(false);
    expect(peticion.request.body).toEqual(borradorPrueba());
    peticion.flush(solicitudPrueba);
  });
  it('presentación envía clave UUID separada del cuerpo mínimo y devuelve resultado mínimo', () => {
    const clave = '00000000-0000-4000-8000-000000000501';
    TestBed.inject(SolicitudesApi).presentar(solicitudPrueba.id, 3, clave).subscribe();
    const peticion = TestBed.inject(HttpTestingController).expectOne(`${url}/presentar`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ version: 3 });
    expect(peticion.request.headers.get('Idempotency-Key')).toBe(clave);
    peticion.flush({
      id: solicitudPrueba.id,
      numero: solicitudPrueba.numero,
      estado: 'PRESENTADA',
      version: 4,
      actualizadoEn: '2026-10-14T01:00:00Z',
      presentadoEn: '2026-10-14T01:00:00Z',
      moneda: 'EUR',
      importeTotal: '21.32',
    });
  });
  it('selector supervisor limitado con búsqueda/paginación', () => {
    TestBed.inject(SolicitudesApi).supervisores('Ána %', 2).subscribe();
    const peticion = TestBed.inject(HttpTestingController).expectOne(
      (p) => p.url === '/api/identidad/supervisores',
    );
    expect(peticion.request.params.get('nombre')).toBe('Ána %');
    expect(peticion.request.params.get('size')).toBe('20');
    expect(peticion.request.params.get('page')).toBe('2');
    peticion.flush(paginaPrueba([supervisorPrueba]));
  });
  it.each([400, 401, 403, 404, 409, 500, 503])(
    'propaga fallo HTTP %s sin éxito falso',
    (status) => {
      const error = vi.fn();
      TestBed.inject(SolicitudesApi).crear('Asunto').subscribe({ error });
      TestBed.inject(HttpTestingController)
        .expectOne('/api/solicitudes')
        .flush({ error: 'CODIGO' }, { status, statusText: 'Error' });
      expect(error).toHaveBeenCalledOnce();
    },
  );
});
