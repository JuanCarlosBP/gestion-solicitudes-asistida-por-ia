import { createHash } from 'node:crypto';
import { setTimeout as esperar } from 'node:timers/promises';
import { ClienteDemo } from './cliente.mjs';

export const SEMILLA = 160082026;
export const DESFASES_VISITANTES_MS = Object.freeze([0, 1000, 2000]);
export const SEMILLA_ESPERADA = Object.freeze({
  proveedores: 20, solicitudes: 100, conceptosPorSolicitud: 5,
  BORRADOR: 60, PRESENTADA: 20, APROBADA: 10, RECHAZADA: 10,
});

export class FalloCarga extends Error {
  constructor(codigo) { super(codigo); this.name = 'FalloCarga'; this.codigo = codigo; }
}
export class FinVentana extends Error {
  constructor() { super('FIN_VENTANA'); this.name = 'FinVentana'; }
}

/** La evidencia solo recibe códigos del arnés; nunca mensajes de fetch/cuerpos remotos. */
export function codigoFallo(error) {
  return error instanceof FalloCarga ? error.codigo
    : error instanceof FinVentana ? 'FIN_VENTANA'
      : ['TimeoutError', 'AbortError'].includes(error?.name) ? 'TRANSPORTE_TIMEOUT'
        : 'FALLO_NO_CONTROLADO';
}

export function comprobar(condicion, codigo) {
  if (!condicion) throw new FalloCarga(codigo);
}

function respuesta(dato, estado, operacion) {
  comprobar(dato.estado === estado, `${operacion}_HTTP_${dato.estado}_ESPERADO_${estado}`);
  return dato.json;
}

export function uuidDeterminista(visitante, tipo, numero) {
  const hex = createHash('sha256').update(`${SEMILLA}|${visitante}|${tipo}|${numero}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Datos lógicos idénticos entre perfiles; UUID y fechas del servidor no se simulan. */
export function conceptosSemilla(visitante, numero) {
  let estado = (SEMILLA ^ (visitante.charCodeAt(0) * 65537) ^ numero) >>> 0;
  const siguiente = () => {
    estado = (Math.imul(1664525, estado) + 1013904223) >>> 0;
    return estado;
  };
  return Array.from({ length: 5 }, (_, indice) => ({
    id: null,
    descripcion: `Concepto ficticio ${indice + 1}`,
    cantidad: `${1 + siguiente() % 8}.000`,
    unidad: ['UNIDAD', 'HORA', 'SERVICIO', 'DIA', 'METRO'][indice],
    precioUnitario: `${1 + siguiente() % 200}.${String(siguiente() % 10000).padStart(4, '0')}`,
    posicion: indice + 1,
  }));
}

/** Un cliente por visitante, uso secuencial; no persiste cookies, tokens ni payloads. */
export class VisitanteCarga extends ClienteDemo {
  constructor(base, nombre, registrar, faseActual = () => 'semilla', admite = () => true, registrarRechazo = () => {}) {
    super(base);
    comprobar(['A', 'B', 'C', 'OPERADOR'].includes(nombre), 'VISITANTE_INVALIDO');
    this.nombre = nombre;
    this.faseActual = faseActual;
    this.admite = admite;
    this.registrarRechazo = registrarRechazo;
    this.pausaPeticionMs = 300;
    this.ultimoInicio = -Infinity;
    this.faseForzada = null;
    this.fasePeticion = 'semilla';
    this.medir = (muestra) => registrar({
      operacion: muestra.operacion,
      status: muestra.estado,
      ms: Math.round(muestra.ms * 1000) / 1000,
      fase: this.fasePeticion,
      visitante: this.nombre,
      fecha: muestra.fecha,
    });
  }

  async pedir(ruta, opciones = {}) {
    comprobar(typeof opciones.operacion === 'string' && /^[a-zA-Z0-9-]+$/.test(opciones.operacion), 'OPERACION_METRICA_NO_CERRADA');
    const plazo = this.ultimoInicio + this.pausaPeticionMs - performance.now();
    if (plazo > 0) await esperar(plazo);
    if (!this.admite()) throw new FinVentana();
    this.ultimoInicio = performance.now();
    this.fasePeticion = this.faseForzada ?? this.faseActual();
    const respuestaHttp = await super.pedir(ruta, opciones);
    if (respuestaHttp.estado >= 400) {
      const codigo = respuestaHttp.json?.error;
      const codigosPublicos = new Set(['DEMO_CAPACIDAD_OCUPADA', 'DEMO_LIMITE_PETICIONES',
        'DEMO_LIMITE_ALMACENAMIENTO', 'DEMO_RESERVA_INVALIDA', 'NO_AUTENTICADO',
        'ACCESO_NO_PERMITIDO', 'CSRF_INVALIDO', 'DEPENDENCIA_NO_DISPONIBLE']);
      const tipo = respuestaHttp.cabeceras.get('content-type')?.split(';')[0].trim();
      this.registrarRechazo({
        fecha: new Date().toISOString(), operacion: opciones.operacion, status: respuestaHttp.estado,
        fase: this.fasePeticion, visitante: this.nombre,
        formato: tipo === 'application/json' ? 'JSON' : tipo === 'text/html' ? 'HTML' : tipo ? 'OTRO' : 'AUSENTE',
        codigo: codigosPublicos.has(codigo) ? codigo : respuestaHttp.json === null ? null : 'OTRO_CODIGO_OMITIDO',
      });
    }
    return respuestaHttp;
  }

  async cerrar() {
    respuesta(await this.pedir('/api/autenticacion/cerrar-sesion', {
      metodo: 'POST', operacion: 'logout',
    }), 204, 'LOGOUT');
    this.token = null;
  }
}

async function acceder(cliente, rol) {
  const acceso = respuesta(await cliente.login(rol), 200, `LOGIN_${rol}`);
  comprobar(acceso?.usuario?.roles?.length === 1 && acceso.usuario.roles[0] === rol, 'ROL_REAL_INCORRECTO');
  return acceso.usuario;
}

/** Visitante adicional sin reserva: un único intento, separado del tráfico útil. */
export async function probarSobrecupo(cliente) {
  comprobar(cliente.contexto === null && cliente.token === null && cliente.cookies.size === 0, 'SONDA_SOBRECUPO_EXIGE_CLIENTE_NUEVO');
  respuesta(await cliente.pedir('/api/autenticacion/csrf', {
    operacion: 'inducido-sobrecupo-csrf', selector: null, bearer: null,
  }), 204, 'SOBRECUPO_CSRF');
  const rechazada = await cliente.pedir('/api/demo/reservas', {
    metodo: 'POST', operacion: 'inducido-sobrecupo-reserva', selector: null, bearer: null,
  });
  comprobar(rechazada.estado === 409, `SOBRECUPO_HTTP_${rechazada.estado}_ESPERADO_409`);
  comprobar(rechazada.json?.error === 'DEMO_CAPACIDAD_OCUPADA', 'SOBRECUPO_ERROR_INCORRECTO');
  comprobar(!cliente.cookies.has('DEMO-RESERVA') && cliente.contexto === null, 'SOBRECUPO_ASIGNO_RESERVA');
  return { estado: 'PASS', status: 409, reservaAsignada: false };
}

async function referencias(cliente) {
  const proveedores = respuesta(await cliente.pedir('/api/proveedores?activo=true&page=0&size=20&sort=denominacion,asc', {
    operacion: 'proveedores',
  }), 200, 'PROVEEDORES');
  comprobar(proveedores?.totalElementos === 20 && proveedores?.elementos?.length === 20, 'CATALOGO_NO_TIENE_20_PROVEEDORES');
  const supervisores = respuesta(await cliente.pedir('/api/identidad/supervisores?page=0&size=20', {
    operacion: 'supervisores',
  }), 200, 'SUPERVISORES');
  comprobar(supervisores?.elementos?.length === 1, 'CATALOGO_SUPERVISOR_NO_UNICO');
  return { proveedores: proveedores.elementos, supervisor: supervisores.elementos[0] };
}

async function crearCompleta(cliente, datos, numero, tipo) {
  const asunto = `AG016 ${tipo} ${cliente.nombre} ${String(numero).padStart(6, '0')}`;
  const creada = respuesta(await cliente.pedir('/api/solicitudes', {
    metodo: 'POST', cuerpo: { asunto },
    clave: uuidDeterminista(cliente.nombre, `${tipo}-crear`, numero), operacion: 'crear',
  }), 201, 'CREAR');
  comprobar(typeof creada?.id === 'string' && creada.estado === 'BORRADOR', 'BORRADOR_INVALIDO');
  const guardada = respuesta(await cliente.pedir(`/api/solicitudes/${creada.id}`, {
    metodo: 'PUT', operacion: 'editar',
    cuerpo: {
      asunto, descripcion: 'Datos ficticios del ensayo reproducible AG-016.',
      proveedorId: datos.proveedores[numero % 20].id,
      supervisorId: datos.supervisor.id, version: creada.version,
      conceptos: conceptosSemilla(cliente.nombre, numero),
    },
  }), 200, 'EDITAR');
  comprobar(guardada?.conceptos?.length === 5 && guardada.estado === 'BORRADOR', 'CINCO_CONCEPTOS_NO_CONFIRMADOS');
  return guardada;
}

async function presentar(cliente, solicitud, numero, tipo, replay) {
  const entrada = { version: solicitud.version };
  const clave = uuidDeterminista(cliente.nombre, `${tipo}-presentar`, numero);
  const presentada = respuesta(await cliente.pedir(`/api/solicitudes/${solicitud.id}/presentar`, {
    metodo: 'POST', cuerpo: entrada, clave, operacion: 'presentar',
  }), 200, 'PRESENTAR');
  comprobar(presentada?.estado === 'PRESENTADA' && presentada.id === solicitud.id, 'PRESENTACION_INVALIDA');
  if (replay) {
    const repetida = respuesta(await cliente.pedir(`/api/solicitudes/${solicitud.id}/presentar`, {
      metodo: 'POST', cuerpo: entrada, clave, operacion: 'presentar-replay',
    }), 200, 'REPLAY');
    comprobar(JSON.stringify(repetida) === JSON.stringify(presentada), 'REPLAY_NO_COINCIDE');
  }
  return presentada;
}

async function decidir(cliente, solicitud, numero, tipo, aprobar) {
  const accion = aprobar ? 'aprobar' : 'rechazar';
  const decidida = respuesta(await cliente.pedir(`/api/solicitudes/${solicitud.id}/${accion}`, {
    metodo: 'POST', operacion: accion,
    clave: uuidDeterminista(cliente.nombre, `${tipo}-${accion}`, numero),
    cuerpo: { version: solicitud.version, ...(aprobar
      ? { comentario: 'Aprobación ficticia del ensayo AG-016.' }
      : { motivo: 'Rechazo ficticio justificado del ensayo AG-016.' }) },
  }), 200, 'DECIDIR');
  comprobar(decidida?.estado === (aprobar ? 'APROBADA' : 'RECHAZADA'), 'DECISION_INVALIDA');
  return decidida;
}

export async function sembrar(cliente) {
  const inicio = performance.now();
  cliente.pausaPeticionMs = 300;
  await acceder(cliente, 'SOLICITANTE');
  const inicial = respuesta(await cliente.pedir('/api/solicitudes?page=0&size=1', {
    operacion: 'semilla-validar-vacio',
  }), 200, 'SEMILLA_VACIO');
  comprobar(inicial.totalElementos === 0, 'SEMILLA_EXIGE_GENERACION_NUEVA_VACIA');
  const datos = await referencias(cliente);
  const decisiones = [];
  for (let numero = 0; numero < 100; numero++) {
    const creada = await crearCompleta(cliente, datos, numero, 'semilla');
    if (numero >= 60) {
      const presentada = await presentar(cliente, creada, numero, 'semilla', false);
      if (numero >= 80) decisiones.push({ solicitud: presentada, numero });
    }
  }
  await acceder(cliente, 'SUPERVISOR');
  for (const { solicitud, numero } of decisiones) await decidir(cliente, solicitud, numero, 'semilla', numero < 90);
  await acceder(cliente, 'AUDITOR');
  const resumen = respuesta(await cliente.pedir('/api/resumen', { operacion: 'semilla-validar-resumen' }), 200, 'SEMILLA_RESUMEN');
  comprobar(resumen?.solicitudes?.total === 100, 'SEMILLA_TOTAL_INCORRECTO');
  for (const estado of ['BORRADOR', 'PRESENTADA', 'APROBADA', 'RECHAZADA']) {
    comprobar(resumen.solicitudes[estado] === SEMILLA_ESPERADA[estado], `SEMILLA_${estado}_INCORRECTA`);
  }
  await cliente.cerrar();
  return { visitante: cliente.nombre, estado: 'PASS', ms: performance.now() - inicio, ...SEMILLA_ESPERADA };
}

/** Un recorrido útil, secuencial y real. Un error corta el recorrido; nunca se reintenta. */
export async function recorrer(cliente, numero) {
  await acceder(cliente, 'SOLICITANTE');
  respuesta(await cliente.pedir('/api/solicitudes?page=0&size=20', { operacion: 'lista-solicitante' }), 200, 'LISTA_SOLICITANTE');
  const datos = await referencias(cliente);
  respuesta(await cliente.pedir('/api/resumen', { operacion: 'resumen-solicitante' }), 200, 'RESUMEN_SOLICITANTE');
  const creada = await crearCompleta(cliente, datos, numero, 'carga');
  const presentada = await presentar(cliente, creada, numero, 'carga', true);
  respuesta(await cliente.renovar(), 200, 'REFRESH');
  const supervisor = await acceder(cliente, 'SUPERVISOR');
  comprobar(supervisor.id === datos.supervisor.id, 'SUPERVISOR_DISTINTO_DEL_ASIGNADO');
  respuesta(await cliente.pedir('/api/solicitudes?estado=PRESENTADA&page=0&size=20', { operacion: 'lista-supervisor' }), 200, 'LISTA_SUPERVISOR');
  const detalle = respuesta(await cliente.pedir(`/api/solicitudes/${creada.id}`, { operacion: 'detalle-supervisor' }), 200, 'DETALLE_SUPERVISOR');
  comprobar(detalle?.id === creada.id && detalle.version === presentada.version, 'DETALLE_PRESENTADO_NO_COINCIDE');
  const decidida = await decidir(cliente, detalle, numero, 'carga', numero % 2 === 0);
  await acceder(cliente, 'AUDITOR');
  const historial = respuesta(await cliente.pedir('/api/historial?page=0&size=20', { operacion: 'historial' }), 200, 'HISTORIAL');
  comprobar(historial?.totalElementos > 0, 'HISTORIAL_SIN_EVENTOS');
  respuesta(await cliente.pedir('/api/resumen', { operacion: 'resumen-auditor' }), 200, 'RESUMEN_AUDITOR');
  const final = respuesta(await cliente.pedir(`/api/solicitudes/${creada.id}`, { operacion: 'detalle-auditor' }), 200, 'DETALLE_AUDITOR');
  comprobar(final?.id === creada.id && final.estado === decidida.estado && final.conceptos?.length === 5, 'DETALLE_FINAL_NO_COINCIDE');
  await cliente.cerrar();
  return { estado: final.estado };
}
