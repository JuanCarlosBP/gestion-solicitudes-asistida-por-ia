import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { accesoPrueba } from '../identidad/datos-prueba';
import { SesionStore } from '../identidad/sesion-store';
import { OperacionesSeguras } from '../operaciones/operaciones-seguras';
import { PLATAFORMA_OPERACIONES } from '../operaciones/plataforma-operaciones';
import { DemoContexto } from './demo-contexto';
import { demoInterceptor } from './demo-interceptor';
import { otraReserva, reservaPrueba } from './datos-prueba';

describe('AIS-05: memoria, descriptor y Web Locks separados por reserva y usuario', () => {
  let http: HttpTestingController;
  const ambito = vi.fn((usuario: string) => of(usuario));
  const coordinar = vi.fn(<T>(_nombre: string, reclamar: () => T) => of(reclamar()));
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    ambito.mockClear();
    coordinar.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([demoInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PLATAFORMA_OPERACIONES, useValue: { ambito, coordinar } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('mismo UUID de usuario y misma operación en dos generaciones no recuperan ni bloquean la otra', () => {
    const contexto = TestBed.inject(DemoContexto);
    const sesion = TestBed.inject(SesionStore);
    const operaciones = TestBed.inject(OperacionesSeguras);
    const cliente = TestBed.inject(HttpClient);
    const enviar = () =>
      operaciones.ejecutar('CREAR_BORRADOR', undefined, () => cliente.post('/api/prueba', null));
    contexto.establecer(reservaPrueba());
    sesion.establecer(accesoPrueba, sesion.epoca);
    const recibirAnterior = vi.fn();
    enviar().subscribe({ next: recibirAnterior, error: () => undefined });
    const anterior = http.expectOne('/api/prueba');
    const claveAnterior = localStorage.key(0)!;
    const bloqueoAnterior = coordinar.mock.calls[0][0];
    contexto.establecer(otraReserva());
    sesion.establecer(accesoPrueba, sesion.epoca);
    enviar().subscribe();
    const actual = http.expectOne('/api/prueba');
    expect(localStorage.length).toBe(2);
    expect(coordinar.mock.calls[1][0]).not.toBe(bloqueoAnterior);
    expect(ambito.mock.calls[1][0]).toBe(`${contexto.selector()}|${accesoPrueba.usuario.id}`);
    anterior.flush({ id: '00000000-0000-4000-8000-000000000806', version: 0, estado: 'BORRADOR' });
    expect(recibirAnterior).not.toHaveBeenCalled();
    actual.flush({ id: '00000000-0000-4000-8000-000000000807', version: 0, estado: 'BORRADOR' });
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem(claveAnterior)).not.toBeNull();
  });

  it('un cálculo de ámbito pendiente no inicia recuperación en la siguiente generación', () => {
    const contexto = TestBed.inject(DemoContexto);
    const sesion = TestBed.inject(SesionStore);
    contexto.establecer(reservaPrueba());
    sesion.establecer(accesoPrueba, sesion.epoca);
    const calculoPendiente = new Subject<string>();
    ambito.mockReturnValueOnce(calculoPendiente);
    TestBed.inject(OperacionesSeguras).recuperar({
      clave: '00000000-0000-4000-8000-000000000808',
      operacion: 'CREAR_BORRADOR',
      fecha: Date.now(),
    });
    contexto.establecer(otraReserva());
    sesion.establecer(accesoPrueba, sesion.epoca);
    calculoPendiente.next('ambito-antiguo');
    calculoPendiente.complete();
    http.expectNone('/api/operaciones-idempotentes/00000000-0000-4000-8000-000000000808');
  });
});
