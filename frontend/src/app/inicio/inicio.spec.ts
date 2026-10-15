import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Inicio } from './inicio';
import { provideRouter } from '@angular/router';
import { SesionStore } from '../identidad/sesion-store';
import { accesoPrueba } from '../identidad/datos-prueba';
import { Rol } from '../identidad/identidad-modelo';
describe('Pantalla de inicio', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('distingue carga y disponibilidad con mensajes accesibles', async () => {
    const vista = TestBed.createComponent(Inicio);
    vista.detectChanges();
    const html = vista.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Comprobando conexión');
    expect(html.querySelector('button')?.disabled).toBe(true);
    http.expectOne('/api/salud').flush({ estado: 'DISPONIBLE' });
    await vista.whenStable();
    expect(html.querySelector('[role="status"]')?.textContent).toContain('Sistema disponible');
    expect(html.querySelector('button')?.disabled).toBe(false);
  });
  it('muestra un error controlado y permite volver a comprobar', async () => {
    const vista = TestBed.createComponent(Inicio);
    vista.detectChanges();
    const html = vista.nativeElement as HTMLElement;
    http
      .expectOne('/api/salud')
      .flush('detalle interno ficticio', { status: 503, statusText: 'Service Unavailable' });
    await vista.whenStable();
    expect(html.textContent).toContain('Servicio no disponible');
    expect(html.textContent).not.toContain('detalle interno');
    html.querySelector('button')?.click();
    vista.detectChanges();
    expect(html.textContent).toContain('Comprobando conexión');
    http.expectOne('/api/salud').flush({ estado: 'DISPONIBLE' });
    await vista.whenStable();
    expect(html.textContent).toContain('Sistema disponible');
  });
  it('trata un estado no disponible aunque llegue con HTTP 200', async () => {
    const vista = TestBed.createComponent(Inicio);
    vista.detectChanges();
    http.expectOne('/api/salud').flush({ estado: 'NO_DISPONIBLE' });
    await vista.whenStable();
    expect((vista.nativeElement as HTMLElement).textContent).toContain('Servicio no disponible');
  });
  it.each([
    ['SOLICITANTE'],
    ['SUPERVISOR'],
    ['AUDITOR'],
    ['ADMINISTRADOR'],
    ['SOLICITANTE', 'SUPERVISOR'],
  ] as Rol[][])('resumen real y acciones propias para %s', async (...roles) => {
    const sesion = TestBed.inject(SesionStore);
    sesion.establecer(
      { ...accesoPrueba, usuario: { ...accesoPrueba.usuario, roles } },
      sesion.epoca,
    );
    const vista = TestBed.createComponent(Inicio);
    vista.detectChanges();
    http.expectOne('/api/salud').flush({ estado: 'DISPONIBLE' });
    http.expectOne('/api/resumen').flush({
      solicitudes: { BORRADOR: 3, PRESENTADA: 4, APROBADA: 2, RECHAZADA: 1, total: 10 },
      accionesPendientes: { borradoresPropios: 3, presentadasAsignadas: 4 },
    });
    await vista.whenStable();
    const html = vista.nativeElement as HTMLElement;
    expect(html.textContent).toContain('10 solicitudes visibles');
    expect(html.querySelectorAll('.contadores dd').length).toBe(4);
    expect(html.textContent?.includes('borradores propios por completar')).toBe(
      roles.includes('SOLICITANTE'),
    );
    expect(html.textContent?.includes('solicitudes asignadas por decidir')).toBe(
      roles.includes('SUPERVISOR'),
    );
    expect(html.textContent).toContain('Sistema disponible');
    sesion.limpiar();
    await vista.whenStable();
    expect(html.querySelector('.resumen-inicio')).toBeNull();
  });
  it('error de resumen no inventa ceros y conserva salud disponible', async () => {
    const sesion = TestBed.inject(SesionStore);
    sesion.establecer(accesoPrueba, sesion.epoca);
    const vista = TestBed.createComponent(Inicio);
    vista.detectChanges();
    http.expectOne('/api/salud').flush({ estado: 'DISPONIBLE' });
    http.expectOne('/api/resumen').flush({}, { status: 503, statusText: 'Unavailable' });
    await vista.whenStable();
    const html = vista.nativeElement as HTMLElement;
    expect(html.textContent).toContain('No se ha podido cargar el resumen');
    expect(html.querySelector('.contadores')).toBeNull();
    expect(html.textContent).toContain('Sistema disponible');
    html.querySelector<HTMLButtonElement>('.cabecera-resumen button')!.click();
    vista.detectChanges();
    http.expectOne('/api/resumen').flush({
      solicitudes: { BORRADOR: 0, PRESENTADA: 0, APROBADA: 0, RECHAZADA: 0, total: 0 },
      accionesPendientes: { borradoresPropios: 0, presentadasAsignadas: 0 },
    });
    await vista.whenStable();
    expect(html.textContent).toContain('0 solicitudes visibles');
  });
});
