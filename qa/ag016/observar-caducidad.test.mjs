import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clasificarEventos, consultaEventos, normalizarTimestampJdbc, observarConContexto, validarEntrada } from './observar-caducidad.mjs';

// Fixtures ficticios. No importan laboratorio ni invocan Docker.
const entorno = () => ({ AG016_CADUCIDAD_ESPACIO: 'ag016_demo_02',
  AG016_CADUCIDAD_GENERACION: '16008000-0000-4000-8000-000000000001',
  AG016_CADUCIDAD_EXPIRA: '2026-10-16T13:23:28.398302123Z', AG016_CADUCIDAD_TTL_MINUTOS: '60' });
const esperando = () => ({ reservas: 1, caducidades: 0, reservadaEn: '2026-10-16T12:23:28.398302Z',
  caducadaEn: null, ttlCoherente: true, posterior: null, retrasoServidorMs: null });
const caducada = () => ({ ...esperando(), caducidades: 1, caducadaEn: '2026-10-16T13:23:28.896724Z',
  posterior: true, retrasoServidorMs: 498.422 });

test('entrada conserva fracción Java original y exige inventario, UUID ASCII y TTL literal60', () => {
  assert.equal(validarEntrada(entorno()).expiraEn, entorno().AG016_CADUCIDAD_EXPIRA);
  for (const [clave, valor] of [['AG016_CADUCIDAD_ESPACIO', 'ag016_demo_04'],
    ['AG016_CADUCIDAD_GENERACION', "x';SELECT 1;--"], ['AG016_CADUCIDAD_GENERACION', 'é'.repeat(36)],
    ['AG016_CADUCIDAD_TTL_MINUTOS', '060'], ['AG016_CADUCIDAD_TTL_MINUTOS', 60]]) {
    assert.throws(() => validarEntrada({ ...entorno(), [clave]: valor }));
  }
  for (const clave of Object.keys(entorno())) {
    const e = entorno(); delete e[clave]; assert.throws(() => validarEntrada(e));
  }
});
test('fechas inválidas, redondeadas por Date o sin precisión admitida se rechazan', () => {
  for (const fecha of ['2026-02-30T13:23:28.1Z', '2026-13-01T00:00:00.1Z', '2026-01-01T24:00:00.1Z',
    '2026-01-01T00:00:00Z', '2026-01-01T00:00:00.1234567890Z', '2026-01-01T00:00:00.1+00:00', '0000-01-01T00:00:00.1Z'])
    assert.throws(() => validarEntrada({ ...entorno(), AG016_CADUCIDAD_EXPIRA: fecha }));
  assert.doesNotThrow(() => validarEntrada({ ...entorno(), AG016_CADUCIDAD_EXPIRA: '2028-02-29T00:00:00.1Z' }));
});
test('normalización JDBC conserva seis decimales y redondea antes/en/después de ambos empates', () => {
  for (const [fraccion, esperada] of [['1', '100000'], ['123456', '123456'],
    ['123456499', '123456'], ['123456500', '123457'], ['123456501', '123457'],
    ['123457499', '123457'], ['123457500', '123458'], ['123457501', '123458']]) {
    for (const segundo of ['2026-01-01T00:00:00', '1969-12-31T23:59:59']) {
      assert.equal(normalizarTimestampJdbc(`${segundo}.${fraccion}Z`), `${segundo}.${esperada}Z`);
    }
  }
});
test('acarreo JDBC conserva el instante al cruzar segundo, día, año y época Unix', () => {
  for (const [segundo, siguiente] of [['2026-01-01T00:00:00', '2026-01-01T00:00:01'],
    ['2026-01-01T23:59:59', '2026-01-02T00:00:00'],
    ['2026-12-31T23:59:59', '2027-01-01T00:00:00'],
    ['2028-02-29T23:59:59', '2028-03-01T00:00:00'],
    ['1969-12-31T23:59:59', '1970-01-01T00:00:00']]) {
    assert.equal(normalizarTimestampJdbc(`${segundo}.999999499Z`), `${segundo}.999999Z`);
    assert.equal(normalizarTimestampJdbc(`${segundo}.999999500Z`), `${siguiente}.000000Z`);
    assert.equal(normalizarTimestampJdbc(`${segundo}.999999501Z`), `${siguiente}.000000Z`);
  }
});
test('normalización rechaza fechas inválidas y acarreo fuera del rango ISO admitido', () => {
  for (const entrada of [null, '2026-02-30T00:00:00.123456500Z', '2026-01-01T00:00:00.1234565000Z',
    '2026-01-01T00:00:00.123456500+00:00', '9999-12-31T23:59:59.999999500Z']) {
    assert.throws(() => normalizarTimestampJdbc(entrada));
  }
});
test('consulta usa eventos originales y literal normalizado JDBC dentro de PG readonly', () => {
  const consulta = consultaEventos(validarEntrada(entorno()));
  assert(consulta.startsWith('BEGIN READ ONLY;'));
  assert(consulta.includes("reservada+interval '60 minutes'=expira"));
  assert(consulta.includes("'2026-10-16T13:23:28.398302Z'::timestamptz"));
  assert(!consulta.includes(entorno().AG016_CADUCIDAD_EXPIRA));
  assert(consulta.includes("tipo IN ('RESERVADA','CADUCADA')"));
  assert(!/\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/i.test(consulta));
});
test('evento RESERVADA único y TTL correcto permiten ESPERANDO sin inventar caducidad', () => {
  assert.deepEqual(clasificarEventos(esperando()), { resultado: 'ESPERANDO', reservadaEn: esperando().reservadaEn,
    caducadaEn: null, ttlCoherente: true, posterior: null, retrasoServidorMs: null });
});
test('evento CADUCADA válido conserva retraso servidor con fracción de milisegundo', () => {
  const salida = clasificarEventos(caducada());
  assert.equal(salida.resultado, 'CADUCADA'); assert.equal(salida.retrasoServidorMs, 498.422);
});
test('ausencia RESERVADA o duplicados no equivalen a espera', () => {
  for (const [reservas, caducidades] of [[0, 0], [2, 0], [1, 2], ['1', 0], [1, null]])
    assert.throws(() => clasificarEventos({ ...esperando(), reservas, caducidades }));
});
test('TTL ausente/falso, fechas inválidas y datos incoherentes de espera fallan', () => {
  for (const cambios of [{ ttlCoherente: false }, { ttlCoherente: null }, { reservadaEn: null },
    { reservadaEn: '2026-02-30T00:00:00.123456Z' }, { posterior: false }, { retrasoServidorMs: 0 }])
    assert.throws(() => clasificarEventos({ ...esperando(), ...cambios }));
});
test('caducidad anticipada o retraso ausente/manipulado falla incluso con flag posterior true', () => {
  for (const cambios of [{ caducadaEn: '2026-10-16T13:23:28.398301Z', retrasoServidorMs: 0 },
    { retrasoServidorMs: null }, { retrasoServidorMs: NaN }, { retrasoServidorMs: 0 }, { posterior: false }])
    assert.throws(() => clasificarEventos({ ...caducada(), ...cambios }));
});

function laboratorioFicticio(datos = esperando(), alterar) {
  const llamadas = [];
  const ids = { backend: 'b'.repeat(64), postgres: 'a'.repeat(64) };
  const laboratorio = { config: { proyecto: 'gestion-solicitudes-ag016' }, composeArgs: ['compose', 'contexto-ficticio'],
    docker(argumentos, opciones) {
      llamadas.push({ argumentos, opciones });
      assert.deepEqual(opciones.stdio, ['pipe', 'pipe', 'pipe']);
      assert(opciones.timeout > 0 && opciones.timeout <= 2000);
      if (argumentos.includes('ps')) return ids[argumentos.at(-1)];
      if (argumentos[0] === 'inspect') {
        const servicio = Object.keys(ids).find(s => ids[s] === argumentos.at(-1));
        const identidad = { id: ids[servicio], servicio, proyecto: 'gestion-solicitudes-ag016', estado: 'running',
          iniciadoEn: '2026-10-16T12:00:00.123456789Z' };
        alterar?.(identidad, llamadas);
        return JSON.stringify(identidad);
      }
      assert.equal(argumentos[0], 'exec'); assert.equal(argumentos[2], ids.postgres);
      assert(opciones.input.startsWith('BEGIN READ ONLY;'));
      return JSON.stringify(datos);
    } };
  return { laboratorio, llamadas };
}
test('flujo completo valida ambas identidades antes/después y devuelve contrato cerrado', () => {
  for (const datos of [esperando(), caducada()]) {
    const f = laboratorioFicticio(datos);
    const salida = observarConContexto(validarEntrada(entorno()), f.laboratorio);
    assert.equal(salida.resultado, datos.caducidades ? 'CADUCADA' : 'ESPERANDO');
    assert.equal(salida.version, 'AG016-observador-1');
    assert.deepEqual(salida.identidad, { postgres: 'a'.repeat(64), backend: 'b'.repeat(64) });
    assert.equal(f.llamadas.filter(l => l.argumentos[0] === 'exec').length, 1);
    assert.equal(f.llamadas.filter(l => l.argumentos[0] === 'inspect').length, 4);
    assert.equal(Object.keys(salida).length, 13);
  }
});
test('flujo conserva expiraEn original y consulta su representación JDBC incluso en empate', () => {
  const original = '2026-10-16T13:23:28.123456500Z';
  const entrada = validarEntrada({ ...entorno(), AG016_CADUCIDAD_EXPIRA: original });
  const f = laboratorioFicticio({ ...esperando(), reservadaEn: '2026-10-16T12:23:28.123457Z' });
  const salida = observarConContexto(entrada, f.laboratorio);
  assert.equal(salida.resultado, 'ESPERANDO');
  assert.equal(salida.expiraEn, original);
  const sql = f.llamadas.find(l => l.argumentos[0] === 'exec').opciones.input;
  assert(sql.includes("'2026-10-16T13:23:28.123457Z'::timestamptz"));
  assert(!sql.includes(original));
});
test('servicio detenido/proyecto ajeno impide consultar SQL', () => {
  for (const alterar of [i => { i.estado = 'exited'; }, i => { i.proyecto = 'ajeno'; }, i => { i.id = 'f'.repeat(64); }]) {
    const f = laboratorioFicticio(esperando(), alterar);
    assert.equal(observarConContexto(validarEntrada(entorno()), f.laboratorio).resultado, 'FAIL');
    assert(!f.llamadas.some(l => l.argumentos[0] === 'exec'));
  }
});
test('reinicio durante observación invalida datos aunque el SQL diga CADUCADA', () => {
  const f = laboratorioFicticio(caducada(), (i, llamadas) => {
    if (llamadas.some(l => l.argumentos[0] === 'exec')) i.iniciadoEn = '2026-10-16T13:00:00.123456789Z';
  });
  assert.equal(observarConContexto(validarEntrada(entorno()), f.laboratorio).resultado, 'FAIL');
});
test('errores crudos o entradas rechazadas nunca se serializan como evidencia pública', () => {
  const marcador = 'FICTICIO_SENSIBLE_NO_PUBLICABLE';
  const f = laboratorioFicticio(); f.laboratorio.docker = () => { throw Error(marcador); };
  const salida = observarConContexto(validarEntrada(entorno()), f.laboratorio);
  assert.equal(salida.resultado, 'FAIL'); assert(!JSON.stringify(salida).includes(marcador));
  const invalida = observarConContexto({ espacio: marcador }, f.laboratorio);
  assert.equal(invalida.espacio, null); assert(!JSON.stringify(invalida).includes(marcador));
});
