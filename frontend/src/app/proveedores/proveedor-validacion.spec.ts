import { esConflictoProveedor, mensajeErrorProveedor, paisesFiscales } from './proveedor-modelo';
import { validarProveedor } from './proveedor-formulario';

const datos = {
  tipo: 'PROFESIONAL' as const,
  denominacion: 'Ficticio',
  paisFiscal: 'ES',
  identificadorFiscal: 'FIC-001',
  correoContacto: null,
  telefonoContacto: null,
};

describe('Validación y mensajes de proveedores', () => {
  it('admite Unicode, denominación de 160 caracteres, contactos vacíos y países no ES', () => {
    expect(
      validarProveedor({
        ...datos,
        denominacion: ' 😀'.trim().repeat(160),
        paisFiscal: 'JP',
        identificadorFiscal: ' abc  123 ',
      }),
    ).toEqual({});
    expect(paisesFiscales.size).toBe(249);
  });
  it.each([
    ['denominacion', '   '],
    ['denominacion', 'x'.repeat(161)],
    ['paisFiscal', 'es'],
    ['paisFiscal', 'ZZ'],
    ['identificadorFiscal', 'ab'],
    ['identificadorFiscal', 'x'.repeat(65)],
    ['identificadorFiscal', ' a '],
    ['identificadorFiscal', 'ﬃ'.repeat(22)],
    ['correoContacto', 'correo-invalido'],
    ['correoContacto', 'x'.repeat(250) + '@a.es'],
    ['telefonoContacto', 'x'.repeat(33)],
    ['tipo', 'OTRO'],
  ])('rechaza %s inválido sin truncar', (campo, valor) =>
    expect(validarProveedor({ ...datos, [campo]: valor })[campo]).toBeTruthy(),
  );
  it('admite contactos en límites y teléfono internacional sin patrón nacional', () => {
    expect(
      validarProveedor({
        ...datos,
        correoContacto: 'contacto@demo.invalid',
        telefonoContacto: '+81 03 1234 / extensión 5',
      }),
    ).toEqual({});
    expect(
      validarProveedor({
        ...datos,
        identificadorFiscal: 'x'.repeat(64),
        telefonoContacto: 'x'.repeat(32),
      }),
    ).toEqual({});
  });
  it.each([null, {}, { status: 500, error: { error: '<script>dato sensible</script>' } }])(
    'errores inesperados nunca reflejan entradas',
    (error) => {
      expect(mensajeErrorProveedor(error)).toBe(
        'No se ha podido completar la operación. Inténtalo de nuevo.',
      );
      expect(esConflictoProveedor(error)).toBe(false);
    },
  );
  it('distingue duplicado de concurrencia únicamente con status y código aprobados', () => {
    expect(
      mensajeErrorProveedor({ status: 409, error: { error: 'PROVEEDOR_DUPLICADO' } }),
    ).toContain('inactivo');
    expect(esConflictoProveedor({ status: 409, error: { error: 'VERSION_OBSOLETA' } })).toBe(true);
    expect(esConflictoProveedor({ status: 500, error: { error: 'VERSION_OBSOLETA' } })).toBe(false);
  });
});
