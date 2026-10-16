import { computed, inject, Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Autenticacion } from '../identidad/autenticacion';
import { SesionStore } from '../identidad/sesion-store';

@Injectable({ providedIn: 'root' })
export class PermisosProveedores {
  private readonly sesion = inject(SesionStore);
  readonly escribir = computed(
    () => this.sesion.usuario()?.roles.includes('ADMINISTRADOR') ?? false,
  );
  readonly verInactivos = computed(
    () => this.escribir() || (this.sesion.usuario()?.roles.includes('AUDITOR') ?? false),
  );
  readonly consultar = computed(
    () =>
      this.sesion
        .usuario()
        ?.roles.some((rol) =>
          ['SOLICITANTE', 'SUPERVISOR', 'AUDITOR', 'ADMINISTRADOR'].includes(rol),
        ) ?? false,
  );
}

/** Ayuda de navegación; la autorización efectiva se verifica en cada operación REST. */
export const proveedoresGuard: CanActivateFn = (ruta) => {
  const permisos = inject(PermisosProveedores);
  const sesion = inject(SesionStore);
  const router = inject(Router);
  return inject(Autenticacion)
    .restaurar()
    .pipe(
      map(() => {
        if (!sesion.autenticado()) return router.parseUrl('/acceso');
        if (!permisos.consultar()) return router.parseUrl('/mi-cuenta');
        return !ruta.data['escritura'] || permisos.escribir() || router.parseUrl('/proveedores');
      }),
    );
};
