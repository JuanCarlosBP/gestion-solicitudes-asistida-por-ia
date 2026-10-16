import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { IntencionOperacion, OperacionesSeguras } from '../operaciones/operaciones-seguras';
import {
  DatosProveedor,
  FiltrosProveedores,
  PaginaProveedores,
  Proveedor,
} from './proveedor-modelo';

@Injectable({ providedIn: 'root' })
export class ProveedoresApi {
  private readonly http = inject(HttpClient);
  private readonly operaciones = inject(OperacionesSeguras);
  private readonly base = '/api/proveedores';

  listar(filtros: FiltrosProveedores) {
    let params = new HttpParams();
    for (const [campo, valor] of Object.entries(filtros)) {
      if (valor !== '') params = params.set(campo, valor);
    }
    return this.http.get<PaginaProveedores>(this.base, { params, timeout: 10000 });
  }

  consultar(id: string) {
    return this.http.get<Proveedor>(`${this.base}/${encodeURIComponent(id)}`, { timeout: 10000 });
  }

  crear(datos: DatosProveedor, intencion?: IntencionOperacion) {
    return this.operaciones.ejecutar(
      'CREAR_PROVEEDOR',
      undefined,
      (clave) =>
        this.http.post<Proveedor>(this.base, this.editables(datos), {
          timeout: 10000,
          headers: { 'Idempotency-Key': clave },
        }),
      undefined,
      (resultado) => this.consultar(resultado.id),
      intencion,
    );
  }

  modificar(id: string, datos: DatosProveedor, version: number) {
    return this.http.put<Proveedor>(
      `${this.base}/${encodeURIComponent(id)}`,
      {
        ...this.editables(datos),
        version,
      },
      { timeout: 10000 },
    );
  }

  cambiarEstado(proveedor: Proveedor) {
    const accion = proveedor.activo ? 'desactivar' : 'reactivar';
    return this.operaciones.ejecutar(
      proveedor.activo ? 'DESACTIVAR_PROVEEDOR' : 'REACTIVAR_PROVEEDOR',
      proveedor.id,
      (clave) =>
        this.http.post<Proveedor>(
          `${this.base}/${encodeURIComponent(proveedor.id)}/${accion}`,
          { version: proveedor.version },
          { timeout: 10000, headers: { 'Idempotency-Key': clave } },
        ),
      undefined,
      (resultado) => this.consultar(resultado.id),
    );
  }

  private editables(datos: DatosProveedor): DatosProveedor {
    const {
      tipo,
      denominacion,
      paisFiscal,
      identificadorFiscal,
      correoContacto,
      telefonoContacto,
    } = datos;
    return {
      tipo,
      denominacion,
      paisFiscal,
      identificadorFiscal,
      correoContacto,
      telefonoContacto,
    };
  }
}
