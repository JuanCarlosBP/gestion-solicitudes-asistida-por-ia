import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { of } from 'rxjs';
import { IntencionOperacion, OperacionesSeguras } from '../operaciones/operaciones-seguras';
import { ResultadoOperacion } from '../operaciones/operacion-modelo';
import {
  BorradorSolicitud,
  DetalleSolicitud,
  FiltrosSolicitudes,
  Pagina,
  PersonaSolicitud,
  ResultadoPresentacion,
  ResultadoDecision,
  ResumenSolicitud,
} from './solicitud-modelo';

@Injectable({ providedIn: 'root' })
export class SolicitudesApi {
  private readonly http = inject(HttpClient);
  private readonly operaciones = inject(OperacionesSeguras);
  private readonly base = '/api/solicitudes';

  listar(filtros: FiltrosSolicitudes) {
    let params = new HttpParams();
    for (const [campo, valor] of Object.entries(filtros)) {
      if (valor !== '') params = params.set(campo, valor);
    }
    return this.http.get<Pagina<ResumenSolicitud>>(this.base, { params, timeout: 10000 });
  }
  consultar(id: string) {
    return this.http.get<DetalleSolicitud>(`${this.base}/${encodeURIComponent(id)}`, {
      timeout: 10000,
    });
  }
  crear(asunto: string, intencion?: IntencionOperacion) {
    return this.operaciones.ejecutar(
      'CREAR_BORRADOR',
      undefined,
      (clave) =>
        this.http.post<DetalleSolicitud>(
          this.base,
          { asunto },
          { timeout: 10000, headers: { 'Idempotency-Key': clave } },
        ),
      undefined,
      (resultado) => this.consultar(resultado.id),
      intencion,
    );
  }
  guardar(id: string, datos: BorradorSolicitud) {
    const { asunto, descripcion, proveedorId, supervisorId, version } = datos;
    const conceptos = datos.conceptos.map(
      ({ id, descripcion, cantidad, unidad, precioUnitario, posicion }) => ({
        id,
        descripcion,
        cantidad,
        unidad,
        precioUnitario,
        posicion,
      }),
    );
    return this.http.put<DetalleSolicitud>(
      `${this.base}/${encodeURIComponent(id)}`,
      {
        asunto,
        descripcion,
        proveedorId,
        supervisorId,
        version,
        conceptos,
      },
      { timeout: 10000 },
    );
  }
  presentar(id: string, version: number, clave?: string) {
    return this.operaciones.ejecutar<ResultadoPresentacion | ResultadoOperacion>(
      'PRESENTAR',
      id,
      (claveIntento) =>
        this.http.post<ResultadoPresentacion>(
          `${this.base}/${encodeURIComponent(id)}/presentar`,
          { version },
          {
            headers: { 'Idempotency-Key': claveIntento },
            timeout: 10000,
          },
        ),
      clave,
      (resultado) => of(resultado),
    );
  }
  supervisores(nombre = '', page = 0) {
    let params = new HttpParams().set('page', page).set('size', 20);
    if (nombre !== '') params = params.set('nombre', nombre);
    return this.http.get<Pagina<PersonaSolicitud>>('/api/identidad/supervisores', {
      params,
      timeout: 10000,
    });
  }
  aprobar(id: string, version: number, comentario: string | null, clave?: string) {
    return this.operaciones.ejecutar<ResultadoDecision | ResultadoOperacion>(
      'APROBAR',
      id,
      (claveIntento) =>
        this.http.post<ResultadoDecision>(
          `${this.base}/${encodeURIComponent(id)}/aprobar`,
          { version, comentario },
          {
            headers: { 'Idempotency-Key': claveIntento },
            timeout: 10000,
          },
        ),
      clave,
      (resultado) => of(resultado),
    );
  }
  rechazar(id: string, version: number, motivo: string, clave?: string) {
    return this.operaciones.ejecutar<ResultadoDecision | ResultadoOperacion>(
      'RECHAZAR',
      id,
      (claveIntento) =>
        this.http.post<ResultadoDecision>(
          `${this.base}/${encodeURIComponent(id)}/rechazar`,
          { version, motivo },
          {
            headers: { 'Idempotency-Key': claveIntento },
            timeout: 10000,
          },
        ),
      clave,
      (resultado) => of(resultado),
    );
  }
}
