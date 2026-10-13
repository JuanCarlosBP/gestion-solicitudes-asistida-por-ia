import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { MiCuenta } from './mi-cuenta';
import { usuarioPrueba } from './datos-prueba';

describe('Cuenta propia', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MiCuenta],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('consulta identidad del backend, muestra todos los roles y cierra sesión', async () => {
    const vista = TestBed.createComponent(MiCuenta);
    vista.detectChanges();
    const html = vista.nativeElement as HTMLElement;
    expect(html.querySelector('[role="status"]')?.textContent).toContain('Consultando');
    http.expectOne('/api/identidad/yo').flush(usuarioPrueba);
    await vista.whenStable();
    expect(html.textContent).toContain(usuarioPrueba.nombreVisible);
    expect(html.querySelectorAll('li').length).toBe(2);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    html.querySelector('button')?.click();
    vista.detectChanges();
    expect(html.textContent).not.toContain(usuarioPrueba.nombreVisible);
    expect(html.querySelector('button')?.disabled).toBe(true);
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/autenticacion/cerrar-sesion').flush(null);
    expect(navegar).toHaveBeenCalledWith('/acceso');
  });

  it('explica fallo de consulta sin detalles y permite reintentar', async () => {
    const vista = TestBed.createComponent(MiCuenta);
    vista.detectChanges();
    http
      .expectOne('/api/identidad/yo')
      .flush({ detalle: 'interno' }, { status: 503, statusText: 'Error' });
    await vista.whenStable();
    const html = vista.nativeElement as HTMLElement;
    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'No se ha podido consultar',
    );
    expect(html.textContent).not.toContain('interno');
    html.querySelector('button')?.click();
    http.expectOne('/api/identidad/yo').flush(usuarioPrueba);
    await vista.whenStable();
    expect(html.textContent).toContain(usuarioPrueba.nombreVisible);
  });

  it('no afirma cierre confirmado cuando falla la red', async () => {
    const vista = TestBed.createComponent(MiCuenta);
    vista.detectChanges();
    http.expectOne('/api/identidad/yo').flush(usuarioPrueba);
    await vista.whenStable();
    const html = vista.nativeElement as HTMLElement;
    html.querySelector('button')?.click();
    http.expectOne('/api/autenticacion/csrf').error(new ProgressEvent('error'));
    await vista.whenStable();
    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'No se ha podido confirmar',
    );
    expect(html.querySelector('button')?.textContent).toContain('Reintentar');
  });

  it('una identidad tardía no vuelve a mostrarse después de iniciar el cierre', async () => {
    const vista = TestBed.createComponent(MiCuenta);
    vista.detectChanges();
    const anterior = http.expectOne('/api/identidad/yo');
    const html = vista.nativeElement as HTMLElement;
    html.querySelector('button')?.click();
    anterior.flush(usuarioPrueba);
    vista.detectChanges();
    expect(html.textContent).not.toContain(usuarioPrueba.nombreVisible);
    expect(html.querySelector('[role="status"]')?.textContent).toContain('Cerrando sesión');
    http.expectOne('/api/autenticacion/csrf').error(new ProgressEvent('error'));
    await vista.whenStable();
  });
});
