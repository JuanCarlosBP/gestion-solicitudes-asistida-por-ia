import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  defer,
  finalize,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';
import { Acceso, UsuarioPublico } from './identidad-modelo';
import { SesionStore } from './sesion-store';
import { RolDemo } from '../demo/demo-modelo';

@Injectable({ providedIn: 'root' })
export class Autenticacion {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionStore);
  private restauracion?: Observable<void>;
  private renovacion?: Observable<Acceso>;
  private inicio?: Observable<Acceso>;
  private cierre?: Observable<void>;
  private revocacionDemoPendiente = false;

  restaurar(): Observable<void> {
    // El inicializador y los guards esperan exactamente la misma restauración.
    this.restauracion ??= this.renovar().pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.restauracion;
  }

  iniciarSesion(correo: string, contrasena: string): Observable<Acceso> {
    return this.iniciar('/api/autenticacion/iniciar-sesion', { correo, contrasena });
  }

  iniciarDemo(rol: RolDemo): Observable<Acceso> {
    return this.iniciar('/api/demo/acceso', { rol }, true);
  }

  private iniciar(ruta: string, entrada: object, cerrarAnterior = false): Observable<Acceso> {
    if (this.cierre) return throwError(() => new Error('CIERRE_EN_CURSO'));
    if (this.inicio) return this.inicio;
    const revocar =
      cerrarAnterior &&
      (this.sesion.autenticado() || !!this.renovacion || this.revocacionDemoPendiente);
    if (revocar) this.revocacionDemoPendiente = true;
    const epoca = this.sesion.limpiar();
    // Una rotación anterior no debe sobrescribir después la cookie del nuevo login.
    const espera: Observable<unknown> =
      this.renovacion?.pipe(catchError(() => of(null))) ?? of(null);
    this.inicio = espera.pipe(
      switchMap(() => this.csrf()),
      // La cookie refresh tiene Path=/api/autenticacion: /api/demo/acceso no la recibe.
      // Revocar por la ruta real de cierre antes del cambio de rol y obtener su nuevo CSRF.
      switchMap(() =>
        revocar
          ? this.http.post<void>('/api/autenticacion/cerrar-sesion', null, { timeout: 10000 }).pipe(
              map(() => {
                this.revocacionDemoPendiente = false;
              }),
              switchMap(() => this.csrf()),
            )
          : of(undefined),
      ),
      switchMap(() => {
        // Una respuesta perdida puede haber instalado la cookie aunque no llegue el JWT.
        // El siguiente acceso demo debe revocarla también en ese caso incierto.
        if (cerrarAnterior) this.revocacionDemoPendiente = true;
        return this.http.post<Acceso>(ruta, entrada, { timeout: 10000 });
      }),
      map((acceso) => this.aplicar(acceso, epoca)),
      finalize(() => (this.inicio = undefined)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.inicio;
  }

  renovar(): Observable<Acceso> {
    if (this.cierre) return throwError(() => new Error('CIERRE_EN_CURSO'));
    if (this.inicio) return this.inicio;
    if (this.renovacion) return this.renovacion;
    const epoca = this.sesion.epoca;
    this.renovacion = this.csrf().pipe(
      switchMap(() =>
        this.http.post<Acceso>('/api/autenticacion/renovar', null, { timeout: 10000 }),
      ),
      map((acceso) => this.aplicar(acceso, epoca)),
      finalize(() => (this.renovacion = undefined)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.renovacion;
  }

  identidad(): Observable<UsuarioPublico> {
    return this.http.get<UsuarioPublico>('/api/identidad/yo');
  }

  cerrarSesion(): Observable<void> {
    return this.cerrar('/api/autenticacion/cerrar-sesion');
  }

  liberarReservaDemo(): Observable<void> {
    return this.cerrar('/api/demo/reserva/liberar');
  }

  private cerrar(ruta: string): Observable<void> {
    if (this.cierre) return this.cierre;
    this.sesion.limpiar();
    // Esperar respuestas que puedan rotar cookies antes de revocar en servidor.
    // Una respuesta tardía ya no podrá poblar el store de esta época.
    const pendientes = [this.inicio, this.renovacion].filter(
      (peticion): peticion is Observable<Acceso> => peticion !== undefined,
    );
    const espera: Observable<unknown> = pendientes.length
      ? forkJoin(pendientes.map((peticion) => peticion.pipe(catchError(() => of(null)))))
      : of(null);
    this.cierre = espera.pipe(
      switchMap(() => this.csrf()),
      switchMap(() => this.http.post<void>(ruta, null, { timeout: 10000 })),
      map(() => {
        this.revocacionDemoPendiente = false;
      }),
      finalize(() => {
        this.cierre = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.cierre;
  }

  perderSesion(epoca: number): void {
    if (epoca !== this.sesion.epoca) return;
    this.sesion.limpiar();
    void this.router.navigateByUrl('/acceso');
  }

  private csrf(): Observable<void> {
    return defer(() => this.http.get<void>('/api/autenticacion/csrf', { timeout: 10000 }));
  }

  private aplicar(acceso: Acceso, epoca: number): Acceso {
    if (!this.sesion.establecer(acceso, epoca)) throw new Error('SESION_CAMBIADA');
    return acceso;
  }
}
