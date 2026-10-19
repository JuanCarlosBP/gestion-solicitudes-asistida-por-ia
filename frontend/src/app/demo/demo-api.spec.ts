import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { accesoPrueba } from '../identidad/datos-prueba';
import { Autenticacion } from '../identidad/autenticacion';
import { SesionStore } from '../identidad/sesion-store';
import { DemoApi } from './demo-api';
import { DemoContexto } from './demo-contexto';
import { demoInterceptor } from './demo-interceptor';
import { otraReserva, reservaPrueba } from './datos-prueba';

describe('DO-01/03/05: reserva y acceso demo real', () => {
  let api: DemoApi;
  let http: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([demoInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    api = TestBed.inject(DemoApi);
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('materializa CSRF, comparte reserva en vuelo y no envía un espacio elegido por el cliente', () => {
    let recibidas = 0;
    api.reservar().subscribe(() => recibidas++);
    api.reservar().subscribe(() => recibidas++);
    http.expectNone('/api/demo/reservas');
    http.expectOne('/api/autenticacion/csrf').flush(null);
    const llamada = http.expectOne('/api/demo/reservas');
    expect(llamada.request.method).toBe('POST');
    expect(llamada.request.body).toBeNull();
    llamada.flush(reservaPrueba(), { status: 201, statusText: 'Created' });
    expect(recibidas).toBe(2);
    expect(TestBed.inject(DemoContexto).reserva()).not.toBeNull();
  });

  it('cupo ocupado no crea contexto ni credenciales', () => {
    api.reservar().subscribe({ error: () => undefined });
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http
      .expectOne('/api/demo/reservas')
      .flush({ error: 'DEMO_CAPACIDAD_OCUPADA' }, { status: 409, statusText: 'Conflict' });
    expect(TestBed.inject(DemoContexto).reserva()).toBeNull();
    expect(TestBed.inject(SesionStore).autenticado()).toBe(false);
    expect(sessionStorage.length).toBe(0);
  });

  it('consulta propia no adopta una generación distinta', () => {
    const contexto = TestBed.inject(DemoContexto);
    const original = reservaPrueba();
    contexto.establecer(original);
    const recibir = vi.fn();
    const fallo = vi.fn();
    api.comprobarReserva().subscribe({ next: recibir, error: fallo });
    http.expectOne('/api/demo/reserva').flush(otraReserva());
    expect(recibir).not.toHaveBeenCalled();
    expect(fallo).toHaveBeenCalled();
    expect(contexto.reserva()).toEqual(original);
  });

  it.each(['SOLICITANTE', 'SUPERVISOR', 'AUDITOR'] as const)(
    'el botón %s autentica sin recibir ni enviar contraseña',
    (rol) => {
      TestBed.inject(DemoContexto).establecer(reservaPrueba());
      const auth = TestBed.inject(Autenticacion);
      auth.iniciarDemo(rol).subscribe();
      http.expectOne('/api/autenticacion/csrf').flush(null);
      const llamada = http.expectOne('/api/demo/acceso');
      expect(llamada.request.body).toEqual({ rol });
      llamada.flush({ ...accesoPrueba, usuario: { ...accesoPrueba.usuario, roles: [rol] } });
      expect(TestBed.inject(SesionStore).usuario()?.roles).toEqual([rol]);
      expect(sessionStorage.getItem('gs.demo.contexto.v1')).not.toContain(accesoPrueba.accessToken);
    },
  );

  it('cambio de rol espera refresh previo y una renovación nueva espera el login', () => {
    TestBed.inject(DemoContexto).establecer(reservaPrueba());
    const auth = TestBed.inject(Autenticacion);
    auth.renovar().subscribe({ error: () => undefined });
    http.expectOne('/api/autenticacion/csrf').flush(null);
    const refresh = http.expectOne('/api/autenticacion/renovar');
    auth.iniciarDemo('SUPERVISOR').subscribe();
    auth.renovar().subscribe();
    http.expectNone('/api/demo/acceso');
    refresh.flush(accesoPrueba);
    expect(TestBed.inject(SesionStore).autenticado()).toBe(false);
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/autenticacion/cerrar-sesion').flush(null);
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http
      .expectOne('/api/demo/acceso')
      .flush({ ...accesoPrueba, usuario: { ...accesoPrueba.usuario, roles: ['SUPERVISOR'] } });
    expect(TestBed.inject(SesionStore).usuario()?.roles).toEqual(['SUPERVISOR']);
  });

  it('liberar limpia contexto solo después de la confirmación del servidor', () => {
    const contexto = TestBed.inject(DemoContexto);
    contexto.establecer(reservaPrueba());
    api.liberar().subscribe();
    http.expectOne('/api/autenticacion/csrf').flush(null);
    expect(contexto.reserva()).not.toBeNull();
    http
      .expectOne('/api/demo/reserva/liberar')
      .flush(null, { status: 204, statusText: 'No Content' });
    expect(contexto.reserva()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('cambio de rol revoca por la ruta que recibe refresh antes de emitir el nuevo acceso', () => {
    TestBed.inject(DemoContexto).establecer(reservaPrueba());
    const sesion = TestBed.inject(SesionStore);
    sesion.establecer(accesoPrueba, sesion.epoca);
    TestBed.inject(Autenticacion).iniciarDemo('AUDITOR').subscribe();
    expect(sesion.autenticado()).toBe(false);
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectNone('/api/demo/acceso');
    const cierre = http.expectOne('/api/autenticacion/cerrar-sesion');
    expect(cierre.request.method).toBe('POST');
    cierre.flush(null);
    http.expectNone('/api/demo/acceso');
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http
      .expectOne('/api/demo/acceso')
      .flush({ ...accesoPrueba, usuario: { ...accesoPrueba.usuario, roles: ['AUDITOR'] } });
    expect(sesion.usuario()?.roles).toEqual(['AUDITOR']);
  });

  it('fallo al revocar el rol anterior impide iniciar otro rol', () => {
    TestBed.inject(DemoContexto).establecer(reservaPrueba());
    const sesion = TestBed.inject(SesionStore);
    sesion.establecer(accesoPrueba, sesion.epoca);
    TestBed.inject(Autenticacion)
      .iniciarDemo('SUPERVISOR')
      .subscribe({ error: () => undefined });
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http
      .expectOne('/api/autenticacion/cerrar-sesion')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(sesion.autenticado()).toBe(false);
    http.expectNone('/api/demo/acceso');
    TestBed.inject(Autenticacion).iniciarDemo('SUPERVISOR').subscribe();
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/autenticacion/cerrar-sesion').flush(null);
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/demo/acceso').flush(accesoPrueba);
  });

  it('una respuesta de login perdida exige revocación antes de reintentar otro rol', () => {
    TestBed.inject(DemoContexto).establecer(reservaPrueba());
    const auth = TestBed.inject(Autenticacion);
    auth.iniciarDemo('SOLICITANTE').subscribe({ error: () => undefined });
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/demo/acceso').error(new ProgressEvent('error'));
    expect(TestBed.inject(SesionStore).autenticado()).toBe(false);
    auth.iniciarDemo('AUDITOR').subscribe();
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectNone('/api/demo/acceso');
    http.expectOne('/api/autenticacion/cerrar-sesion').flush(null);
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/demo/acceso').flush(accesoPrueba);
  });
});
