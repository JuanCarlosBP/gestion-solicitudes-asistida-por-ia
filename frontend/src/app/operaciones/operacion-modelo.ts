export const nombresOperacion = {
  CREAR_PROVEEDOR: 'Alta de proveedor',
  DESACTIVAR_PROVEEDOR: 'Desactivación de proveedor',
  REACTIVAR_PROVEEDOR: 'Reactivación de proveedor',
  CREAR_BORRADOR: 'Alta de solicitud',
  PRESENTAR: 'Presentación de solicitud',
  APROBAR: 'Aprobación de solicitud',
  RECHAZAR: 'Rechazo de solicitud',
} as const;
export type Operacion = keyof typeof nombresOperacion;
/** Único contenido permitido en almacenamiento persistente del navegador. */
export interface DescriptorOperacion {
  clave: string;
  operacion: Operacion;
  recursoId?: string;
  fecha: number;
}
export interface ResultadoOperacion {
  estadoHttp: 200 | 201;
  id: string;
  version: number;
  estado: string;
  numero?: string | null;
}
export type ConsultaOperacion =
  | { estado: 'EN_PROGRESO'; operacion: Operacion; recursoId?: string | null }
  | {
      estado: 'COMPLETADA';
      operacion: Operacion;
      recursoId: string;
      resultado: ResultadoOperacion;
    };
export type EstadoOperacion =
  'ENVIANDO' | 'PENDIENTE' | 'RECUPERANDO' | 'COMPLETADA' | 'CONFLICTO' | 'DEPENDENCIA';
export interface VistaOperacion {
  descriptor: DescriptorOperacion;
  estado: EstadoOperacion;
  mensaje: string;
  resultado?: ResultadoOperacion;
}
export const prefijoOperaciones = 'gs.operacion-segura.';
export const duracionDescriptor = 24 * 60 * 60 * 1000;
export const esUuid = (valor: unknown): valor is string =>
  typeof valor === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);

export function descriptorValido(valor: unknown, ahora: number): valor is DescriptorOperacion {
  if (!valor || typeof valor !== 'object') return false;
  const dato = valor as Record<string, unknown>;
  const permitidos = ['clave', 'operacion', 'recursoId', 'fecha'];
  return (
    Object.keys(dato).every((campo) => permitidos.includes(campo)) &&
    esUuid(dato['clave']) &&
    typeof dato['operacion'] === 'string' &&
    Object.hasOwn(nombresOperacion, dato['operacion']) &&
    (String(dato['operacion']).startsWith('CREAR_')
      ? dato['recursoId'] === undefined
      : esUuid(dato['recursoId'])) &&
    typeof dato['fecha'] === 'number' &&
    Number.isFinite(dato['fecha']) &&
    dato['fecha'] <= ahora &&
    ahora - dato['fecha'] < duracionDescriptor
  );
}
