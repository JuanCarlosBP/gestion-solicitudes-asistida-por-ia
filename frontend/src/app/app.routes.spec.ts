import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { Autenticacion } from './identidad/autenticacion';
import { accesoPrueba, usuarioPrueba } from './identidad/datos-prueba';
describe('Navegación', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  it('redirige la raíz a inicio', async () => {
    const vista = await RouterTestingHarness.create('/');
    TestBed.inject(HttpTestingController).expectOne('/api/salud').flush({ estado: 'DISPONIBLE' });
    vista.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/inicio');
    expect(vista.routeNativeElement?.textContent).toContain('Gestión de Solicitudes');
  });
  it('abre inicio directamente', async () => {
    const vista = await RouterTestingHarness.create('/inicio');
    TestBed.inject(HttpTestingController).expectOne('/api/salud').flush({ estado: 'DISPONIBLE' });
    vista.detectChanges();
    expect(vista.routeNativeElement?.textContent).toContain('Sistema disponible');
  });
  it('controla rutas desconocidas sin consultar la API', async () => {
    const vista = await RouterTestingHarness.create('/ruta-inexistente');
    expect(vista.routeNativeElement?.textContent).toContain('Página no encontrada');
    expect(vista.routeNativeElement?.querySelector('a')?.getAttribute('href')).toBe('/inicio');
    TestBed.inject(HttpTestingController).expectNone('/api/salud');
  });

  it('abre acceso directamente con formulario etiquetado', async () => {
    const vista = await RouterTestingHarness.create('/acceso');
    expect(vista.routeNativeElement?.querySelector('h1')?.textContent).toBe('Acceso');
    expect(vista.routeNativeElement?.querySelector('input[type="password"]')).not.toBeNull();
    TestBed.inject(HttpTestingController).verify();
  });

  it.each([true, false])('mi-cuenta aplica restauración y guard con sesión=%s', async (exito) => {
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(Autenticacion).restaurar().subscribe();
    http.expectOne('/api/autenticacion/csrf').flush(null);
    const renovar = http.expectOne('/api/autenticacion/renovar');
    if (exito) renovar.flush(accesoPrueba);
    else renovar.flush({}, { status: 401, statusText: 'Unauthorized' });
    const vista = await RouterTestingHarness.create('/mi-cuenta');
    if (exito) {
      http.expectOne('/api/identidad/yo').flush(usuarioPrueba);
      vista.detectChanges();
      expect(vista.routeNativeElement?.textContent).toContain(usuarioPrueba.nombreVisible);
      expect(TestBed.inject(Router).url).toBe('/mi-cuenta');
    } else {
      expect(vista.routeNativeElement?.querySelector('h1')?.textContent).toBe('Acceso');
      expect(TestBed.inject(Router).url).toBe('/acceso');
    }
    http.verify();
  });
});
