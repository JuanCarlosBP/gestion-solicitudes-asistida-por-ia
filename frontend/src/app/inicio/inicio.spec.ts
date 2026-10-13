import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Inicio } from './inicio';
describe('Pantalla de inicio', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [provideHttpClient(), provideHttpClientTesting()],
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
});
