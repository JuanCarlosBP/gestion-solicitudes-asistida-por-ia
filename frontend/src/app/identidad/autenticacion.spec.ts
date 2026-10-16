import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Autenticacion } from './autenticacion';
import { SesionStore } from './sesion-store';
import { accesoPrueba } from './datos-prueba';

describe('Autenticación y restauración', () => {
  let servicio: Autenticacion;
  let sesion: SesionStore;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    servicio = TestBed.inject(Autenticacion);
    sesion = TestBed.inject(SesionStore);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('materializa CSRF antes del login y mantiene espacios de contraseña', () => {
    let recibido = false;
    servicio.iniciarSesion('persona@demo.invalid', '  contraseña ficticia  ').subscribe(() => {
      recibido = true;
    });
    http.expectNone('/api/autenticacion/iniciar-sesion');
    http
      .expectOne('/api/autenticacion/csrf')
      .flush(null, { status: 204, statusText: 'No Content' });
    const peticion = http.expectOne('/api/autenticacion/iniciar-sesion');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body.contrasena === '  contraseña ficticia  ').toBe(true);
    peticion.flush(accesoPrueba);
    expect(recibido).toBe(true);
    expect(sesion.autenticado()).toBe(true);
  });

  it('comparte restauración entre inicializador y guard y la completa una sola vez', () => {
    let resultados = 0;
    servicio.restaurar().subscribe(() => resultados++);
    servicio.restaurar().subscribe(() => resultados++);
    http.expectOne('/api/autenticacion/csrf').flush(null);
    const renovacion = http.expectOne('/api/autenticacion/renovar');
    expect(renovacion.request.body).toBeNull();
    renovacion.flush(accesoPrueba);
    servicio.restaurar().subscribe(() => resultados++);
    expect(resultados).toBe(3);
    expect(sesion.autenticado()).toBe(true);
    http.expectNone('/api/autenticacion/csrf');
  });

  it.each([401, 403, 503])('restauración fallida %s permite arrancar como anónimo', (status) => {
    let completo = false;
    servicio.restaurar().subscribe(() => (completo = true));
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/autenticacion/renovar').flush({}, { status, statusText: 'Error' });
    expect(completo).toBe(true);
    expect(sesion.autenticado()).toBe(false);
  });

  it('tolera fallo de CSRF durante el arranque sin intentar renovar', () => {
    let completo = false;
    servicio.restaurar().subscribe(() => (completo = true));
    http.expectOne('/api/autenticacion/csrf').error(new ProgressEvent('error'));
    expect(completo).toBe(true);
    http.expectNone('/api/autenticacion/renovar');
  });

  it('comparte renovación y termina aunque se cancele un consumidor', () => {
    const primero = servicio.renovar().subscribe();
    let segundo = false;
    servicio.renovar().subscribe(() => (segundo = true));
    primero.unsubscribe();
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/autenticacion/renovar').flush(accesoPrueba);
    expect(segundo).toBe(true);
    servicio.renovar().subscribe();
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/autenticacion/renovar').flush(accesoPrueba);
  });

  it('libera renovación fallida para permitir una operación posterior', () => {
    servicio.renovar().subscribe({ error: () => undefined });
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http
      .expectOne('/api/autenticacion/renovar')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    servicio.renovar().subscribe();
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/autenticacion/renovar').flush(accesoPrueba);
    expect(sesion.autenticado()).toBe(true);
  });

  it('serializa login tras renovación anterior para no sobrescribir la cookie nueva', () => {
    servicio.renovar().subscribe({ error: () => undefined });
    http.expectOne('/api/autenticacion/csrf').flush(null);
    const anterior = http.expectOne('/api/autenticacion/renovar');
    servicio.iniciarSesion('persona@demo.invalid', 'contraseña ficticia').subscribe();
    http.expectNone('/api/autenticacion/iniciar-sesion');
    anterior.flush(accesoPrueba);
    expect(sesion.autenticado()).toBe(false);
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/autenticacion/iniciar-sesion').flush(accesoPrueba);
    expect(sesion.autenticado()).toBe(true);
  });

  it.each(['renovacion', 'login'])(
    'logout espera %s tardío y no resucita la sesión',
    (operacion) => {
      const peticion =
        operacion === 'login'
          ? servicio.iniciarSesion('persona@demo.invalid', 'contraseña ficticia')
          : servicio.renovar();
      peticion.subscribe({ error: () => undefined });
      http.expectOne('/api/autenticacion/csrf').flush(null);
      const anterior = http.expectOne(
        `/api/autenticacion/${operacion === 'login' ? 'iniciar-sesion' : 'renovar'}`,
      );
      let cerrado = false;
      servicio.cerrarSesion().subscribe(() => (cerrado = true));
      const cierreCompartido = servicio.cerrarSesion();
      cierreCompartido.subscribe();
      expect(sesion.autenticado()).toBe(false);
      http.expectNone('/api/autenticacion/cerrar-sesion');
      anterior.flush(accesoPrueba);
      expect(sesion.autenticado()).toBe(false);
      http.expectOne('/api/autenticacion/csrf').flush(null);
      http
        .expectOne('/api/autenticacion/cerrar-sesion')
        .flush(null, { status: 204, statusText: 'No Content' });
      expect(cerrado).toBe(true);
      expect(sesion.token === null).toBe(true);
    },
  );

  it('limpia memoria aunque el servidor no confirme logout y permite reintentar', () => {
    sesion.establecer(accesoPrueba, sesion.epoca);
    servicio.cerrarSesion().subscribe({ error: () => undefined });
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/autenticacion/cerrar-sesion').error(new ProgressEvent('error'));
    expect(sesion.autenticado()).toBe(false);
    servicio.cerrarSesion().subscribe();
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/autenticacion/cerrar-sesion').flush(null);
  });
});
