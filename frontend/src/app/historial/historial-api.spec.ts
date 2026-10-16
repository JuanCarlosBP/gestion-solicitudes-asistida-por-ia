import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HistorialApi } from './historial-api';
import { filtrosHistorialIniciales, TipoRecurso } from './historial-modelo';
import { paginaHistorialPrueba } from './datos-prueba';

describe('Contrato GET historial y resumen HA06/07', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it.each([
    ['SOLICITUD', 'solicitudes'],
    ['PROVEEDOR', 'proveedores'],
  ] as [TipoRecurso, string][])('consulta %s con paginado sin datos mutables', (tipo, ruta) => {
    TestBed.inject(HistorialApi)
      .consultar(
        { ...filtrosHistorialIniciales, tipoRecurso: 'PROVEEDOR', recursoId: 'omitido' },
        tipo,
        'id/ajeno',
      )
      .subscribe();
    const p = TestBed.inject(HttpTestingController).expectOne(
      `/api/${ruta}/id%2Fajeno/historial?page=0&size=20`,
    );
    expect(p.request.method).toBe('GET');
    expect(p.request.body).toBeNull();
    p.flush(paginaHistorialPrueba());
  });
  it('serializa filtros globales y offset sin perder el signo', () => {
    const filtros = {
      ...filtrosHistorialIniciales,
      actor: '00000000-0000-4000-8000-000000000001',
      desde: '2026-10-15T10:00:00+02:00',
      accion: 'APROBADA',
      tipoRecurso: 'SOLICITUD',
      recursoId: '00000000-0000-4000-8000-000000000002',
    };
    TestBed.inject(HistorialApi).consultar(filtros).subscribe();
    const p = TestBed.inject(HttpTestingController).expectOne((p) => p.url === '/api/historial');
    for (const [k, v] of Object.entries(filtros))
      if (v !== '') expect(p.request.params.get(k)).toBe(String(v));
    expect(p.request.urlWithParams).toContain('%2B02:00');
    p.flush(paginaHistorialPrueba());
  });
  it('obtiene el resumen sin filtros ni almacenamiento', () => {
    TestBed.inject(HistorialApi).resumen().subscribe();
    const p = TestBed.inject(HttpTestingController).expectOne('/api/resumen');
    expect(p.request.method).toBe('GET');
    p.flush({});
  });
});
