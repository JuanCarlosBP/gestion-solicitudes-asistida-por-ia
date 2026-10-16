import { of } from 'rxjs';
import { EventoHistorial, PaginaHistorial } from './historial-modelo';

export const eventoPrueba: EventoHistorial = {
  id: 'EVENTO:00000000-0000-4000-8000-000000000701',
  tipoRecurso: 'SOLICITUD',
  recursoId: '00000000-0000-4000-8000-000000000101',
  accion: 'BORRADOR_CREADO',
  actor: { id: '00000000-0000-4000-8000-000000000201', nombreVisible: 'Persona ficticia' },
  ocurridoEn: '2026-10-15T10:00:00Z',
  versionAnterior: null,
  versionResultante: 0,
  estadoAnterior: null,
  estadoResultante: 'BORRADOR',
  resumen: 'Borrador creado.',
  origen: 'EVENTO_V7',
};
export function paginaHistorialPrueba(elementos: EventoHistorial[] = []): PaginaHistorial {
  return {
    elementos,
    pagina: 0,
    tamano: 20,
    totalElementos: elementos.length,
    totalPaginas: elementos.length ? 1 : 0,
    historiaAnteriorDesconocida: false,
  };
}
/** Aísla el módulo nuevo en las regresiones de formularios004–006. */
export const historialVacioPrueba = { consultar: () => of(paginaHistorialPrueba()) };
