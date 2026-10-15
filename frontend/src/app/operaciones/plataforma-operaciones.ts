import { InjectionToken } from '@angular/core';
import { defer, from, Observable } from 'rxjs';

/** Adaptador del navegador: permite comprobar almacenamiento y coordinación por separado. */
export interface PlataformaOperaciones {
  ambito(usuarioId: string | null): Observable<string>;
  coordinar<T>(nombre: string, reclamar: () => T): Observable<T>;
}
export const PLATAFORMA_OPERACIONES = new InjectionToken<PlataformaOperaciones>(
  'Plataforma de operaciones seguras',
  {
    providedIn: 'root',
    factory: () => ({
      ambito: (usuarioId) =>
        defer(async () => {
          if (!usuarioId) throw new Error('SESION_NO_DISPONIBLE');
          const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(usuarioId));
          return Array.from(new Uint8Array(digest), (byte) =>
            byte.toString(16).padStart(2, '0'),
          ).join('');
        }),
      coordinar: <T>(nombre: string, reclamar: () => T) =>
        defer(() => {
          if (!navigator.locks) throw new Error('COORDINACION_NO_DISPONIBLE');
          // La exclusión solo reclama el descriptor. Nunca retiene el bloqueo durante HTTP.
          return from(navigator.locks.request(nombre, reclamar));
        }),
    }),
  },
);
