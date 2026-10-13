import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SaludApi } from './salud-api';
describe('Contrato de salud', () => {
  let http: HttpTestingController;
  let api: SaludApi;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(SaludApi);
  });
  afterEach(() => http.verify());
  it('consulta la ruta del mismo origen y devuelve el estado', () => {
    const recibido = vi.fn();
    api.consultar().subscribe(recibido);
    const peticion = http.expectOne('/api/salud');
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ estado: 'DISPONIBLE' });
    expect(recibido).toHaveBeenCalledWith({ estado: 'DISPONIBLE' });
  });
  it('propaga HTTP 503 al tratamiento de error', () => {
    const error = vi.fn();
    api.consultar().subscribe({ error });
    http
      .expectOne('/api/salud')
      .flush({ estado: 'NO_DISPONIBLE' }, { status: 503, statusText: 'Service Unavailable' });
    expect(error).toHaveBeenCalledOnce();
  });
  it('rechaza una respuesta con contrato incorrecto', () => {
    const error = vi.fn();
    api.consultar().subscribe({ error });
    http.expectOne('/api/salud').flush({ estado: 'desconocido' });
    expect(error).toHaveBeenCalledOnce();
  });
  it('limita la espera de una conexión sin respuesta', () => {
    vi.useFakeTimers();
    const error = vi.fn();
    api.consultar().subscribe({ error });
    const peticion = http.expectOne('/api/salud');
    vi.advanceTimersByTime(6001);
    expect(error).toHaveBeenCalledOnce();
    expect(peticion.cancelled).toBe(true);
    vi.useRealTimers();
  });
});
