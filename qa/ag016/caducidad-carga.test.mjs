import assert from 'node:assert/strict';
import test from 'node:test';
import { comprobarCaducidadNatural, ErrorCaducidad, referenciaCaducidad,
  validarObservacion, VERSION_OBSERVADOR } from './caducidad-carga.mjs';
import { observarConContexto } from './observar-caducidad.mjs';

const contexto = Object.freeze({ espacio: 'ag016_demo_02',
  generacion: '12345678-1234-4234-8234-123456789abc', expiraEn: '2030-01-01T01:00:00.123456789Z' });
const observacion = (resultado = 'CADUCADA', cambios = {}) => ({ version: VERSION_OBSERVADOR, resultado,
  espacio: contexto.espacio, generacion: contexto.generacion, expiraEn: contexto.expiraEn,
  reservadaEn: '2030-01-01T00:00:00.123457Z',
  caducadaEn: resultado === 'CADUCADA' ? '2030-01-01T01:00:00.623457Z' : null,
  ttlCoherente: true, posterior: resultado === 'CADUCADA' ? true : null,
  retrasoServidorMs: resultado === 'CADUCADA' ? 500 : null,
  observadoUTC: '2030-01-01T01:00:01.000Z', duracionMs: 10,
  identidad: { postgres: 'a'.repeat(64), backend: 'b'.repeat(64) }, ...cambios });

function escenario({ respuestas = [observacion()], referenciaMs = 3600000, finVentanaMs = 3900000,
  estado = 401, coste = 10, alRegistrar = () => {}, falloObservador, esperaTemprana = false } = {}) {
  let instante = 0;
  let siguiente = 0;
  const lecturas = [], sondas = [], eventos = [], esperas = [];
  return {
    lecturas, sondas, eventos, esperas, ahora: () => instante,
    ejecutar: () => comprobarCaducidadNatural({ contexto, ttlMinutos: 60, referenciaMs, finVentanaMs,
      ahora: () => instante,
      esperar: async (ms) => {
        esperas.push(ms);
        instante += esperaTemprana && esperas.length === 1 ? ms - 0.25 : ms;
      },
      observar: async (presupuestoMs) => {
        lecturas.push({ instante, presupuestoMs });
        instante += coste;
        if (falloObservador) throw falloObservador;
        return respuestas[Math.min(siguiente++, respuestas.length - 1)];
      },
      sondar: async () => { sondas.push(instante); return { estado }; },
      registrar: (tipo, dato) => { eventos.push({ tipo, ...dato }); instante += alRegistrar(tipo) ?? 0; },
    }),
  };
}
const falla = (codigo) => (error) => error instanceof ErrorCaducidad && error.codigo === codigo;

test('la referencia es recepción monotónica + TTL, independiente de UTC externo', () => {
  assert.equal(referenciaCaducidad(123.45, 60), 3600123.45);
  for (const valor of [NaN, Infinity, -1]) assert.throws(() => referenciaCaducidad(valor, 60));
  assert.throws(() => referenciaCaducidad(0, 59));
});

test('espera el plazo y la transición persistida aunque UTC observado avance y retroceda', async () => {
  const caso = escenario({ respuestas: [
    observacion('ESPERANDO', { observadoUTC: '2030-01-01T01:00:01.600Z' }),
    observacion('ESPERANDO', { observadoUTC: '2030-01-01T00:59:59.400Z' }),
    observacion('CADUCADA', { observadoUTC: '2030-01-01T01:00:00.300Z' }),
  ] });
  const barrera = await caso.ejecutar();
  assert.equal(caso.lecturas.length, 3);
  assert.equal(caso.lecturas[0].instante, 3600000);
  assert.equal(caso.lecturas[1].instante - caso.lecturas[0].instante, 1010);
  assert.equal(caso.sondas.length, 1);
  assert.equal(barrera.observaciones, 3);
  assert.equal(barrera.limiteMs, 3720000);
  const ultima = caso.eventos.at(-1);
  assert.equal(ultima.tipo, 'BARRERA_CADUCIDAD_CONFIRMADA');
  assert.ok(caso.sondas[0] >= ultima.finMs);
  assert.ok(caso.sondas[0] < 3900000);
});

test('un temporizador adelantado vuelve a comprobar el plazo antes de observar', async () => {
  const caso = escenario({ esperaTemprana: true });
  await caso.ejecutar();
  assert.equal(caso.lecturas[0].instante, 3600000);
  assert.equal(caso.esperas[1], 0.25);
});

test('un 200 después de la barrera falla con una sola GET, sin retry', async () => {
  const caso = escenario({ estado: 200 });
  await assert.rejects(caso.ejecutar(), falla('RESERVA_CADUCADA_NO_DENEGADA'));
  assert.equal(caso.sondas.length, 1);
  assert.equal(caso.lecturas.length, 1);
});

for (const estado of [0, 403, 404, 429, 500]) {
  test(`la sonda ${estado} no sustituye a 401 ni se reintenta`, async () => {
    const caso = escenario({ estado });
    await assert.rejects(caso.ejecutar(), falla('RESERVA_CADUCADA_NO_DENEGADA'));
    assert.equal(caso.sondas.length, 1);
  });
}

test('sin evento se agotan exactamente los 120 s y no se emite GET', async () => {
  const caso = escenario({ respuestas: [observacion('ESPERANDO')] });
  await assert.rejects(caso.ejecutar(), falla('CADUCIDAD_OBSERVACION_TIMEOUT'));
  assert.equal(caso.ahora(), 3720000);
  assert.equal(caso.sondas.length, 0);
  assert.ok(caso.lecturas.every((l) => l.instante < 3720000));
});

test('el límite de 65 minutos prevalece sobre los 120 s de observación', async () => {
  const caso = escenario({ referenciaMs: 3899500, respuestas: [observacion('ESPERANDO')] });
  await assert.rejects(caso.ejecutar(), falla('CADUCIDAD_FIN_VENTANA'));
  assert.equal(caso.lecturas[0].presupuestoMs, 500);
  assert.equal(caso.ahora(), 3900000);
  assert.equal(caso.sondas.length, 0);
});

test('un helper que termina después de la ventana no autoriza la GET', async () => {
  const caso = escenario({ referenciaMs: 3899995 });
  await assert.rejects(caso.ejecutar(), falla('CADUCIDAD_FIN_VENTANA'));
  assert.equal(caso.lecturas[0].presupuestoMs, 5);
  assert.equal(caso.sondas.length, 0);
  assert.ok(!caso.eventos.some((e) => e.tipo === 'BARRERA_CADUCIDAD_CONFIRMADA'));
});

test('comprueba el cierre inmediatamente antes de la GET aunque ya registrara barrera', async () => {
  const caso = escenario({ alRegistrar: (tipo) => tipo === 'BARRERA_CADUCIDAD_CONFIRMADA' ? 300000 : 0 });
  await assert.rejects(caso.ejecutar(), falla('CADUCIDAD_FIN_VENTANA'));
  assert.equal(caso.sondas.length, 0);
});

test('una referencia fuera de los 65 minutos no provoca espera ni observación', async () => {
  const caso = escenario({ referenciaMs: 3900000 });
  await assert.rejects(caso.ejecutar(), falla('CADUCIDAD_FUERA_VENTANA'));
  assert.equal(caso.esperas.length, 0);
  assert.equal(caso.lecturas.length, 0);
});

test('error o timeout del proceso observador falla sin fallback ni GET', async () => {
  for (const error of [new Error('detalle privado no propagable'), new ErrorCaducidad('CADUCIDAD_HELPER_TIMEOUT')]) {
    const caso = escenario({ falloObservador: error });
    const codigo = error instanceof ErrorCaducidad ? error.codigo : 'CADUCIDAD_OBSERVADOR_ERROR';
    await assert.rejects(caso.ejecutar(), falla(codigo));
    assert.equal(caso.sondas.length, 0);
    assert.equal(caso.eventos[0].codigo, codigo);
    assert.ok(!JSON.stringify(caso.eventos).includes('detalle privado'));
  }
});

const incorrectas = [
  ['JSON incompleto', {}, 'CADUCIDAD_OBSERVACION_FORMATO'],
  ['claves extra', observacion('CADUCADA', { extra: 'omitido' }), 'CADUCIDAD_OBSERVACION_FORMATO'],
  ['versión diferente', observacion('CADUCADA', { version: 'otra' }), 'CADUCIDAD_OBSERVADOR_NO_VALIDO'],
  ['FAIL explícito', observacion('FAIL'), 'CADUCIDAD_OBSERVADOR_NO_VALIDO'],
  ['otro espacio', observacion('CADUCADA', { espacio: 'ag016_demo_03' }), 'CADUCIDAD_CONTEXTO_DISTINTO'],
  ['otra generación', observacion('CADUCADA', { generacion: 'otra' }), 'CADUCIDAD_CONTEXTO_DISTINTO'],
  ['otra caducidad', observacion('CADUCADA', { expiraEn: '2030-01-01T02:00:00Z' }), 'CADUCIDAD_CONTEXTO_DISTINTO'],
  ['TTL no acreditado', observacion('CADUCADA', { ttlCoherente: false }), 'CADUCIDAD_TTL_INCOHERENTE'],
  ['fecha inválida', observacion('CADUCADA', { reservadaEn: 'inválida' }), 'CADUCIDAD_TTL_INCOHERENTE'],
  ['TTL diferente', observacion('CADUCADA', { reservadaEn: '2030-01-01T00:30:00Z' }), 'CADUCIDAD_TTL_INCOHERENTE'],
  ['identidad incompleta', observacion('CADUCADA', { identidad: { postgres: 'a'.repeat(64), backend: null } }), 'CADUCIDAD_IDENTIDAD_O_COSTE_INVALIDOS'],
  ['coste negativo', observacion('CADUCADA', { duracionMs: -1 }), 'CADUCIDAD_IDENTIDAD_O_COSTE_INVALIDOS'],
  ['evento no posterior', observacion('CADUCADA', { posterior: false }), 'CADUCIDAD_EVENTO_INCOHERENTE'],
  ['evento anterior', observacion('CADUCADA', { caducadaEn: '2030-01-01T00:59:00Z' }), 'CADUCIDAD_EVENTO_INCOHERENTE'],
  ['retraso inconsistente', observacion('CADUCADA', { retrasoServidorMs: 1000 }), 'CADUCIDAD_EVENTO_INCOHERENTE'],
  ['ESPERANDO contradictorio', observacion('ESPERANDO', { posterior: true }), 'CADUCIDAD_ESPERA_INCOHERENTE'],
];
for (const [nombre, respuesta, codigo] of incorrectas) {
  test(`observación inválida: ${nombre}`, async () => {
    const caso = escenario({ respuestas: [respuesta] });
    await assert.rejects(caso.ejecutar(), falla(codigo));
    assert.equal(caso.sondas.length, 0);
    assert.ok(!caso.eventos.some((e) => e.tipo === 'BARRERA_CADUCIDAD_CONFIRMADA'));
  });
}

test('cambio de contenedor entre observaciones se deniega', async () => {
  const caso = escenario({ respuestas: [observacion('ESPERANDO'),
    observacion('CADUCADA', { identidad: { postgres: 'a'.repeat(64), backend: 'c'.repeat(64) } })] });
  await assert.rejects(caso.ejecutar(), falla('CADUCIDAD_IDENTIDAD_CAMBIO'));
  assert.equal(caso.sondas.length, 0);
});

test('acepta el redondeo PostgreSQL de nanosegundos Java sin sustituir el dictamen SQL', () => {
  assert.equal(validarObservacion(observacion(), contexto, 60).resultado, 'CADUCADA');
  const copia = observacion();
  const validada = validarObservacion(copia, contexto, 60);
  copia.identidad.backend = 'x';
  assert.equal(validada.identidad.backend, 'b'.repeat(64));
});

test('el JSON producido por el helper real es compatible con la barrera, sin ejecutar Docker', async () => {
  const esperado = observacion();
  let llamadas = 0;
  const laboratorio = { config: { proyecto: 'gestion-solicitudes-ag016' }, composeArgs: ['compose'],
    docker: (args, opciones) => {
      llamadas++;
      if (args.includes('ps')) return args.at(-1) === 'backend' ? 'b'.repeat(64) : 'a'.repeat(64);
      if (args[0] === 'inspect') {
        const servicio = args.at(-1) === 'b'.repeat(64) ? 'backend' : 'postgres';
        return JSON.stringify({ id: args.at(-1), proyecto: 'gestion-solicitudes-ag016', servicio,
          estado: 'running', iniciadoEn: '2030-01-01T00:00:00.000Z' });
      }
      assert.equal(args[0], 'exec');
      assert.match(opciones.input, /BEGIN READ ONLY/);
      return JSON.stringify({ reservas: 1, caducidades: 1, reservadaEn: esperado.reservadaEn,
        caducadaEn: esperado.caducadaEn, ttlCoherente: true, posterior: true, retrasoServidorMs: 500 });
    },
  };
  const respuesta = observarConContexto(contexto, laboratorio);
  const caso = escenario({ respuestas: [respuesta] });
  await caso.ejecutar();
  assert.equal(llamadas, 9);
  assert.equal(caso.sondas.length, 1);
  assert.equal(caso.eventos.at(-1).ultimaObservacion.resultado, 'CADUCADA');
});
