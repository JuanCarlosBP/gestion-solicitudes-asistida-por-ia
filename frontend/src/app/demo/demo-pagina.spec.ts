import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { accesoPrueba } from '../identidad/datos-prueba';
import { DemoPagina } from './demo-pagina';
import { reservaPrueba } from './datos-prueba';

describe('DO-01/05/08: presentación y guías accesibles', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [DemoPagina],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });
  function crear(duracionMinutos = 60) {
    const vista = TestBed.createComponent(DemoPagina);
    vista.detectChanges();
    http
      .expectOne('/api/demo')
      .flush({ habilitada: true, cupo: 3, duracionMinutos, disponibles: 3 });
    vista.detectChanges();
    return vista;
  }

  it('presenta tres guías de cuatro pasos con acceso deshabilitado hasta reservar', () => {
    const vista = crear();
    const html = vista.nativeElement as HTMLElement;
    expect(html.querySelector('h1')?.textContent).toContain('Prueba el recorrido');
    expect(html.querySelectorAll('.guia').length).toBe(3);
    expect([...html.querySelectorAll('.guia ol')].map((lista) => lista.children.length)).toEqual([
      4, 4, 4,
    ]);
    expect(
      [...html.querySelectorAll<HTMLButtonElement>('.guia button')].every(
        (boton) => boton.disabled,
      ),
    ).toBe(true);
    expect(html.querySelectorAll('.guia h3').length).toBe(3);
    expect(html.textContent).toContain('datos inventados');
  });

  it('reserva, muestra caducidad y entra al rol con autenticación real', () => {
    const vista = crear();
    vista.componentInstance.reservar();
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/demo/reservas').flush(reservaPrueba());
    vista.detectChanges();
    expect((vista.nativeElement as HTMLElement).querySelector('time')).not.toBeNull();
    expect((vista.nativeElement as HTMLElement).textContent).toContain('Espacio reservado');
    vista.componentInstance.entrar('AUDITOR');
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http.expectOne('/api/demo/acceso').flush(accesoPrueba);
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/historial');
  });

  it('actualiza el reloj al reservar tras tener la página abierta y no muestra 61 minutos', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T12:00:00Z'));
    try {
      const vista = crear();
      // El reloj del componente todavía conserva su última muestra al llegar la reserva.
      vi.setSystemTime(new Date('2026-10-16T12:00:30Z'));
      vista.componentInstance.reservar();
      http.expectOne('/api/autenticacion/csrf').flush(null);
      http.expectOne('/api/demo/reservas').flush({
        ...reservaPrueba(),
        expiraEn: new Date(Date.now() + 60 * 60000).toISOString(),
      });
      vista.detectChanges();
      expect(vista.componentInstance.minutos()).toBe(60);
      expect((vista.nativeElement as HTMLElement).querySelector('.tiempo')?.textContent).toContain(
        '60 min',
      );
      vi.advanceTimersByTime(60000);
      vista.detectChanges();
      expect(vista.componentInstance.minutos()).toBe(59);
      vista.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    { duracionMinutos: 60, desfaseMs: 250 },
    { duracionMinutos: 60, desfaseMs: 30000 },
    { duracionMinutos: 30, desfaseMs: 250 },
  ])(
    'no supera los $duracionMinutos minutos anunciados con servidor adelantado $desfaseMs ms',
    ({ duracionMinutos, desfaseMs }) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-16T12:00:00Z'));
      try {
        const vista = crear(duracionMinutos);
        vista.componentInstance.reservar();
        http.expectOne('/api/autenticacion/csrf').flush(null);
        const expiraEn = new Date(Date.now() + duracionMinutos * 60000 + desfaseMs).toISOString();
        http.expectOne('/api/demo/reservas').flush({ ...reservaPrueba(), expiraEn });
        vista.detectChanges();
        expect(vista.componentInstance.minutos()).toBe(duracionMinutos);
        expect(vista.componentInstance.contexto.reserva()?.expiraEn).toBe(expiraEn);
        vi.advanceTimersByTime(61000 + desfaseMs);
        vista.detectChanges();
        expect(vista.componentInstance.minutos()).toBe(duracionMinutos - 1);
        vista.destroy();
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it('el cuarto visitante recibe un mensaje de cupo ocupado y conserva los botones de rol deshabilitados', () => {
    const vista = crear();
    vista.componentInstance.reservar();
    http.expectOne('/api/autenticacion/csrf').flush(null);
    http
      .expectOne('/api/demo/reservas')
      .flush({ error: 'DEMO_CAPACIDAD_OCUPADA' }, { status: 409, statusText: 'Conflict' });
    vista.detectChanges();
    const html = vista.nativeElement as HTMLElement;
    expect(html.querySelector('[role=alert]')?.textContent).toContain(
      'Todos los espacios están ocupados',
    );
    expect(
      [...html.querySelectorAll<HTMLButtonElement>('.guia button')].every(
        (boton) => boton.disabled,
      ),
    ).toBe(true);
  });

  it('el perfil sin demo explica su indisponibilidad sin inventar reservas', () => {
    const vista = TestBed.createComponent(DemoPagina);
    vista.detectChanges();
    http.expectOne('/api/demo').flush({}, { status: 404, statusText: 'Not Found' });
    vista.detectChanges();
    expect((vista.nativeElement as HTMLElement).textContent).toContain(
      'La demo no está habilitada en este entorno.',
    );
    expect(vista.componentInstance.contexto.reserva()).toBeNull();
  });
});
