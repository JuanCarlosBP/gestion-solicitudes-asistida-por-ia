/** Sin I/O: la carga inyecta reloj monotónico, espera, observador privado y sonda HTTP. */
export const INTERVALO_OBSERVACION_MS = 1000;
export const MAXIMO_OBSERVACION_MS = 120000;
export const MAXIMO_LLAMADA_OBSERVADOR_MS = 10000;
export const VERSION_OBSERVADOR = 'AG016-observador-1';

export class ErrorCaducidad extends Error {
  constructor(codigo) { super(codigo); this.name = 'ErrorCaducidad'; this.codigo = codigo; }
}

function exigir(condicion, codigo) {
  if (!condicion) throw new ErrorCaducidad(codigo);
}
const fecha = (valor) => typeof valor === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(valor)
  && Number.isFinite(Date.parse(valor));
const claves = (valor, esperadas) => valor && typeof valor === 'object' && !Array.isArray(valor)
  && Object.keys(valor).sort().join('|') === [...esperadas].sort().join('|');

export function referenciaCaducidad(recibidaMonoMs, ttlMinutos) {
  exigir(Number.isFinite(recibidaMonoMs) && recibidaMonoMs >= 0 && ttlMinutos === 60,
    'CADUCIDAD_REFERENCIA_INVALIDA');
  return recibidaMonoMs + ttlMinutos * 60000;
}

/** Las igualdades exactas de microsegundos se verifican en PostgreSQL por el helper. */
export function validarObservacion(dato, contexto, ttlMinutos) {
  exigir(claves(dato, ['version', 'resultado', 'espacio', 'generacion', 'expiraEn', 'reservadaEn',
    'caducadaEn', 'ttlCoherente', 'posterior', 'retrasoServidorMs', 'observadoUTC', 'duracionMs', 'identidad']),
  'CADUCIDAD_OBSERVACION_FORMATO');
  exigir(dato.version === VERSION_OBSERVADOR && ['ESPERANDO', 'CADUCADA'].includes(dato.resultado),
    'CADUCIDAD_OBSERVADOR_NO_VALIDO');
  exigir(dato.espacio === contexto.espacio && dato.generacion === contexto.generacion
    && dato.expiraEn === contexto.expiraEn, 'CADUCIDAD_CONTEXTO_DISTINTO');
  exigir(fecha(dato.reservadaEn) && fecha(dato.expiraEn) && fecha(dato.observadoUTC)
    && dato.ttlCoherente === true && ttlMinutos === 60
    // PostgreSQL redondea Instant Java a microsegundos; Date.parse solo conserva milisegundos.
    && Math.abs(Date.parse(dato.reservadaEn) + ttlMinutos * 60000 - Date.parse(dato.expiraEn)) <= 1,
  'CADUCIDAD_TTL_INCOHERENTE');
  exigir(Number.isFinite(dato.duracionMs) && dato.duracionMs >= 0
    && claves(dato.identidad, ['postgres', 'backend'])
    && ['postgres', 'backend'].every((servicio) => /^[a-f0-9]{64}$/.test(dato.identidad[servicio])),
  'CADUCIDAD_IDENTIDAD_O_COSTE_INVALIDOS');
  if (dato.resultado === 'ESPERANDO') {
    exigir(dato.caducadaEn === null && dato.posterior === null && dato.retrasoServidorMs === null,
      'CADUCIDAD_ESPERA_INCOHERENTE');
  } else {
    exigir(fecha(dato.caducadaEn) && dato.posterior === true
      && Number.isFinite(dato.retrasoServidorMs) && dato.retrasoServidorMs >= 0
      && Date.parse(dato.caducadaEn) >= Date.parse(dato.expiraEn)
      && Math.abs(Date.parse(dato.caducadaEn) - Date.parse(dato.expiraEn) - dato.retrasoServidorMs) <= 1,
    'CADUCIDAD_EVENTO_INCOHERENTE');
  }
  // Copia cerrada: no propaga mensajes, cuerpos ni cabeceras arbitrarias del proceso hijo.
  return { version: dato.version, resultado: dato.resultado, espacio: dato.espacio,
    generacion: dato.generacion, expiraEn: dato.expiraEn, reservadaEn: dato.reservadaEn,
    caducadaEn: dato.caducadaEn, ttlCoherente: dato.ttlCoherente, posterior: dato.posterior,
    retrasoServidorMs: dato.retrasoServidorMs, observadoUTC: dato.observadoUTC,
    duracionMs: dato.duracionMs, identidad: { postgres: dato.identidad.postgres, backend: dato.identidad.backend } };
}

/** Una barrera persistida y una única GET; nunca sondea la reserva buscando un 401. */
export async function comprobarCaducidadNatural({ contexto, ttlMinutos, referenciaMs, finVentanaMs,
  ahora, esperar, observar, sondar, registrar = () => {} }) {
  exigir(Number.isFinite(referenciaMs) && Number.isFinite(finVentanaMs) && referenciaMs < finVentanaMs,
    'CADUCIDAD_FUERA_VENTANA');
  const limiteMs = Math.min(referenciaMs + MAXIMO_OBSERVACION_MS, finVentanaMs);
  const vigente = () => {
    const instante = ahora();
    exigir(Number.isFinite(instante) && instante < finVentanaMs, 'CADUCIDAD_FIN_VENTANA');
    exigir(instante < limiteMs, 'CADUCIDAD_OBSERVACION_TIMEOUT');
    return instante;
  };
  const hasta = async (objetivo) => {
    let actual = vigente();
    while (actual < objetivo) {
      await esperar(Math.min(objetivo, limiteMs) - actual);
      actual = vigente();
    }
  };
  await hasta(referenciaMs);
  const inicioMs = vigente();
  let cantidad = 0;
  let identidad = null;
  while (true) {
    const inicioLecturaMs = vigente();
    let observacion;
    try {
      const dato = await observar(Math.min(MAXIMO_LLAMADA_OBSERVADOR_MS, limiteMs - inicioLecturaMs));
      observacion = validarObservacion(dato, contexto, ttlMinutos);
      if (identidad) exigir(observacion.identidad.postgres === identidad.postgres
        && observacion.identidad.backend === identidad.backend, 'CADUCIDAD_IDENTIDAD_CAMBIO');
      identidad = observacion.identidad;
    } catch (error) {
      const codigo = error instanceof ErrorCaducidad ? error.codigo : 'CADUCIDAD_OBSERVADOR_ERROR';
      registrar('OBSERVACION_CADUCIDAD_FALLIDA', { inicioMs: inicioLecturaMs, finMs: ahora(), codigo });
      throw new ErrorCaducidad(codigo);
    }
    cantidad++;
    const finLecturaMs = ahora();
    registrar('OBSERVACION_CADUCIDAD', { inicioMs: inicioLecturaMs, finMs: finLecturaMs, observacion });
    vigente();
    if (observacion.resultado === 'CADUCADA') {
      const barrera = { referenciaMs, limiteMs, observaciones: cantidad, finMs: finLecturaMs,
        ultimaObservacion: observacion, duracionMs: finLecturaMs - inicioMs };
      registrar('BARRERA_CADUCIDAD_CONFIRMADA', barrera);
      vigente();
      const respuesta = await sondar();
      exigir(respuesta?.estado === 401, 'RESERVA_CADUCADA_NO_DENEGADA');
      return barrera;
    }
    // Un segundo entre observaciones completadas; no catch-up ni reintentos de la GET.
    await hasta(Math.min(finLecturaMs + INTERVALO_OBSERVACION_MS, limiteMs));
  }
}
