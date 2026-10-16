import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
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
});
