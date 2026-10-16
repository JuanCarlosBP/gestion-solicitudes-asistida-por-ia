import { HttpErrorResponse } from '@angular/common/http';
import { convertToParamMap } from '@angular/router';
import {
  filtrosHistorialIniciales,
  instanteValido,
  leerFiltrosHistorial,
  mensajeErrorHistorial,
} from './historial-modelo';

describe('Historial: filtros cerrados y errores seguros HA04/06/08', () => {
  it('usa página0 tamaño20 sin filtros', () =>
    expect(leerFiltrosHistorial(convertToParamMap({}), true)).toEqual(filtrosHistorialIniciales));
  it.each([
    { sorpresa: 'x' },
    { page: '-1' },
    { page: '1.2' },
    { page: '2147483648' },
    { size: '0' },
    { size: '101' },
    { page: '1001', size: '100' },
    { page: ['0', '1'] },
    { accion: '' },
    { accion: 'APROBAR' },
    { actor: 'no-uuid' },
    { recursoId: 'xxx' },
    { tipoRecurso: 'USUARIO' },
    { desde: '2026-10-15' },
    { desde: '2026-10-15T10:00:00Z', hasta: '2026-10-15T11:00:00+02:00' },
  ])('rechaza entrada inválida %s', (params) =>
    expect(leerFiltrosHistorial(convertToParamMap(params), true)).toBeNull(),
  );
  it.each([
    '2026-02-30T10:00:00Z',
    '2026-10-15T24:00:00Z',
    '2026-10-15T12:60:00Z',
    '2026-10-15T10:00:00+19:00',
    '2026-10-15T10:00:00+18:01',
    '2026-10-15T10:00:00',
  ])('rechaza instante %s', (fecha) => expect(instanteValido(fecha)).toBe(false));
  it.each([
    '2024-02-29T10:00:00Z',
    '2026-10-15T10:00:00+02:00',
    '2026-10-15T10:00:00.123456789-04:00',
  ])('acepta instante %s', (fecha) => expect(instanteValido(fecha)).toBe(true));
  it('rechaza filtros globales en recurso', () =>
    expect(
      leerFiltrosHistorial(convertToParamMap({ tipoRecurso: 'SOLICITUD' }), false),
    ).toBeNull());
  it('acepta extremos e intervalo equivalente', () =>
    expect(
      leerFiltrosHistorial(
        convertToParamMap({
          page: '0',
          size: '100',
          accion: 'APROBADA',
          desde: '2026-10-15T10:00:00Z',
          hasta: '2026-10-15T12:00:00+02:00',
        }),
        true,
      )?.size,
    ).toBe(100));
  it('acepta offset máximo y rechaza rango invertido a un nanosegundo', () => {
    expect(leerFiltrosHistorial(convertToParamMap({ page: '1000', size: '100' }), true)?.page).toBe(
      1000,
    );
    expect(
      leerFiltrosHistorial(
        convertToParamMap({
          desde: '2026-10-15T10:00:00.123456789Z',
          hasta: '2026-10-15T10:00:00.123456788Z',
        }),
        true,
      ),
    ).toBeNull();
    expect(
      leerFiltrosHistorial(
        convertToParamMap({
          desde: '2026-10-15T10:00:00.123456789Z',
          hasta: '2026-10-15T12:00:00.123456789+02:00',
        }),
        true,
      ),
    ).not.toBeNull();
  });
  it.each([400, 401, 403, 404, 503, 0])('oculta cuerpo interno HTTP%s', (status) =>
    expect(
      mensajeErrorHistorial(new HttpErrorResponse({ status, error: 'SQL secreto ficticio' })),
    ).not.toContain('SQL'),
  );
});
