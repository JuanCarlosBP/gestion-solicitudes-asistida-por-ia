import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { FiltrosHistorial, PaginaHistorial, TipoRecurso } from './historial-modelo';

export interface ResumenInicio {
  solicitudes: {
    BORRADOR: number;
    PRESENTADA: number;
    APROBADA: number;
    RECHAZADA: number;
    total: number;
  };
  accionesPendientes: { borradoresPropios: number; presentadasAsignadas: number };
}
@Injectable({ providedIn: 'root' })
export class HistorialApi {
  private readonly http = inject(HttpClient);
  consultar(filtros: FiltrosHistorial, tipo?: TipoRecurso, id?: string) {
    let params = new HttpParams();
    for (const [campo, valor] of Object.entries(filtros)) {
      if (valor !== '' && (!tipo || !['tipoRecurso', 'recursoId'].includes(campo)))
        params = params.set(campo, valor);
    }
    const url = tipo
      ? `/api/${tipo === 'SOLICITUD' ? 'solicitudes' : 'proveedores'}/${encodeURIComponent(id ?? '')}/historial`
      : '/api/historial';
    return this.http.get<PaginaHistorial>(url, { params, timeout: 10000 });
  }
  resumen() {
    return this.http.get<ResumenInicio>('/api/resumen', { timeout: 10000 });
  }
}
