import { BorradorSolicitud, DetalleSolicitud, Pagina, PersonaSolicitud } from './solicitud-modelo';

export const supervisorPrueba: PersonaSolicitud = {
  id: '00000000-0000-4000-8000-000000000002',
  nombreVisible: 'Supervisora ficticia',
};
export const solicitudPrueba: DetalleSolicitud = {
  id: '00000000-0000-4000-8000-000000000301',
  numero: 'SOL-2026-000001',
  autor: { id: '00000000-0000-4000-8000-000000000001', nombreVisible: 'Persona de prueba' },
  asunto: 'Material ficticio de oficina',
  descripcion: 'Descripción ficticia',
  proveedorId: '00000000-0000-4000-8000-000000000101',
  proveedor: {
    id: '00000000-0000-4000-8000-000000000101',
    tipo: 'PROFESIONAL',
    denominacion: 'Proveedor ficticio',
    paisFiscal: 'ES',
    identificadorFiscal: 'FIC-101',
    activo: true,
  },
  supervisorId: supervisorPrueba.id,
  supervisor: supervisorPrueba,
  moneda: 'EUR',
  estado: 'BORRADOR',
  importeTotal: '21.32',
  version: 3,
  creadoEn: '2026-10-14T00:00:00Z',
  actualizadoEn: '2026-10-14T00:01:00Z',
  presentadoEn: null,
  decididoEn: null,
  decision: null,
  conceptos: [
    {
      id: '00000000-0000-4000-8000-000000000401',
      descripcion: 'Primero',
      cantidad: '1.000',
      unidad: 'UNIDAD',
      precioUnitario: '10.0000',
      importeLinea: '10.00',
      posicion: 1,
    },
    {
      id: '00000000-0000-4000-8000-000000000402',
      descripcion: 'Segundo',
      cantidad: '2.500',
      unidad: 'HORA',
      precioUnitario: '4.1250',
      importeLinea: '10.31',
      posicion: 2,
    },
    {
      id: '00000000-0000-4000-8000-000000000403',
      descripcion: 'Tercero',
      cantidad: '3.000',
      unidad: 'SERVICIO',
      precioUnitario: '0.3350',
      importeLinea: '1.01',
      posicion: 3,
    },
  ],
};
export function paginaPrueba<T>(elementos: T[]): Pagina<T> {
  return {
    elementos,
    pagina: 0,
    tamano: 20,
    totalElementos: elementos.length,
    totalPaginas: elementos.length ? 1 : 0,
  };
}
export function borradorPrueba(): BorradorSolicitud {
  const { asunto, descripcion, proveedorId, supervisorId, version, conceptos } = solicitudPrueba;
  return {
    asunto,
    descripcion,
    proveedorId,
    supervisorId,
    version,
    conceptos: conceptos.map(({ id, descripcion, cantidad, unidad, precioUnitario, posicion }) => ({
      id,
      descripcion,
      cantidad,
      unidad,
      precioUnitario,
      posicion,
    })),
  };
}
