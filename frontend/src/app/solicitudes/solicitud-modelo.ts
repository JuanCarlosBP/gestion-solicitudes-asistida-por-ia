import { TipoProveedor } from '../proveedores/proveedor-modelo';

export type EstadoSolicitud = 'BORRADOR' | 'PRESENTADA' | 'APROBADA' | 'RECHAZADA';
export const nombresEstado: Record<EstadoSolicitud, string> = {
  BORRADOR: 'Borrador',
  PRESENTADA: 'Presentada',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
};
export type TipoDecision = 'APROBAR' | 'RECHAZAR';
export interface DecisionSolicitud {
  tipo: TipoDecision;
  actor: PersonaSolicitud;
  comentario: string | null;
  motivo: string | null;
  decididoEn: string;
}
export interface ResultadoDecision {
  id: string;
  numero: string;
  estado: 'APROBADA' | 'RECHAZADA';
  version: number;
  actualizadoEn: string;
  decididoEn: string;
}
export const unidades = [
  'UNIDAD',
  'HORA',
  'DIA',
  'MES',
  'KILOGRAMO',
  'LITRO',
  'METRO',
  'SERVICIO',
] as const;
export type UnidadConcepto = (typeof unidades)[number];
export const nombresUnidad: Record<UnidadConcepto, string> = {
  UNIDAD: 'Unidad',
  HORA: 'Hora',
  DIA: 'Día',
  MES: 'Mes',
  KILOGRAMO: 'Kilogramo',
  LITRO: 'Litro',
  METRO: 'Metro',
  SERVICIO: 'Servicio',
};
export interface PersonaSolicitud {
  id: string;
  nombreVisible: string;
}
export interface ProveedorSolicitud {
  id: string;
  tipo: TipoProveedor;
  denominacion: string;
  paisFiscal: string;
  identificadorFiscal: string;
  activo: boolean | null;
}
export interface EntradaConcepto {
  id: string | null;
  descripcion: string;
  cantidad: string;
  unidad: UnidadConcepto;
  precioUnitario: string;
  posicion: number;
}
export interface ConceptoSolicitud extends EntradaConcepto {
  id: string;
  importeLinea: string;
}
export interface ResumenSolicitud {
  id: string;
  numero: string;
  autor: PersonaSolicitud;
  asunto: string;
  proveedorId: string | null;
  proveedor: ProveedorSolicitud | null;
  supervisorId: string | null;
  supervisor: PersonaSolicitud | null;
  moneda: 'EUR';
  estado: EstadoSolicitud;
  importeTotal: string;
  version: number;
  creadoEn: string;
  actualizadoEn: string;
  presentadoEn: string | null;
  decididoEn: string | null;
}
export interface DetalleSolicitud extends ResumenSolicitud {
  descripcion: string | null;
  conceptos: ConceptoSolicitud[];
  decision: DecisionSolicitud | null;
}
export interface BorradorSolicitud {
  asunto: string;
  descripcion: string | null;
  proveedorId: string | null;
  supervisorId: string | null;
  version: number;
  conceptos: EntradaConcepto[];
}
export interface ResultadoPresentacion {
  id: string;
  numero: string;
  estado: 'PRESENTADA';
  version: number;
  actualizadoEn: string;
  presentadoEn: string;
  moneda: 'EUR';
  importeTotal: string;
}
export interface Pagina<T> {
  elementos: T[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
}
export const ordenesSolicitud = [
  'actualizadoEn,desc',
  'actualizadoEn,asc',
  'numero,asc',
  'numero,desc',
  'creadoEn,desc',
  'creadoEn,asc',
  'importeTotal,desc',
  'importeTotal,asc',
] as const;
export type OrdenSolicitud = (typeof ordenesSolicitud)[number];
export interface FiltrosSolicitudes {
  numero: string;
  asunto: string;
  estado: string;
  proveedor: string;
  autor: string;
  supervisor: string;
  fechaDesde: string;
  fechaHasta: string;
  page: number;
  size: number;
  sort: OrdenSolicitud;
}
export const filtrosSolicitudesIniciales: FiltrosSolicitudes = {
  numero: '',
  asunto: '',
  estado: '',
  proveedor: '',
  autor: '',
  supervisor: '',
  fechaDesde: '',
  fechaHasta: '',
  page: 0,
  size: 20,
  sort: 'actualizadoEn,desc',
};
export const uuidValido = (valor: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);

/** Mensajes propios: los cuerpos de error remotos no se reflejan en pantalla. */
export function mensajeErrorSolicitud(error: unknown): string {
  const fallo = error as { status?: number; error?: { error?: string } } | null;
  if (fallo?.status === 409) {
    switch (fallo.error?.error) {
      case 'OPERACION_YA_COMPLETADA':
        return 'La operación ya está confirmada. Abre el resultado desde Operaciones seguras para consultar el detalle.';
      case 'VERSION_OBSOLETA':
        return 'La solicitud ha cambiado en otra sesión. Tus cambios siguen aquí; recarga la versión actual antes de continuar.';
      case 'SOLICITUD_NO_EDITABLE':
        return 'La solicitud ya no es un borrador editable. Recarga para consultar su estado actual.';
      case 'SOLICITUD_NO_DECIDIBLE':
        return 'La solicitud ya no está pendiente de decisión. Recarga para consultar su resultado actual.';
      case 'PROVEEDOR_INACTIVO':
        return 'El proveedor está inactivo. Selecciona un proveedor activo antes de presentar.';
      case 'SUPERVISOR_INVALIDO':
        return 'El supervisor ya no está disponible. Selecciona otro supervisor antes de presentar.';
      case 'CLAVE_IDEMPOTENCIA_REUTILIZADA':
        return 'Esta entrada es distinta de la operación confirmada. No se ha aplicado. Consulta el resultado antes de continuar.';
    }
  }
  if (fallo?.status === 404) return 'La solicitud no existe o no está disponible para tu cuenta.';
  if (fallo?.status === 403) return 'Tu cuenta no tiene permiso para esta operación.';
  if (fallo?.status === 401) return 'La sesión no está disponible. Vuelve a acceder.';
  if (fallo?.status === 400) return 'Revisa los campos, los conceptos y los límites indicados.';
  return 'No se ha podido completar la operación. Inténtalo de nuevo.';
}
export function esConflictoSolicitud(error: unknown): boolean {
  const fallo = error as {
    status?: number;
    error?: { error?: string; operacionConfirmada?: boolean };
  } | null;
  return (
    fallo?.error?.operacionConfirmada === true ||
    (fallo?.status === 409 &&
      [
        'VERSION_OBSOLETA',
        'SOLICITUD_NO_EDITABLE',
        'SOLICITUD_NO_DECIDIBLE',
        'CLAVE_IDEMPOTENCIA_REUTILIZADA',
        'OPERACION_YA_COMPLETADA',
      ].includes(fallo.error?.error ?? ''))
  );
}
