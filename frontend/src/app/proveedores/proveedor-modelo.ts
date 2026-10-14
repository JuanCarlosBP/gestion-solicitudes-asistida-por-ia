export type TipoProveedor = 'PERSONA_JURIDICA' | 'PROFESIONAL';
export type EstadoProveedor = 'true' | 'false' | 'todos';
export type OrdenProveedor =
  | 'denominacion,asc'
  | 'denominacion,desc'
  | 'creadoEn,asc'
  | 'creadoEn,desc'
  | 'actualizadoEn,asc'
  | 'actualizadoEn,desc';

export interface DatosProveedor {
  tipo: TipoProveedor;
  denominacion: string;
  paisFiscal: string;
  identificadorFiscal: string;
  correoContacto: string | null;
  telefonoContacto: string | null;
}

export interface Proveedor extends DatosProveedor {
  id: string;
  activo: boolean;
  version: number;
  creadoEn: string;
  actualizadoEn: string;
}

export interface PaginaProveedores {
  elementos: Proveedor[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
}

export interface FiltrosProveedores {
  denominacion: string;
  identificadorFiscal: string;
  tipo: string;
  paisFiscal: string;
  activo: EstadoProveedor;
  page: number;
  size: number;
  sort: OrdenProveedor;
}

export const filtrosIniciales: FiltrosProveedores = {
  denominacion: '',
  identificadorFiscal: '',
  tipo: '',
  paisFiscal: '',
  activo: 'true',
  page: 0,
  size: 20,
  sort: 'denominacion,asc',
};

export const ordenesProveedor: OrdenProveedor[] = [
  'denominacion,asc',
  'denominacion,desc',
  'creadoEn,asc',
  'creadoEn,desc',
  'actualizadoEn,asc',
  'actualizadoEn,desc',
];

// ISO 3166-1 alpha-2: la validación definitiva corresponde al backend.
export const paisesFiscales = new Set(
  (
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
    'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
    'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
    'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT ' +
    'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
    'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG ' +
    'UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
  ).split(' '),
);

/** Mensajes controlados; nunca se refleja el cuerpo de un error de API. */
export function mensajeErrorProveedor(error: unknown): string {
  const fallo = error as { status?: number; error?: { error?: string } } | null;
  if (fallo?.status === 409 && fallo.error?.error === 'VERSION_OBSOLETA')
    return 'Otro usuario ha cambiado este proveedor. Recarga los datos antes de volver a guardar.';
  if (fallo?.status === 409 && fallo.error?.error === 'PROVEEDOR_DUPLICADO')
    return 'Ya existe un proveedor con ese país e identificador fiscal, incluso si está inactivo.';
  if (fallo?.status === 404) return 'El proveedor no existe o no está disponible para tu cuenta.';
  if (fallo?.status === 403) return 'Tu cuenta no tiene permiso para esta operación.';
  if (fallo?.status === 400) return 'Revisa los datos y los límites indicados en el formulario.';
  if (fallo?.status === 401) return 'La sesión no está disponible. Vuelve a acceder.';
  return 'No se ha podido completar la operación. Inténtalo de nuevo.';
}

export function esConflictoProveedor(error: unknown): boolean {
  const fallo = error as { status?: number; error?: { error?: string } } | null;
  return fallo?.status === 409 && fallo.error?.error === 'VERSION_OBSOLETA';
}
