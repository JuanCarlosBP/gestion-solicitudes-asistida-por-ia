/** Decimal de entrada: coma o punto, sin separadores de miles ni coma flotante. */
export function decimalParaApi(valor: string): string {
  // Una entrada inválida no se convierte parcialmente: la validación la rechaza.
  return /^(0|[1-9]\d*)(?:[.,]\d+)?$/.test(valor) ? valor.replace(',', '.') : valor;
}

/** Presentación exacta: se eliminan solo ceros decimales finales, nunca cifras útiles. */
export function decimalVisible(valor: string): string {
  const canonico = decimalParaApi(valor);
  const partes = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(canonico);
  if (!partes) return '—';
  const entero = partes[1].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fraccion = (partes[2] ?? '').replace(/0+$/, '');
  return fraccion ? `${entero},${fraccion}` : entero;
}
