import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, map, throwError } from 'rxjs';
import { SesionStore } from '../identidad/sesion-store';
import { DemoContexto } from './demo-contexto';

export const demoInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const origen = inject(DOCUMENT).location.origin;
  const destino = new URL(peticion.url, origen);
  if (destino.origin !== origen || !destino.pathname.startsWith('/api/'))
    return siguiente(peticion);
  const contexto = inject(DemoContexto);
  const sesion = inject(SesionStore);
  contexto.comprobarVigencia();
  const selector = contexto.selector();
  const epoca = contexto.epoca;
  const epocaSesion = sesion.epoca;
  const vigente = () => epoca === contexto.epoca && (!selector || epocaSesion === sesion.epoca);
  const acotada = selector
    ? peticion.clone({ setHeaders: { 'X-Demo-Contexto': selector } })
    : peticion;
  return siguiente(acotada).pipe(
    map((respuesta) => {
      if (!vigente()) throw new Error('DEMO_CONTEXTO_CAMBIADO');
      return respuesta;
    }),
    catchError((error: unknown) => {
      if (!vigente()) return throwError(() => new Error('DEMO_CONTEXTO_CAMBIADO'));
      if (
        selector &&
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        (error.error as { error?: string } | null)?.error === 'DEMO_RESERVA_INVALIDA'
      ) {
        contexto.invalidar(
          'La reserva ya no está disponible en esta pestaña. Vuelve a reservar para continuar.',
        );
      }
      return throwError(() => error);
    }),
  );
};
