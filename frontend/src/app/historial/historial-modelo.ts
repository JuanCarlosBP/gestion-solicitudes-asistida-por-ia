import { HttpErrorResponse } from '@angular/common/http';
import { ParamMap } from '@angular/router';
import { uuidValido } from '../solicitudes/solicitud-modelo';

export type TipoRecurso = 'SOLICITUD' | 'PROVEEDOR';
export const accionesHistorial = {
  PROVEEDOR_CREADO: 'Proveedor creado',
  PROVEEDOR_MODIFICADO: 'Proveedor modificado',
  PROVEEDOR_DESACTIVADO: 'Proveedor desactivado',
  PROVEEDOR_REACTIVADO: 'Proveedor reactivado',
  BORRADOR_CREADO: 'Borrador creado',
  BORRADOR_GUARDADO: 'Borrador guardado',
  SOLICITUD_PRESENTADA: 'Solicitud presentada',
  APROBADA: 'Solicitud aprobada',
  RECHAZADA: 'Solicitud rechazada',
} as const;
export type AccionHistorial = keyof typeof accionesHistorial;
export interface EventoHistorial {
  id: string;
  tipoRecurso: TipoRecurso;
  recursoId: string;
  accion: AccionHistorial;
  actor: { id: string; nombreVisible: string };
  ocurridoEn: string;
  versionAnterior: number | null;
  versionResultante: number;
  estadoAnterior: string | null;
  estadoResultante: string;
  resumen: string;
  origen: 'EVENTO_V7' | 'DECISION_V5';
}
export interface PaginaHistorial {
  elementos: EventoHistorial[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
  historiaAnteriorDesconocida: boolean;
}
export interface FiltrosHistorial {
  page: number;
  size: number;
  accion: string;
  actor: string;
  desde: string;
  hasta: string;
  tipoRecurso: string;
  recursoId: string;
}
export const filtrosHistorialIniciales: FiltrosHistorial = {
  page: 0,
  size: 20,
  accion: '',
  actor: '',
  desde: '',
  hasta: '',
  tipoRecurso: '',
  recursoId: '',
};

/** Valida la fecha real y exige offset; no interpreta fechas ambiguas del navegador. */
export function instanteValido(valor: string): boolean {
  const partes =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/.exec(
      valor,
    );
  if (!partes || !Number.isFinite(Date.parse(valor))) return false;
  const [, ano, mes, dia, hora, minuto, segundo = '0', offset] = partes;
  const fecha = new Date(`${ano}-${mes}-${dia}T00:00:00Z`);
  if (
    fecha.toISOString().slice(0, 10) !== `${ano}-${mes}-${dia}` ||
    Number(hora) > 23 ||
    Number(minuto) > 59 ||
    Number(segundo) > 59
  )
    return false;
  return (
    offset === 'Z' ||
    (Number(offset.slice(1, 3)) <= 18 &&
      Number(offset.slice(4, 6)) <= 59 &&
      (Number(offset.slice(1, 3)) !== 18 || offset.slice(4, 6) === '00'))
  );
}

/** Conserva hasta nueve decimales al ordenar instantes; Date solo conserva milisegundos. */
function nanosegundos(valor: string): bigint {
  const patron = /\.(\d{1,9})(?=Z|[+-]\d{2}:\d{2}$)/;
  const fraccion = patron.exec(valor)?.[1] ?? '';
  return BigInt(Date.parse(valor.replace(patron, ''))) * 1000000n + BigInt(fraccion.padEnd(9, '0'));
}

export function leerFiltrosHistorial(params: ParamMap, global: boolean): FiltrosHistorial | null {
  const permitidos = Object.keys(filtrosHistorialIniciales).filter(
    (k) => global || !['tipoRecurso', 'recursoId'].includes(k),
  );
  if (
    params.keys.some(
      (k) => !permitidos.includes(k) || params.getAll(k).length !== 1 || params.get(k) === '',
    )
  )
    return null;
  const valor = (k: string, defecto = '') => params.get(k) ?? defecto;
  const page = valor('page', '0'),
    size = valor('size', '20');
  const accion = valor('accion'),
    actor = valor('actor'),
    desde = valor('desde'),
    hasta = valor('hasta');
  const tipoRecurso = valor('tipoRecurso'),
    recursoId = valor('recursoId');
  if (
    !/^\d+$/.test(page) ||
    !Number.isSafeInteger(Number(page)) ||
    Number(page) > 2147483647 ||
    !/^\d+$/.test(size) ||
    Number(size) < 1 ||
    Number(size) > 100 ||
    Number(page) * Number(size) > 100000 ||
    (accion !== '' && !Object.hasOwn(accionesHistorial, accion)) ||
    [actor, recursoId].some((id) => id !== '' && !uuidValido(id)) ||
    !['', 'SOLICITUD', 'PROVEEDOR'].includes(tipoRecurso) ||
    [desde, hasta].some((fecha) => fecha !== '' && !instanteValido(fecha)) ||
    (desde !== '' && hasta !== '' && nanosegundos(desde) > nanosegundos(hasta))
  )
    return null;
  return {
    page: Number(page),
    size: Number(size),
    accion,
    actor,
    desde,
    hasta,
    tipoRecurso,
    recursoId,
  };
}

export function mensajeErrorHistorial(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 400)
      return 'Los filtros no son válidos. Revisa los identificadores, las fechas y la paginación.';
    if (error.status === 401)
      return 'Tu sesión ha caducado. Accede de nuevo para consultar el historial.';
    if (error.status === 403) return 'No tienes permiso para consultar este historial.';
    if (error.status === 404) return 'El recurso no existe o no está disponible para tu cuenta.';
  }
  return 'No se ha podido cargar el historial. Vuelve a intentarlo en unos instantes.';
}
