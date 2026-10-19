import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, of, switchMap, throwError } from 'rxjs';
import { Autenticacion } from './autenticacion';
import { SesionStore } from './sesion-store';

export const sesionInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const origen = inject(DOCUMENT).location.origin;
  const destino = new URL(peticion.url, origen);
  if (
    destino.origin !== origen ||
    !destino.pathname.startsWith('/api/') ||
    destino.pathname.startsWith('/api/autenticacion/') ||
    destino.pathname === '/api/demo' ||
    destino.pathname.startsWith('/api/demo/') ||
    destino.pathname === '/api/salud'
  ) {
    return siguiente(peticion);
  }
  const sesion = inject(SesionStore);
  const autenticacion = inject(Autenticacion);
  const token = sesion.token;
  const epoca = sesion.epoca;
  const autenticar = (valor: string) =>
    peticion.clone({ setHeaders: { Authorization: `Bearer ${valor}` } });
  return siguiente(token ? autenticar(token) : peticion).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        (error.error as { error?: string } | null)?.error === 'DEMO_RESERVA_INVALIDA' ||
        !token ||
        epoca !== sesion.epoca
      ) {
        return throwError(() => error);
      }
      // Un 401 tardío puede corresponder a un JWT ya renovado por otra petición.
      const renovacion =
        sesion.token && sesion.token !== token
          ? of(sesion.token)
          : autenticacion.renovar().pipe(switchMap((acceso) => of(acceso.accessToken)));
      return renovacion.pipe(
        catchError((fallo: unknown) => {
          autenticacion.perderSesion(epoca);
          return throwError(() => fallo);
        }),
        switchMap((nuevoToken) => {
          if (epoca !== sesion.epoca) return throwError(() => error);
          // siguiente() evita volver a entrar en este interceptor: solo un reintento.
          return siguiente(autenticar(nuevoToken)).pipe(
            catchError((fallo: unknown) => {
              if (fallo instanceof HttpErrorResponse && fallo.status === 401) {
                autenticacion.perderSesion(epoca);
              }
              return throwError(() => fallo);
            }),
          );
        }),
      );
    }),
  );
};
