import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { App } from './app';
describe('Estructura accesible', () => {
  it('ofrece navegación y salto al contenido principal', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient()],
    });
    const vista = TestBed.createComponent(App);
    await vista.whenStable();
    const html = vista.nativeElement as HTMLElement;
    expect(html.querySelector('main')?.id).toBe('contenido');
    expect(html.querySelector('a.saltar')?.getAttribute('href')).toBe('#contenido');
    expect(html.querySelector('header')?.textContent).toContain('Gestión de Solicitudes');
    expect(html.querySelector('.entorno')?.textContent).toContain('Demostración');
    expect(html.querySelector('.entorno')?.textContent).not.toContain('Entorno local');
  });
});
