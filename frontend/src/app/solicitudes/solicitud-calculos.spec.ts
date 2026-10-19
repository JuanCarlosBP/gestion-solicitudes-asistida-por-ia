import { convertToParamMap } from '@angular/router';
import { borradorPrueba, solicitudPrueba } from './datos-prueba';
import {
  errorAsunto,
  euros,
  importeLineaEstimado,
  totalEstimado,
  validarBorrador,
  validarConcepto,
} from './solicitud-calculos';
import {
  esConflictoSolicitud,
  mensajeErrorSolicitud,
  ordenesSolicitud,
  unidades,
  UnidadConcepto,
} from './solicitud-modelo';
import { leerFiltrosSolicitudes } from './solicitudes-lista';

describe('Estimación decimal exacta SCI-05', () => {
  it.each([
    ['1', '10.0000', '10.00'],
    ['2.500', '4.1250', '10.31'],
    ['3', '0.3350', '1.01'],
    ['1', '0.0050', '0.01'],
    ['1', '0.0049', '0.00'],
    ['0.001', '0.0001', '0.00'],
    ['1', '99999999999.9999', '100000000000.00'],
    ['999999999999.999', '0.0001', '100000000.00'],
    ['100', '99999999999.9999', '9999999999999.99'],
  ])('%s × %s = %s, HALF_UP por línea', (cantidad, precioUnitario, esperado) =>
    expect(importeLineaEstimado({ cantidad, precioUnitario })).toBe(esperado),
  );

  it.each([
    ['0', '1'],
    ['-1', '1'],
    ['1e3', '1'],
    ['1.0001', '1'],
    ['1000000000000', '1'],
    ['1', '0'],
    ['1', '-1'],
    ['1', '1.00001'],
    ['1', '100000000000'],
    ['999999999999.999', '99999999999.9999'],
    ['', '1'],
    ['1,1,1', '1'],
  ])('rechaza cantidad/precio/límite inválidos %s × %s', (cantidad, precioUnitario) =>
    expect(importeLineaEstimado({ cantidad, precioUnitario })).toBeNull(),
  );

  it('suma líneas ya redondeadas, no el producto acumulado', () => {
    const linea = { ...solicitudPrueba.conceptos[0], cantidad: '1', precioUnitario: '0.005' };
    expect(totalEstimado([linea, linea])).toBe('0.02');
    expect(totalEstimado(solicitudPrueba.conceptos)).toBe('21.32');
    expect(totalEstimado([])).toBe('0.00');
  });
  it('detecta desbordamiento de suma aunque cada línea quepa', () => {
    const linea = {
      ...solicitudPrueba.conceptos[0],
      cantidad: '100',
      precioUnitario: '99999999999.9999',
    };
    expect(totalEstimado([linea, { ...linea, cantidad: '1', precioUnitario: '0.01' }])).toBeNull();
  });
  it('formatea máximos sin convertirlos a coma flotante', () =>
    expect(euros('9999999999999.99')).toBe('9.999.999.999.999,99 €'));
});

describe('Validación local de borradores', () => {
  it('admite borrador mínimo sin referencias ni conceptos', () =>
    expect(
      validarBorrador({
        ...borradorPrueba(),
        proveedorId: null,
        supervisorId: null,
        conceptos: [],
      }),
    ).toEqual({}));
  it('aplica longitudes por puntos Unicode tras recorte', () => {
    expect(errorAsunto(` ${'😀'.repeat(160)} `)).toBe('');
    expect(errorAsunto('  a  ')).not.toBe('');
    expect(errorAsunto('😀'.repeat(161))).not.toBe('');
    expect(validarBorrador({ ...borradorPrueba(), descripcion: '😀'.repeat(2000) })).toEqual({});
    expect(
      validarBorrador({ ...borradorPrueba(), descripcion: 'a'.repeat(2001) })['descripcion'],
    ).toBeTruthy();
  });
  it.each(unidades)('admite unidad %s', (unidad) =>
    expect(validarConcepto({ ...solicitudPrueba.conceptos[0], unidad })).toEqual({}),
  );
  it.each([
    { descripcion: '' },
    { descripcion: 'a'.repeat(301) },
    { unidad: 'OTRA' as UnidadConcepto },
    { posicion: 0 },
    { posicion: 1.1 },
    { id: 'no-uuid' },
  ])('rechaza concepto inválido %s', (cambio) =>
    expect(
      Object.keys(validarConcepto({ ...solicitudPrueba.conceptos[0], ...cambio })).length,
    ).toBeGreaterThan(0),
  );
  it('rechaza más de cien, posiciones e identificadores repetidos', () => {
    const datos = borradorPrueba();
    expect(
      validarBorrador({
        ...datos,
        conceptos: Array.from({ length: 101 }, (_, i) => ({
          ...datos.conceptos[0],
          id: null,
          posicion: i + 1,
        })),
      })['conceptos'],
    ).toContain('100');
    expect(
      validarBorrador({ ...datos, conceptos: [datos.conceptos[0], datos.conceptos[0]] })[
        'conceptos'
      ],
    ).toContain('repetirse');
  });
  it('permite cien, UUID nuevos nulos y posiciones no contiguas', () => {
    const datos = borradorPrueba();
    expect(
      validarBorrador({
        ...datos,
        conceptos: Array.from({ length: 100 }, (_, i) => ({
          ...datos.conceptos[0],
          id: null,
          posicion: i * 2 + 1,
        })),
      }),
    ).toEqual({});
  });
  it('valida referencias y exceso total con error controlado', () => {
    expect(
      validarBorrador({ ...borradorPrueba(), proveedorId: 'mal', supervisorId: 'mal' }),
    ).toMatchObject({ proveedorId: expect.any(String), supervisorId: expect.any(String) });
    const linea = {
      ...solicitudPrueba.conceptos[0],
      id: null,
      cantidad: '100',
      precioUnitario: '99999999999.9999',
    };
    expect(
      validarBorrador({ ...borradorPrueba(), conceptos: [linea, { ...linea, posicion: 2 }] })[
        'conceptos'
      ],
    ).toContain('total');
  });
});

describe('Filtros cerrados y errores seguros', () => {
  it.each([
    { page: '-1' },
    { page: '1.5' },
    { page: '9999999999999999999999' },
    { size: '0' },
    { size: '101' },
    { sort: 'id,asc' },
    { numero: 'SOL-1' },
    { estado: 'ANULADA' },
    { proveedor: 'otro' },
    { supervisor: 'otro' },
    { autor: 'otro' },
    { asunto: 'a'.repeat(161) },
    { extra: 'dato' },
    { size: ['1', '2'] },
    { fechaDesde: '2026-02-30' },
    { fechaHasta: 'ayer' },
    { fechaDesde: '2026-10-15', fechaHasta: '2026-10-14' },
  ])('rechaza filtros inválidos %s', (params) =>
    expect(leerFiltrosSolicitudes(convertToParamMap(params), true)).toBeNull(),
  );
  it.each(ordenesSolicitud)('admite orden cerrado %s y fechas inclusivas iguales', (sort) =>
    expect(
      leerFiltrosSolicitudes(
        convertToParamMap({ sort, fechaDesde: '2026-10-14', fechaHasta: '2026-10-14' }),
        true,
      )?.sort,
    ).toBe(sort),
  );
  it('autor solo global y conserva acentos/comodines literales', () => {
    expect(
      leerFiltrosSolicitudes(convertToParamMap({ autor: solicitudPrueba.autor.id }), false),
    ).toBeNull();
    expect(
      leerFiltrosSolicitudes(
        convertToParamMap({ asunto: 'Árbol %_\\', autor: solicitudPrueba.autor.id }),
        true,
      )?.asunto,
    ).toBe('Árbol %_\\');
  });
  it.each([
    [400, '', 'Revisa'],
    [401, '', 'sesión'],
    [403, '', 'permiso'],
    [404, '', 'no existe'],
    [409, 'VERSION_OBSOLETA', 'ha cambiado'],
    [409, 'SOLICITUD_NO_EDITABLE', 'no es un borrador'],
    [409, 'PROVEEDOR_INACTIVO', 'inactivo'],
    [409, 'SUPERVISOR_INVALIDO', 'supervisor'],
    [409, 'CLAVE_IDEMPOTENCIA_REUTILIZADA', 'No se ha aplicado'],
    [500, '', 'Inténtalo'],
    [503, '', 'Inténtalo'],
  ])('error %s/%s presenta texto propio', (status, codigo, mensaje) =>
    expect(
      mensajeErrorSolicitud({ status, error: { error: codigo, detalle: 'SQL secreto' } }),
    ).toContain(mensaje),
  );
  it('no revela mensajes remotos ni confunde referencias con conflictos de versión', () => {
    expect(
      mensajeErrorSolicitud({ status: 500, error: { error: '<script>secreto</script>' } }),
    ).not.toContain('secreto');
    expect(esConflictoSolicitud({ status: 409, error: { error: 'VERSION_OBSOLETA' } })).toBe(true);
    expect(esConflictoSolicitud({ status: 409, error: { error: 'PROVEEDOR_INACTIVO' } })).toBe(
      false,
    );
  });
});
