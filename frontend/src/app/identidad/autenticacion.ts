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

@Injectable({ providedIn: 'root' })
export class Autenticacion {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionStore);
  private restauracion?: Observable<void>;
  private renovacion?: Observable<Acceso>;
  private inicio?: Observable<Acceso>;
  private cierre?: Observable<void>;

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
    if (this.cierre) return throwError(() => new Error('CIERRE_EN_CURSO'));
    if (this.inicio) return this.inicio;
    const epoca = this.sesion.limpiar();
    // Una rotación anterior no debe sobrescribir después la cookie del nuevo login.
    const espera: Observable<unknown> =
      this.renovacion?.pipe(catchError(() => of(null))) ?? of(null);
    this.inicio = espera.pipe(
      switchMap(() => this.csrf()),
      switchMap(() =>
        this.http.post<Acceso>(
          '/api/autenticacion/iniciar-sesion',
          { correo, contrasena },
          { timeout: 10000 },
        ),
      ),
      map((acceso) => this.aplicar(acceso, epoca)),
      finalize(() => (this.inicio = undefined)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.inicio;
  }

  renovar(): Observable<Acceso> {
    if (this.cierre) return throwError(() => new Error('CIERRE_EN_CURSO'));
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
      switchMap(() =>
        this.http.post<void>('/api/autenticacion/cerrar-sesion', null, { timeout: 10000 }),
      ),
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
