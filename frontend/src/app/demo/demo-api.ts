import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { finalize, map, Observable, shareReplay, switchMap } from 'rxjs';
import { Autenticacion } from '../identidad/autenticacion';
import { DemoContexto } from './demo-contexto';
import { PresentacionDemo, ReservaDemo, selectorDemo } from './demo-modelo';

@Injectable({ providedIn: 'root' })
export class DemoApi {
  private readonly http = inject(HttpClient);
  private readonly contexto = inject(DemoContexto);
  private readonly autenticacion = inject(Autenticacion);
  private reservaPendiente?: Observable<ReservaDemo>;

  presentacion(): Observable<PresentacionDemo> {
    return this.http.get<PresentacionDemo>('/api/demo', { timeout: 10000 });
  }

  reservar(): Observable<ReservaDemo> {
    if (this.reservaPendiente) return this.reservaPendiente;
    this.reservaPendiente = this.http.get<void>('/api/autenticacion/csrf', { timeout: 10000 }).pipe(
      switchMap(() => this.http.post<ReservaDemo>('/api/demo/reservas', null, { timeout: 10000 })),
      map((reserva) => {
        this.contexto.establecer(reserva);
        return reserva;
      }),
      finalize(() => (this.reservaPendiente = undefined)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.reservaPendiente;
  }

  comprobarReserva(): Observable<ReservaDemo> {
    const selector = this.contexto.selector();
    return this.http.get<ReservaDemo>('/api/demo/reserva', { timeout: 10000 }).pipe(
      map((reserva) => {
        if (
          !selector ||
          selector !== this.contexto.selector() ||
          selectorDemo(reserva) !== selector
        )
          throw new Error('DEMO_CONTEXTO_CAMBIADO');
        this.contexto.establecer(reserva);
        return reserva;
      }),
    );
  }

  liberar(): Observable<void> {
    return this.autenticacion.liberarReservaDemo().pipe(
      map(() => this.contexto.invalidar('')),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }
}
