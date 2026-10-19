import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SesionStore } from '../identidad/sesion-store';
import { claveContextoDemo, ReservaDemo, reservaValida, selectorDemo } from './demo-modelo';

/** Contexto por pestaña; nunca lee cookies ni adopta la reserva de otra pestaña. */
@Injectable({ providedIn: 'root' })
export class DemoContexto {
  private readonly sesion = inject(SesionStore);
  private readonly router = inject(Router, { optional: true });
  private readonly actual = signal<ReservaDemo | null>(null);
  private temporizador?: ReturnType<typeof setTimeout>;
  private revision = 0;
  readonly reserva = this.actual.asReadonly();
  readonly selector = computed(() => {
    const reserva = this.actual();
    return reserva ? selectorDemo(reserva) : null;
  });
  readonly aviso = signal('');

  constructor() {
    try {
      const guardado = sessionStorage.getItem(claveContextoDemo);
      if (guardado) {
        const dato: unknown = JSON.parse(guardado);
        if (reservaValida(dato, Date.now())) {
          this.actual.set(dato);
          this.programarCaducidad(dato);
        } else this.borrarPersistencia();
      }
    } catch {
      this.borrarPersistencia();
    }
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizador));
  }

  get epoca(): number {
    return this.revision;
  }

  establecer(reserva: ReservaDemo): void {
    if (!reservaValida(reserva, Date.now())) throw new Error('DEMO_RESPUESTA_INVALIDA');
    if (this.selector() !== selectorDemo(reserva)) {
      this.revision++;
      this.sesion.limpiar();
    }
    // Validar antes de persistir: solo cuatro campos públicos, nunca credenciales.
    try {
      sessionStorage.setItem(claveContextoDemo, JSON.stringify(reserva));
    } catch {
      // Sin persistencia la reserva sigue siendo utilizable durante esta página.
    }
    this.actual.set(reserva);
    this.aviso.set('');
    this.programarCaducidad(reserva);
  }

  comprobarVigencia(): void {
    const reserva = this.actual();
    if (reserva && Date.parse(reserva.expiraEn) <= Date.now()) {
      this.invalidar('Tu reserva ha caducado. Reserva un nuevo espacio para continuar.');
    }
  }

  invalidar(mensaje: string): void {
    this.revision++;
    this.sesion.limpiar();
    this.actual.set(null);
    this.aviso.set(mensaje);
    clearTimeout(this.temporizador);
    this.borrarPersistencia();
    if (mensaje) void this.router?.navigateByUrl('/demo');
  }

  private borrarPersistencia(): void {
    try {
      sessionStorage.removeItem(claveContextoDemo);
    } catch {
      /* Almacenamiento denegado. */
    }
  }

  private programarCaducidad(reserva: ReservaDemo): void {
    clearTimeout(this.temporizador);
    const plazo = Math.min(Date.parse(reserva.expiraEn) - Date.now(), 2_147_483_647);
    this.temporizador = setTimeout(
      () => {
        this.comprobarVigencia();
        if (this.actual()) this.programarCaducidad(reserva);
      },
      Math.max(1, plazo),
    );
  }
}
