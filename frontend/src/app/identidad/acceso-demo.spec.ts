import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccesoPagina } from './acceso';

describe('AG018: acceso convencional conservado y orientación para la demo', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AccesoPagina],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('muestra el formulario real y sus etiquetas junto a la explicación de la demostración', () => {
    const vista = TestBed.createComponent(AccesoPagina);
    vista.detectChanges();
    const html = vista.nativeElement as HTMLElement;
    const correo = html.querySelector<HTMLInputElement>('#correo')!;
    const clave = html.querySelector<HTMLInputElement>('#contrasena')!;
    expect(html.querySelector('form')).not.toBeNull();
    expect(correo.type).toBe('email');
    expect(clave.type).toBe('password');
    expect(clave.autocomplete).toBe('current-password');
    expect(html.querySelector('button[type=submit]')?.textContent).toContain('Iniciar sesión');
    expect(html.querySelector('label[for=correo]')?.textContent).toContain('Correo electrónico');
    expect(html.querySelector('label[for=contrasena]')?.textContent).toContain('Contraseña');
    expect(correo.value).toBe('');
    expect(clave.value).toBe('');
    expect(html.textContent).toContain('no tienes una cuenta personal');
    expect(html.textContent).toContain('instalación de');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('explica los roles, conserva el espacio entre ellos y enlaza a Demo sin credenciales', () => {
    const vista = TestBed.createComponent(AccesoPagina);
    vista.detectChanges();
    const html = vista.nativeElement as HTMLElement;
    const pasos = html.querySelectorAll('.pasos-demo li');
    expect(pasos.length).toBe(4);
    expect(pasos[0].textContent).toContain('Reservar mi espacio');
    expect(pasos[1].textContent).toContain('Entrar como solicitante');
    expect(pasos[2].textContent).toContain('sin liberar el espacio');
    expect(pasos[2].textContent).toContain('Entrar como supervisor');
    expect(pasos[3].textContent).toContain('auditor');
    expect(pasos[3].textContent).toContain('Liberar mi espacio');
    const accesoDemo = html.querySelector<HTMLAnchorElement>('.boton-demo')!;
    expect(accesoDemo.getAttribute('href')).toBe('/demo');
    expect(accesoDemo.textContent).toContain('Ir a Demo y reservar mi espacio');
    expect(html.textContent).toContain('No introduzcas contraseñas de IONOS');
  });
});
