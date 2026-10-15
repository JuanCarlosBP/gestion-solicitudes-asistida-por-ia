import { computed, inject, Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Autenticacion } from '../identidad/autenticacion';
import { SesionStore } from '../identidad/sesion-store';

@Injectable({ providedIn: 'root' })
export class PermisosHistorial {
  private readonly sesion = inject(SesionStore);
  readonly global = computed(
    () =>
      this.sesion.usuario()?.roles.some((rol) => rol === 'AUDITOR' || rol === 'ADMINISTRADOR') ??
      false,
  );
}
/** Solo apoyo a navegación. Cada GET vuelve a autorizarse en el servidor. */
export const historialGuard: CanActivateFn = () => {
  const sesion = inject(SesionStore),
    permisos = inject(PermisosHistorial),
    router = inject(Router);
  return inject(Autenticacion)
    .restaurar()
    .pipe(
      map(() =>
        !sesion.autenticado()
          ? router.parseUrl('/acceso')
          : permisos.global() || router.parseUrl('/mi-cuenta'),
      ),
    );
};
