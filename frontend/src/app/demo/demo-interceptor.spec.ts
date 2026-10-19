import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { accesoPrueba } from '../identidad/datos-prueba';
import { SesionStore } from '../identidad/sesion-store';
import { sesionInterceptor } from '../identidad/sesion-interceptor';
import { Autenticacion } from '../identidad/autenticacion';
import { DemoContexto } from './demo-contexto';
import { demoInterceptor } from './demo-interceptor';
import { otraReserva, reservaPrueba } from './datos-prueba';

describe('AIS-02/05: cabecera de ámbito y respuestas antiguas', () => {
  let http: HttpTestingController;
  let cliente: HttpClient;
  let contexto: DemoContexto;
  let sesion: SesionStore;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([demoInterceptor, sesionInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    cliente = TestBed.inject(HttpClient);
    contexto = TestBed.inject(DemoContexto);
    contexto.establecer(reservaPrueba());
    sesion = TestBed.inject(SesionStore);
    sesion.establecer(accesoPrueba, sesion.epoca);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it.each(['/api/solicitudes', '/api/autenticacion/renovar', '/api/demo/reserva'])(
    'adjunta selector a la API propia %s',
    (url) => {
      cliente.get(url).subscribe();
      const llamada = http.expectOne(url);
      expect(llamada.request.headers.get('X-Demo-Contexto')).toBe(contexto.selector());
      llamada.flush({});
    },
  );

  it.each([
    '/api/demo',
    '/api/demo/reservas',
    '/api/demo/acceso',
    '/api/demo/reserva/liberar',
    '/api/autenticacion/csrf',
    '/api/salud',
  ])('bootstrap/autenticación no envía Bearer antiguo a %s', (url) => {
    cliente.post(url, null).subscribe();
    const llamada = http.expectOne(url);
    expect(llamada.request.headers.has('Authorization')).toBe(false);
    llamada.flush({});
  });

  it.each([
    'https://ajeno.invalid/api/solicitudes',
    '//ajeno.invalid/api/solicitudes',
    '/imagenes/demo.svg',
  ])('no expone selector ni token a %s', (url) => {
    cliente.get(url).subscribe();
    const llamada = http.expectOne(url);
    expect(llamada.request.headers.has('X-Demo-Contexto')).toBe(false);
    expect(llamada.request.headers.has('Authorization')).toBe(false);
    llamada.flush({});
  });

  it('respuesta de una generación anterior nunca llega al consumidor', () => {
    const recibir = vi.fn();
    const fallo = vi.fn();
    cliente.get('/api/solicitudes').subscribe({ next: recibir, error: fallo });
    const llamada = http.expectOne('/api/solicitudes');
    contexto.establecer(otraReserva());
    llamada.flush({ contenido: [{ id: 'anterior' }] });
    expect(recibir).not.toHaveBeenCalled();
    expect(fallo.mock.calls[0][0].message).toBe('DEMO_CONTEXTO_CAMBIADO');
  });

  it('respuesta del rol anterior nunca llega al consumidor tras cambiar la sesión', () => {
    const recibir = vi.fn();
    cliente.get('/api/historial').subscribe({ next: recibir, error: () => undefined });
    const llamada = http.expectOne('/api/historial');
    sesion.limpiar();
    llamada.flush({ contenido: [{ id: 'auditor-anterior' }] });
    expect(recibir).not.toHaveBeenCalled();
  });

  it('reserva denegada no intenta refresh ni adopta otra cookie/generación', () => {
    cliente.get('/api/solicitudes').subscribe({ error: () => undefined });
    http
      .expectOne('/api/solicitudes')
      .flush({ error: 'DEMO_RESERVA_INVALIDA' }, { status: 401, statusText: 'Unauthorized' });
    expect(contexto.reserva()).toBeNull();
    expect(sesion.autenticado()).toBe(false);
    http.expectNone('/api/autenticacion/csrf');
  });

  it('liberación espera el login en vuelo y no restaura su identidad antigua', () => {
    const auth = TestBed.inject(Autenticacion);
    auth.iniciarDemo('SOLICITANTE').subscribe({ error: () => undefined });
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/autenticacion/cerrar-sesion').flush(null);
    http.expectOne('/api/autenticacion/csrf').flush(null);
    const login = http.expectOne('/api/demo/acceso');
    auth.liberarReservaDemo().subscribe();
    http.expectNone('/api/demo/reserva/liberar');
    login.flush(accesoPrueba);
    expect(sesion.autenticado()).toBe(false);
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/demo/reserva/liberar').flush(null);
  });
});
