import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, timeout } from 'rxjs';
export interface Salud {
  estado: 'DISPONIBLE' | 'NO_DISPONIBLE';
}
@Injectable({ providedIn: 'root' })
export class SaludApi {
  private readonly http = inject(HttpClient);
  consultar() {
    return this.http.get<unknown>('/api/salud').pipe(
      timeout(6000),
      map((respuesta): Salud => {
        if (
          typeof respuesta === 'object' &&
          respuesta !== null &&
          'estado' in respuesta &&
          (respuesta.estado === 'DISPONIBLE' || respuesta.estado === 'NO_DISPONIBLE')
        ) {
          return { estado: respuesta.estado };
        }
        throw new Error('Respuesta técnica no válida');
      }),
    );
  }
}
