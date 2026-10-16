import { BorradorSolicitud, EntradaConcepto, unidades, uuidValido } from './solicitud-modelo';

const maximoCentimos = 999999999999999n;

/** Enteros escalados: evita usar coma flotante incluso en estimaciones y formato. */
function decimalEscalado(valor: string, escala: number, enteros: number): bigint | null {
  const partes = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(valor);
  if (!partes || partes[1].length > enteros || (partes[2]?.length ?? 0) > escala) return null;
  const numero = BigInt(partes[1] + (partes[2] ?? '').padEnd(escala, '0'));
  return numero > 0n ? numero : null;
}
export function importeLineaEstimado(
  concepto: Pick<EntradaConcepto, 'cantidad' | 'precioUnitario'>,
): string | null {
  const cantidad = decimalEscalado(concepto.cantidad, 3, 12);
  const precio = decimalEscalado(concepto.precioUnitario, 4, 11);
  if (cantidad === null || precio === null) return null;
  // Escala7 a escala2, HALF_UP para operandos positivos.
  const centimos = (cantidad * precio + 50000n) / 100000n;
  return centimos <= maximoCentimos ? desdeCentimos(centimos) : null;
}
function desdeCentimos(valor: bigint): string {
  return `${valor / 100n}.${(valor % 100n).toString().padStart(2, '0')}`;
}
export function totalEstimado(conceptos: EntradaConcepto[]): string | null {
  let centimos = 0n;
  for (const concepto of conceptos) {
    const linea = importeLineaEstimado(concepto);
    if (linea === null) return null;
    centimos += BigInt(linea.replace('.', ''));
    if (centimos > maximoCentimos) return null;
  }
  return desdeCentimos(centimos);
}
export function euros(valor: string): string {
  const [entero, decimal] = valor.split('.');
  return `${entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${(decimal ?? '').padEnd(2, '0')} €`;
}
export function errorAsunto(asunto: string): string {
  const longitud = [...asunto.trim()].length;
  return longitud < 3 || longitud > 160 ? 'Indica un asunto de 3 a 160 caracteres.' : '';
}
export function validarConcepto(concepto: EntradaConcepto): Record<string, string> {
  const errores: Record<string, string> = {};
  const longitud = [...concepto.descripcion.trim()].length;
  if (longitud < 1 || longitud > 300) errores['descripcion'] = 'Indica entre 1 y 300 caracteres.';
  if (decimalEscalado(concepto.cantidad, 3, 12) === null)
    errores['cantidad'] = 'Mayor que 0; máximo 999999999999.999, hasta 3 decimales.';
  if (decimalEscalado(concepto.precioUnitario, 4, 11) === null)
    errores['precioUnitario'] = 'Mayor que 0; máximo 99999999999.9999, hasta 4 decimales.';
  if (!unidades.includes(concepto.unidad)) errores['unidad'] = 'Selecciona una unidad válida.';
  if (!Number.isSafeInteger(concepto.posicion) || concepto.posicion < 1)
    errores['posicion'] = 'La posición debe ser un entero positivo.';
  if (concepto.id !== null && !uuidValido(concepto.id))
    errores['id'] = 'El identificador del concepto no es válido.';
  if (!errores['cantidad'] && !errores['precioUnitario'] && importeLineaEstimado(concepto) === null)
    errores['importe'] = 'La línea supera el importe máximo permitido.';
  return errores;
}
export function validarBorrador(datos: BorradorSolicitud): Record<string, string> {
  const errores: Record<string, string> = {};
  const asunto = errorAsunto(datos.asunto);
  if (asunto) errores['asunto'] = asunto;
  if ([...(datos.descripcion?.trim() ?? '')].length > 2000)
    errores['descripcion'] = 'La descripción admite hasta 2.000 caracteres.';
  for (const campo of ['proveedorId', 'supervisorId'] as const) {
    if (datos[campo] !== null && !uuidValido(datos[campo]!))
      errores[campo] = 'Selecciona una referencia válida.';
  }
  if (datos.conceptos.length > 100) errores['conceptos'] = 'Se admiten hasta 100 conceptos.';
  const posiciones = new Set<number>();
  const ids = new Set<string>();
  datos.conceptos.forEach((concepto, indice) => {
    for (const [campo, mensaje] of Object.entries(validarConcepto(concepto)))
      errores[`conceptos.${indice}.${campo}`] = mensaje;
    if (posiciones.has(concepto.posicion) || (concepto.id !== null && ids.has(concepto.id)))
      errores['conceptos'] = 'Los conceptos y sus posiciones no pueden repetirse.';
    posiciones.add(concepto.posicion);
    if (concepto.id !== null) ids.add(concepto.id);
  });
  if (
    totalEstimado(datos.conceptos) === null &&
    !Object.keys(errores).some((campo) => campo.startsWith('conceptos'))
  )
    errores['conceptos'] = 'El total supera el máximo de 9.999.999.999.999,99 €.';
  return errores;
}
