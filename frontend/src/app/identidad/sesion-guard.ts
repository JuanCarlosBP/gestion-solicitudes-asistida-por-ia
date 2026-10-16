import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Autenticacion } from './autenticacion';
import { SesionStore } from './sesion-store';

export const sesionGuard: CanActivateFn = () => {
  const sesion = inject(SesionStore);
  const router = inject(Router);
  return inject(Autenticacion)
    .restaurar()
    .pipe(map(() => sesion.autenticado() || router.parseUrl('/acceso')));
};
