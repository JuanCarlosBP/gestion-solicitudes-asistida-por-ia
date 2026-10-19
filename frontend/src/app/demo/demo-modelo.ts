export type RolDemo = 'SOLICITANTE' | 'SUPERVISOR' | 'AUDITOR';

export interface PresentacionDemo {
  habilitada: boolean;
  cupo: number;
  duracionMinutos: number;
  disponibles: number;
}

/** Selector público: el servidor exige además su cookie opaca HttpOnly. */
export interface ReservaDemo {
  reservaId: string;
  espacio: string;
  generacion: string;
  expiraEn: string;
}

export const claveContextoDemo = 'gs.demo.contexto.v1';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function reservaValida(valor: unknown, ahora: number): valor is ReservaDemo {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
  const dato = valor as Record<string, unknown>;
  return (
    Object.keys(dato).length === 4 &&
    typeof dato['reservaId'] === 'string' &&
    uuid.test(dato['reservaId']) &&
    typeof dato['generacion'] === 'string' &&
    uuid.test(dato['generacion']) &&
    typeof dato['espacio'] === 'string' &&
    /^[a-zA-Z0-9_-]{1,64}$/.test(dato['espacio']) &&
    typeof dato['expiraEn'] === 'string' &&
    Number.isFinite(Date.parse(dato['expiraEn'])) &&
    Date.parse(dato['expiraEn']) > ahora
  );
}

export const selectorDemo = (reserva: ReservaDemo): string =>
  `${reserva.espacio}:${reserva.generacion}:${reserva.reservaId}`;
