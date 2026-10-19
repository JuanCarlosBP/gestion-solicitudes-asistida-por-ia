import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { accesoPrueba } from '../identidad/datos-prueba';
import { SesionStore } from '../identidad/sesion-store';
import { DemoContexto } from './demo-contexto';
import { claveContextoDemo, reservaValida, selectorDemo } from './demo-modelo';
import { otraReserva, reservaPrueba } from './datos-prueba';

describe('AIS-05: contexto de demo por pestaña', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('restaura solo selector público válido y no una sesión autenticada', () => {
    const reserva = reservaPrueba();
    sessionStorage.setItem(claveContextoDemo, JSON.stringify(reserva));
    const contexto = TestBed.inject(DemoContexto);
    expect(contexto.selector()).toBe(selectorDemo(reserva));
    expect(TestBed.inject(SesionStore).autenticado()).toBe(false);
  });

  it.each([
    null,
    { ...reservaPrueba(), espacio: '../../otra' },
    { ...reservaPrueba(), generacion: 'incorrecta' },
    { ...reservaPrueba(), token: 'ficticio' },
    { ...reservaPrueba(), expiraEn: new Date(0).toISOString() },
  ])('descarta persistencia ajena al contrato %#', (valor) => {
    sessionStorage.setItem(claveContextoDemo, JSON.stringify(valor));
    expect(TestBed.inject(DemoContexto).reserva()).toBeNull();
    expect(sessionStorage.getItem(claveContextoDemo)).toBeNull();
    expect(reservaValida(valor, Date.now())).toBe(false);
  });

  it('cambiar generación invalida la sesión y persiste únicamente cuatro campos públicos', () => {
    const contexto = TestBed.inject(DemoContexto);
    contexto.establecer(reservaPrueba());
    const sesion = TestBed.inject(SesionStore);
    sesion.establecer(accesoPrueba, sesion.epoca);
    const anterior = contexto.epoca;
    const otra = otraReserva();
    contexto.establecer(otra);
    expect(contexto.epoca).toBeGreaterThan(anterior);
    expect(sesion.autenticado()).toBe(false);
    expect(JSON.parse(sessionStorage.getItem(claveContextoDemo)!)).toEqual(otra);
    expect(sessionStorage.getItem(claveContextoDemo)).not.toContain(accesoPrueba.accessToken);
  });

  it('no adopta el contexto de otra pestaña por eventos de almacenamiento', () => {
    const contexto = TestBed.inject(DemoContexto);
    contexto.establecer(reservaPrueba());
    const anterior = contexto.selector();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: claveContextoDemo,
        newValue: JSON.stringify(otraReserva()),
      }),
    );
    expect(contexto.selector()).toBe(anterior);
  });

  it('caduca aun fuera de la página demo, limpia sesión y retira el contexto persistido', () => {
    vi.useFakeTimers();
    const contexto = TestBed.inject(DemoContexto);
    contexto.establecer({
      ...reservaPrueba(),
      expiraEn: new Date(Date.now() + 1000).toISOString(),
    });
    const sesion = TestBed.inject(SesionStore);
    sesion.establecer(accesoPrueba, sesion.epoca);
    vi.advanceTimersByTime(1000);
    expect(contexto.reserva()).toBeNull();
    expect(sesion.autenticado()).toBe(false);
    expect(sessionStorage.getItem(claveContextoDemo)).toBeNull();
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/demo');
  });
});
