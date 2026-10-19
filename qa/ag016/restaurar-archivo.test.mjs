import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { DESTINO_QA, MAX_DUMP_BYTES, TABLAS_NEGOCIO, descifrarArchivo, rutasRestauracion, validarMetadatos } from './restaurar-archivo.mjs';

// SOLO fixtures sintéticos en memoria. Importar no carga laboratorio ni Docker.
// Pendientes de ejecución por el coordinador después de las cuatro ventanas.
const sha256 = b => createHash('sha256').update(b).digest('hex');
const errorCodigo = codigo => error => error.codigo === codigo;
function fixture(dump = Buffer.from('PGDMPcontenido-ficticio-no-es-un-dump-real')) {
  const clave = Buffer.alloc(32, 17), iv = Buffer.alloc(12, 23);
  const cipher = createCipheriv('aes-256-gcm', clave, iv);
  const cuerpo = Buffer.concat([cipher.update(dump), cipher.final()]);
  const cifrado = Buffer.concat([Buffer.from('AG016BACKUP1'), iv, cipher.getAuthTag(), cuerpo]);
  const meta = { estado: 'PASS', base: 'ag016_demo_01', bytesDump: dump.length, bytesCifrado: cifrado.length,
    sha256Cifrado: sha256(cifrado), tablas: TABLAS_NEGOCIO.map(tabla => ({ tabla, datos: `0|${'a'.repeat(32)}` })) };
  return { clave, cifrado, meta, dump };
}
test('sobre persistido válido se autentica y devuelve únicamente el plaintext en memoria', () => {
  const f = fixture(); const claro = descifrarArchivo(f.cifrado, f.clave, f.meta);
  assert.deepEqual(claro, f.dump); claro.fill(0);
  assert.equal(f.cifrado.length - f.dump.length, 40);
});
test('cabecera, tamaño y truncamiento se rechazan', () => {
  const f = fixture(); const rota = Buffer.from(f.cifrado); rota[0] ^= 1;
  assert.throws(() => descifrarArchivo(rota, f.clave, f.meta), errorCodigo('CIFRADO_CABECERA_INVALIDA'));
  assert.throws(() => descifrarArchivo(f.cifrado.subarray(0, -1), f.clave, f.meta), errorCodigo('CIFRADO_TAMANO_INVALIDO'));
  assert.throws(() => descifrarArchivo(Buffer.alloc(39), f.clave, f.meta), errorCodigo('CIFRADO_TAMANO_INVALIDO'));
});
test('hash de evidencia distinto impide descifrar', () => {
  const f = fixture(); f.meta.sha256Cifrado = '0'.repeat(64);
  assert.throws(() => descifrarArchivo(f.cifrado, f.clave, f.meta), errorCodigo('CIFRADO_HASH_NO_COINCIDE'));
});
test('tamper de IV, tag o ciphertext no se acepta aunque se actualice el SHA público', () => {
  for (const offset of [12, 24, 40]) {
    const f = fixture(); f.cifrado[offset] ^= 1; f.meta.sha256Cifrado = sha256(f.cifrado);
    assert.throws(() => descifrarArchivo(f.cifrado, f.clave, f.meta), errorCodigo('CIFRADO_AUTENTICACION_FALLIDA'));
  }
});
test('clave incorrecta o de longitud ajena no produce plaintext', () => {
  const f = fixture();
  assert.throws(() => descifrarArchivo(f.cifrado, Buffer.alloc(32, 18), f.meta), errorCodigo('CIFRADO_AUTENTICACION_FALLIDA'));
  assert.throws(() => descifrarArchivo(f.cifrado, Buffer.alloc(31), f.meta), errorCodigo('CLAVE_TAMANO_INVALIDO'));
});
test('payload autenticado que no es formato custom de PostgreSQL se rechaza', () => {
  const f = fixture(Buffer.from('texto-ficticio-ajeno'));
  assert.throws(() => descifrarArchivo(f.cifrado, f.clave, f.meta), errorCodigo('DUMP_FORMATO_INVALIDO'));
});
test('metadata solo admite fuente inventariada, PASS y límites explícitos', () => {
  for (const base of ['postgres', DESTINO_QA, 'ag016_demo_04', "ag016_demo_01';DROP DATABASE postgres;--"]) {
    const f = fixture(); f.meta.base = base;
    assert.throws(() => validarMetadatos(f.meta), errorCodigo('METADATOS_ORIGEN_INVALIDOS'));
  }
  const f = fixture(); f.meta.estado = 'FAIL';
  assert.throws(() => validarMetadatos(f.meta), errorCodigo('METADATOS_ORIGEN_INVALIDOS'));
  for (const bytesDump of [0, '12', MAX_DUMP_BYTES + 1, Number.NaN]) {
    const g = fixture(); g.meta.bytesDump = bytesDump;
    assert.throws(() => validarMetadatos(g.meta), errorCodigo('METADATOS_TAMANO_INVALIDO'));
  }
});
test('snapshot incompleto, duplicado, con tabla extra o agregados inválidos se rechaza', () => {
  for (const alterar of [m => m.tablas.pop(), m => { m.tablas[0] = m.tablas[1]; },
    m => { m.tablas[0].tabla = 'sesiones_acceso'; }, m => { m.tablas[0].datos = '1|sin-hash'; },
    m => { m.tablas[0].datos = `9007199254740992|${'a'.repeat(32)}`; }]) {
    const f = fixture(); alterar(f.meta);
    assert.throws(() => validarMetadatos(f.meta), errorCodigo('METADATOS_SNAPSHOT_INVALIDO'));
  }
});
test('metadata se canoniza sin reproducir campos adicionales', () => {
  const f = fixture(); f.meta.tablas.reverse(); f.meta.datoAjeno = 'ficticio-no-publicable';
  const meta = validarMetadatos(f.meta);
  assert.deepEqual(meta.tablas.map(t => t.tabla), TABLAS_NEGOCIO);
  assert(!JSON.stringify(meta).includes('ficticio-no-publicable'));
});
test('rutas usan solo identificadores cerrados y evidencia nueva distinta', () => {
  const raiz = resolve('workspace-ficticio');
  const env = { AG016_COPIA_EJECUCION: 'carga-a1', AG016_EJECUCION: 'restore-archivo-01' };
  const r = rutasRestauracion(raiz, env);
  assert.equal(r.cifrado, resolve(raiz, 'tmp/ag016/copias/carga-a1.enc'));
  assert.equal(r.metadatos, resolve(raiz, 'qa/evidencias/ag016/carga-a1/restore.json'));
  assert.equal(r.evidencia, resolve(raiz, 'qa/evidencias/ag016/restore-archivo-01/restauracion-archivo.json'));
  assert.throws(() => rutasRestauracion(raiz, { ...env, AG016_EJECUCION: 'carga-a1' }), errorCodigo('EJECUCIONES_DEBEN_SER_DISTINTAS'));
  assert.throws(() => rutasRestauracion(raiz, { ...env, AG016_BASE_QA: 'ag016_demo_01' }), errorCodigo('DESTINO_QA_NO_AUTORIZADO'));
});
test('rutas no admiten traversal, rutas absolutas, separadores ni valores ausentes', () => {
  for (const valor of [undefined, '', '../carga-a1', '..\\carga-a1', '/tmp/copia', 'C:\\copia', 'carga_a1', 'A1', 'a'.repeat(81)]) {
    assert.throws(() => rutasRestauracion(resolve('workspace-ficticio'),
      { AG016_COPIA_EJECUCION: valor, AG016_EJECUCION: 'restore-archivo-01' }), errorCodigo('IDENTIFICADOR_INVALIDO'));
  }
});
test('la frontera real del helper no emite ni serializa salida sensible de un subproceso fallido', () => {
  const marcador = 'MARCADOR_FICTICIO_SENSIBLE_DO06';
  const modulo = new URL('./restaurar-archivo.mjs', import.meta.url).href;
  // El ejecutor inyectado reemplaza Docker por un hijo Node que falla. La captura
  // y sanitización sí pasan por la función usada por psql y pg_restore del helper.
  // Un proceso exterior permite observar stdout/stderr reales sin parchear consola.
  const programa = `
    import { execFileSync } from 'node:child_process';
    import { ejecutarPostgresCapturado } from ${JSON.stringify(modulo)};
    const hijo = ${JSON.stringify(`process.stdout.write('${marcador}'); process.stderr.write('${marcador}'); process.exit(1);`)};
    let stdoutConteniaMarcador = false, stderrConteniaMarcador = false;
    const ejecutar = (_servicio, _argumentos, opciones) => {
      try { return execFileSync(process.execPath, ['-e', hijo],
        { encoding: 'utf8', windowsHide: true, timeout: 5000, ...opciones }); }
      catch (error) {
        stdoutConteniaMarcador = String(error.stdout).includes(${JSON.stringify(marcador)});
        stderrConteniaMarcador = String(error.stderr).includes(${JSON.stringify(marcador)});
        throw error;
      }
    };
    try {
      ejecutarPostgresCapturado(ejecutar, ['pg_restore'], { input: Buffer.from('entrada-ficticia') });
      process.exitCode = 2;
    } catch (error) {
      console.log(JSON.stringify({ codigo: error.codigo, stdoutConteniaMarcador, stderrConteniaMarcador,
        serializado: JSON.stringify(error, Object.getOwnPropertyNames(error)) }));
    }
  `;
  const observado = spawnSync(process.execPath, ['--input-type=module', '-e', programa],
    { encoding: 'utf8', windowsHide: true, timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] });
  assert.equal(observado.status, 0);
  assert.equal(observado.stderr, '');
  assert(!observado.stdout.includes(marcador));
  const error = JSON.parse(observado.stdout.trim());
  assert.equal(error.codigo, 'HERRAMIENTA_POSTGRES_FALLO');
  assert.equal(error.stdoutConteniaMarcador, true);
  assert.equal(error.stderrConteniaMarcador, true);
  assert(!error.serializado.includes(marcador));
  assert(!error.serializado.includes('entrada-ficticia'));
});
