import { decimalParaApi, decimalVisible } from './decimal-entrada';
import { importeLineaEstimado, validarConcepto } from './solicitud-calculos';
import { solicitudPrueba } from './datos-prueba';

describe('AG018: decimales de usuario sin pérdida de precisión', () => {
  it.each([
    ['98,8', '98.8'],
    ['98.8', '98.8'],
    ['0,0001', '0.0001'],
    ['233', '233'],
    ['99999999999,9999', '99999999999.9999'],
  ])('normaliza %s únicamente para la API', (entrada, salida) => {
    expect(decimalParaApi(entrada)).toBe(salida);
  });
  it.each(['1,2.3', '1.2,3', '1,2,3', '1e3', '', '-1', '00,5', '1,'])(
    'no convierte parcialmente una entrada inválida: %s',
    (entrada) => {
      expect(decimalParaApi(entrada)).toBe(entrada);
      expect(importeLineaEstimado({ cantidad: '1', precioUnitario: entrada })).toBeNull();
    },
  );
  it.each([
    ['98.8000', '98,8'],
    ['233.0000', '233'],
    ['0.0001', '0,0001'],
    ['12.1234', '12,1234'],
    ['99999999999.9999', '99.999.999.999,9999'],
  ])('presenta %s sin ceros sobrantes ni redondeo', (entrada, salida) => {
    expect(decimalVisible(entrada)).toBe(salida);
  });
  it('admite coma y conserva HALF_UP, límites y validación', () => {
    expect(importeLineaEstimado({ cantidad: '5', precioUnitario: '98,8' })).toBe('494.00');
    expect(importeLineaEstimado({ cantidad: '2,5', precioUnitario: '4,125' })).toBe('10.31');
    expect(importeLineaEstimado({ cantidad: '1', precioUnitario: '0,005' })).toBe('0.01');
    expect(importeLineaEstimado({ cantidad: '1,0001', precioUnitario: '1' })).toBeNull();
    expect(importeLineaEstimado({ cantidad: '1', precioUnitario: '1,00001' })).toBeNull();
    expect(
      validarConcepto({ ...solicitudPrueba.conceptos[0], cantidad: '5', precioUnitario: '98,8' }),
    ).toEqual({});
  });
});
