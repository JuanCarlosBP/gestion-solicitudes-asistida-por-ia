import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AccesoPagina } from './acceso';
import { accesoPrueba } from './datos-prueba';

describe('Formulario de acceso accesible', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AccesoPagina],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function preparar() {
    const vista = TestBed.createComponent(AccesoPagina);
    await vista.whenStable();
    const html = vista.nativeElement as HTMLElement;
    const correo = html.querySelector<HTMLInputElement>('#correo')!;
    const contrasena = html.querySelector<HTMLInputElement>('#contrasena')!;
    correo.value = 'persona@demo.invalid';
    contrasena.value = 'Contraseña ficticia larga';
    return { vista, html, correo, contrasena };
  }

  it('etiqueta campos, usa autocomplete y no persiste datos ni envía duplicados', async () => {
    const { vista, html, correo, contrasena } = await preparar();
    const persistir = vi.spyOn(Storage.prototype, 'setItem');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    expect(html.querySelector('label[for="correo"]')?.textContent).toContain('Correo electrónico');
    expect(html.querySelector('label[for="contrasena"]')?.textContent).toContain('Contraseña');
    expect(correo.autocomplete).toBe('username');
    expect(contrasena.autocomplete).toBe('current-password');
    const form = html.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    vista.detectChanges();
    expect(html.querySelector('button')?.disabled).toBe(true);
    expect(form.getAttribute('aria-busy')).toBe('true');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/autenticacion/iniciar-sesion').flush(accesoPrueba);
    await vista.whenStable();
    expect(contrasena.value.length === 0).toBe(true);
    expect(navegar).toHaveBeenCalledWith('/mi-cuenta');
    expect(persistir).not.toHaveBeenCalled();
    persistir.mockRestore();
  });

  it.each([401, 403, 503])(
    'fallo %s muestra el mismo mensaje genérico con foco',
    async (status) => {
      const { vista, html, contrasena } = await preparar();
      const alerta = html.querySelector<HTMLElement>('[role="alert"]')!;
      const foco = vi.spyOn(alerta, 'focus');
      html.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      const http = TestBed.inject(HttpTestingController);
      http.expectOne('/api/autenticacion/csrf').flush(null);
      http
        .expectOne('/api/autenticacion/iniciar-sesion')
        .flush({ detalle: 'detalle interno' }, { status, statusText: 'Error' });
      await vista.whenStable();
      expect(alerta.textContent).toContain(
        'No se ha podido iniciar sesión. Comprueba los datos e inténtalo de nuevo.',
      );
      expect(html.textContent).not.toContain('detalle interno');
      expect(foco).toHaveBeenCalledOnce();
      expect(contrasena.value.length === 0).toBe(true);
      expect(html.querySelector('button')?.disabled).toBe(false);
    },
  );
});
