import { computed, inject, Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Autenticacion } from '../identidad/autenticacion';
import { SesionStore } from '../identidad/sesion-store';
import { ResumenSolicitud } from './solicitud-modelo';

@Injectable({ providedIn: 'root' })
export class PermisosSolicitudes {
  private readonly sesion = inject(SesionStore);
  readonly crear = computed(() => this.sesion.usuario()?.roles.includes('SOLICITANTE') ?? false);
  readonly supervisar = computed(
    () => this.sesion.usuario()?.roles.includes('SUPERVISOR') ?? false,
  );
  readonly actorId = computed(() => this.sesion.usuario()?.id ?? '');
  readonly global = computed(
    () =>
      this.sesion.usuario()?.roles.some((rol) => ['AUDITOR', 'ADMINISTRADOR'].includes(rol)) ??
      false,
  );
  readonly consultar = computed(
    () =>
      this.sesion
        .usuario()
        ?.roles.some((rol) =>
          ['SOLICITANTE', 'SUPERVISOR', 'AUDITOR', 'ADMINISTRADOR'].includes(rol),
        ) ?? false,
  );
  editar(solicitud: ResumenSolicitud): boolean {
    return (
      this.crear() &&
      solicitud.autor.id === this.sesion.usuario()?.id &&
      solicitud.estado === 'BORRADOR'
    );
  }
  decidir(solicitud: ResumenSolicitud): boolean {
    return (
      this.supervisar() &&
      solicitud.estado === 'PRESENTADA' &&
      solicitud.supervisorId === this.actorId() &&
      solicitud.autor.id !== this.actorId()
    );
  }
}
/** Apoyo de navegación; el servidor vuelve a autorizar acción, recurso y estado. */
export const solicitudesGuard: CanActivateFn = (ruta) => {
  const permisos = inject(PermisosSolicitudes);
  const sesion = inject(SesionStore);
  const router = inject(Router);
  return inject(Autenticacion)
    .restaurar()
    .pipe(
      map(() => {
        if (!sesion.autenticado()) return router.parseUrl('/acceso');
        if (!permisos.consultar()) return router.parseUrl('/mi-cuenta');
        if (ruta.data['supervision'] && !permisos.supervisar())
          return router.parseUrl('/solicitudes');
        return !ruta.data['escritura'] || permisos.crear() || router.parseUrl('/solicitudes');
      }),
    );
};
