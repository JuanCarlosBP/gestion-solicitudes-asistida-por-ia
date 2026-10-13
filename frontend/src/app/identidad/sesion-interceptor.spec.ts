import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { sesionInterceptor } from './sesion-interceptor';
import { SesionStore } from './sesion-store';
import { accesoPrueba } from './datos-prueba';
import { Autenticacion } from './autenticacion';

describe('Interceptor de sesión', () => {
  let http: HttpTestingController;
  let cliente: HttpClient;
  let sesion: SesionStore;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sesionInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    cliente = TestBed.inject(HttpClient);
    sesion = TestBed.inject(SesionStore);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    sesion.establecer(accesoPrueba, sesion.epoca);
  });
  afterEach(() => http.verify());

  function fallar(url: string, status = 401): void {
    http.expectOne(url).flush({}, { status, statusText: 'Error' });
  }
  function renovar(): void {
    http.expectOne('/api/autenticacion/csrf').flush(null);
    const llamada = http.expectOne('/api/autenticacion/renovar');
    expect(llamada.request.headers.has('Authorization')).toBe(false);
    llamada.flush({ ...accesoPrueba, accessToken: 'nuevo-valor-ficticio' });
  }

  it.each([
    '/api/autenticacion/renovar',
    '/api/autenticacion/iniciar-sesion',
    '/api/autenticacion/cerrar-sesion',
    '/api/autenticacion/csrf',
    'https://ajeno.invalid/api/identidad/yo',
    '//ajeno.invalid/api/identidad/yo',
    '/recursos',
  ])('no añade Bearer a %s', (url) => {
    cliente.get(url).subscribe();
    const llamada = http.expectOne(url);
    expect(llamada.request.headers.has('Authorization')).toBe(false);
    llamada.flush({});
  });

  it('añade Bearer únicamente a la API propia incluso en URL absoluta', () => {
    const url = `${document.location.origin}/api/identidad/yo`;
    cliente.get(url).subscribe();
    const llamada = http.expectOne(url);
    expect(
      llamada.request.headers.get('Authorization') === `Bearer ${accesoPrueba.accessToken}`,
    ).toBe(true);
    llamada.flush({});
  });

  it('comparte una renovación entre 401 concurrentes y reintenta ambas', () => {
    let respuestas = 0;
    cliente.get('/api/uno').subscribe(() => respuestas++);
    cliente.get('/api/dos').subscribe(() => respuestas++);
    fallar('/api/uno');
    fallar('/api/dos');
    renovar();
    for (const url of ['/api/uno', '/api/dos']) {
      const llamada = http.expectOne(url);
      expect(llamada.request.headers.get('Authorization') === 'Bearer nuevo-valor-ficticio').toBe(
        true,
      );
      llamada.flush({});
    }
    expect(respuestas).toBe(2);
  });

  it('reutiliza el acceso renovado para un 401 tardío, sin otra rotación', () => {
    cliente.get('/api/uno').subscribe();
    cliente.get('/api/dos').subscribe();
    const tardia = http.expectOne('/api/dos');
    fallar('/api/uno');
    renovar();
    http.expectOne('/api/uno').flush({});
    tardia.flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/dos').flush({});
    http.expectNone('/api/autenticacion/csrf');
  });

  it('un segundo 401 pierde sesión y no provoca bucle', () => {
    cliente.get('/api/identidad/yo').subscribe({ error: () => undefined });
    fallar('/api/identidad/yo');
    renovar();
    fallar('/api/identidad/yo');
    expect(sesion.autenticado()).toBe(false);
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/acceso');
    http.expectNone('/api/autenticacion/csrf');
  });

  it.each([401, 403, 503])('fallo de refresh %s limpia y redirige una vez a acceso', (status) => {
    cliente.get('/api/uno').subscribe({ error: () => undefined });
    cliente.get('/api/dos').subscribe({ error: () => undefined });
    fallar('/api/uno');
    fallar('/api/dos');
    http.expectOne('/api/autenticacion/csrf').flush(null);
    fallar('/api/autenticacion/renovar', status);
    expect(sesion.autenticado()).toBe(false);
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledExactlyOnceWith('/acceso');
    http.expectNone('/api/uno');
    http.expectNone('/api/dos');
  });

  it.each([403, 503])('no renueva ni pierde sesión por %s', (status) => {
    cliente.get('/api/identidad/yo').subscribe({ error: () => undefined });
    fallar('/api/identidad/yo', status);
    expect(sesion.autenticado()).toBe(true);
    http.expectNone('/api/autenticacion/csrf');
  });

  it('no renueva ante 401 anónimo ni de autenticación', () => {
    sesion.limpiar();
    cliente.get('/api/identidad/yo').subscribe({ error: () => undefined });
    fallar('/api/identidad/yo');
    cliente.post('/api/autenticacion/iniciar-sesion', {}).subscribe({ error: () => undefined });
    fallar('/api/autenticacion/iniciar-sesion');
    http.expectNone('/api/autenticacion/csrf');
  });

  it('401 de una sesión anterior no renueva tras logout', () => {
    cliente.get('/api/identidad/yo').subscribe({ error: () => undefined });
    const antigua = http.expectOne('/api/identidad/yo');
    TestBed.inject(Autenticacion).cerrarSesion().subscribe();
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/autenticacion/cerrar-sesion').flush(null);
    antigua.flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectNone('/api/autenticacion/csrf');
    expect(sesion.autenticado()).toBe(false);
  });
});
