/** Un único presupuesto incluye todos los servicios; no se renueva entre etapas. */
export function plazoArranque(reloj = () => performance.now(), limiteMs = 90000) {
  const inicio = reloj();
  return {
    pendiente: () => reloj() - inicio < limiteMs,
    comprobar() {
      const transcurrido = reloj() - inicio;
      if (transcurrido > limiteMs) throw Error('Arranque conjunto superó 90 segundos.');
      return transcurrido;
    },
  };
}
