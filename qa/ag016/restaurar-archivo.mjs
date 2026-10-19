import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createDecipheriv, createHash } from 'node:crypto';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// DO-06: recuperación separada de un archivo ya persistido. Importar este módulo
// no carga laboratorio.mjs, no lee secretos y no accede a Docker.
export const DESTINO_QA = 'ag016_restore_qa';
export const MAX_DUMP_BYTES = 64 * 1024 * 1024;
const CABECERA = Buffer.from('AG016BACKUP1', 'ascii');
const IV_BYTES = 12, TAG_BYTES = 16;
const SOBRE_BYTES = CABECERA.length + IV_BYTES + TAG_BYTES;
const FUENTES = ['ag016_demo_01', 'ag016_demo_02', 'ag016_demo_03'];
const ROLES_SIN_CONNECT = ['ag016_app_01', 'ag016_app_02', 'ag016_app_03', 'ag016_control_app', 'gestion_app'];
export const TABLAS_NEGOCIO = Object.freeze(['conceptos_solicitud', 'decisiones_solicitud', 'eventos_historial',
  'flyway_schema_history', 'operaciones_idempotentes_solicitud', 'proveedores', 'roles', 'solicitudes', 'usuarios', 'usuarios_roles']);
const TABLAS_FUENTE = [...TABLAS_NEGOCIO, 'sesiones_acceso', 'tokens_refresco'].sort();
const TABLAS_CONTROL = ['espacios', 'eventos', 'flyway_schema_history'];
const sha256 = datos => createHash('sha256').update(datos).digest('hex');
const objeto = valor => valor !== null && typeof valor === 'object' && !Array.isArray(valor);

class ErrorRestauracion extends Error {
  constructor(codigo) { super(codigo); this.name = 'ErrorRestauracion'; this.codigo = codigo; }
}
function exigir(condicion, codigo) { if (!condicion) throw new ErrorRestauracion(codigo); }
function identificador(valor) { return typeof valor === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(valor); }

/** Las dos ejecuciones identifican rutas cerradas distintas; el destino SQL es fijo. */
export function rutasRestauracion(raiz, entorno) {
  const copia = entorno.AG016_COPIA_EJECUCION, ejecucion = entorno.AG016_EJECUCION;
  exigir(identificador(copia) && identificador(ejecucion), 'IDENTIFICADOR_INVALIDO');
  exigir(copia !== ejecucion, 'EJECUCIONES_DEBEN_SER_DISTINTAS');
  exigir(!entorno.AG016_BASE_QA || entorno.AG016_BASE_QA === DESTINO_QA, 'DESTINO_QA_NO_AUTORIZADO');
  return { copia, ejecucion, cifrado: resolve(raiz, 'tmp/ag016/copias', `${copia}.enc`),
    metadatos: resolve(raiz, 'qa/evidencias/ag016', copia, 'restore.json'),
    directorio: resolve(raiz, 'qa/evidencias/ag016', ejecucion),
    evidencia: resolve(raiz, 'qa/evidencias/ag016', ejecucion, 'restauracion-archivo.json') };
}

function agregadoValido(valor) {
  return typeof valor === 'string' && /^(0|[1-9]\d*)\|[a-f0-9]{32}$/.test(valor)
    && Number.isSafeInteger(Number(valor.split('|')[0]));
}

/** Proyección validada de restore.json; los valores adicionales nunca se reproducen. */
export function validarMetadatos(valor) {
  exigir(objeto(valor) && valor.estado === 'PASS' && FUENTES.includes(valor.base), 'METADATOS_ORIGEN_INVALIDOS');
  exigir(Number.isSafeInteger(valor.bytesDump) && valor.bytesDump >= 5 && valor.bytesDump <= MAX_DUMP_BYTES
    && valor.bytesCifrado === valor.bytesDump + SOBRE_BYTES, 'METADATOS_TAMANO_INVALIDO');
  exigir(typeof valor.sha256Cifrado === 'string' && /^[a-f0-9]{64}$/.test(valor.sha256Cifrado), 'METADATOS_HASH_INVALIDO');
  exigir(Array.isArray(valor.tablas) && valor.tablas.length === TABLAS_NEGOCIO.length
    && valor.tablas.every(t => objeto(t) && TABLAS_NEGOCIO.includes(t.tabla) && agregadoValido(t.datos))
    && new Set(valor.tablas.map(t => t.tabla)).size === TABLAS_NEGOCIO.length, 'METADATOS_SNAPSHOT_INVALIDO');
  return { base: valor.base, bytesDump: valor.bytesDump, bytesCifrado: valor.bytesCifrado,
    sha256Cifrado: valor.sha256Cifrado,
    tablas: TABLAS_NEGOCIO.map(tabla => ({ tabla, datos: valor.tablas.find(t => t.tabla === tabla).datos })) };
}

/** Autentica todo el sobre antes de devolver plaintext; nunca lo escribe ni lo registra. */
export function descifrarArchivo(cifrado, clave, metadatos) {
  const meta = validarMetadatos(metadatos);
  exigir(Buffer.isBuffer(cifrado) && cifrado.length >= SOBRE_BYTES + 5
    && cifrado.length <= MAX_DUMP_BYTES + SOBRE_BYTES && cifrado.length === meta.bytesCifrado, 'CIFRADO_TAMANO_INVALIDO');
  exigir(cifrado.subarray(0, CABECERA.length).equals(CABECERA), 'CIFRADO_CABECERA_INVALIDA');
  exigir(sha256(cifrado) === meta.sha256Cifrado, 'CIFRADO_HASH_NO_COINCIDE');
  exigir(Buffer.isBuffer(clave) && clave.length === 32, 'CLAVE_TAMANO_INVALIDO');
  const iv = cifrado.subarray(CABECERA.length, CABECERA.length + IV_BYTES);
  const tag = cifrado.subarray(CABECERA.length + IV_BYTES, SOBRE_BYTES);
  let parcial, final, plaintext;
  try {
    const descifrador = createDecipheriv('aes-256-gcm', clave, iv);
    descifrador.setAuthTag(tag);
    parcial = descifrador.update(cifrado.subarray(SOBRE_BYTES));
    final = descifrador.final();
    plaintext = Buffer.concat([parcial, final]);
  } catch {
    throw new ErrorRestauracion('CIFRADO_AUTENTICACION_FALLIDA');
  } finally { parcial?.fill(0); final?.fill(0); }
  if (plaintext.length !== meta.bytesDump || !plaintext.subarray(0, 5).equals(Buffer.from('PGDMP'))) {
    plaintext.fill(0); throw new ErrorRestauracion('DUMP_FORMATO_INVALIDO');
  }
  return plaintext;
}

function dentroDelWorkspace(raiz, archivo) {
  const esperado = resolve(realpathSync(raiz), relative(raiz, archivo));
  exigir(realpathSync(archivo) === esperado, 'RUTA_REDIRIGIDA_NO_AUTORIZADA');
}
function leerLimitado(archivo, maximo, raiz) {
  if (raiz) dentroDelWorkspace(raiz, archivo);
  const stat = lstatSync(archivo);
  exigir(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= maximo, 'ARCHIVO_TAMANO_O_TIPO_INVALIDO');
  const contenido = readFileSync(archivo);
  exigir(contenido.length === stat.size && contenido.length <= maximo, 'ARCHIVO_CAMBIO_DURANTE_LECTURA');
  return contenido;
}

/** Frontera única de psql/pg_restore: captura las salidas y descarta errores crudos. */
export function ejecutarPostgresCapturado(ejecutar, argumentos, opciones = {}) {
  try {
    return ejecutar('postgres', argumentos, { ...opciones, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch {
    // No conservar cause/stdout/stderr: pueden incluir filas o el buffer de entrada.
    throw new ErrorRestauracion('HERRAMIENTA_POSTGRES_FALLO');
  }
}

// Capturar también stderr de psql: un fallo de restricción/trigger durante la
// invalidación podría incluir una fila copiada.
function consultaCapturada(ejecutar, base, consulta) {
  exigir([...FUENTES, DESTINO_QA, 'ag016_control', 'postgres'].includes(base), 'CONSULTA_FUERA_DE_INVENTARIO');
  return ejecutarPostgresCapturado(ejecutar, ['psql', '--no-psqlrc', '-U', 'ag016_provision', '-d', base,
    '-v', 'ON_ERROR_STOP=1', '-tA'], { input: consulta }).trim();
}

// Todos los identificadores interpolados proceden exclusivamente de listas fijas.
function snapshot(sql, base, esquema, tablas) {
  exigir([...FUENTES, DESTINO_QA, 'ag016_control'].includes(base)
    && ['gestion', 'demo'].includes(esquema), 'SNAPSHOT_FUERA_DE_INVENTARIO');
  const permitidas = esquema === 'demo' ? TABLAS_CONTROL : TABLAS_FUENTE;
  exigir(tablas.every(t => permitidas.includes(t)), 'TABLA_FUERA_DE_INVENTARIO');
  const consulta = tablas.map(tabla => `SELECT '${tabla}'||'|'||count(*)||'|'||md5(coalesce(string_agg(row_to_json(t)::text,E'\\n' ORDER BY row_to_json(t)::text),'')) FROM ${esquema}.${tabla} t`).join('\nUNION ALL\n') + '\nORDER BY 1;';
  const filas = sql(base, consulta).split('\n').map(linea => {
    const [tabla, cantidad, hash, ...sobrantes] = linea.split('|');
    exigir(tablas.includes(tabla) && sobrantes.length === 0 && agregadoValido(`${cantidad}|${hash}`), 'SNAPSHOT_RESPUESTA_INVALIDA');
    return { tabla, datos: `${cantidad}|${hash}` };
  });
  exigir(filas.length === tablas.length && new Set(filas.map(f => f.tabla)).size === tablas.length, 'SNAPSHOT_INCOMPLETO');
  return [...tablas].sort().map(tabla => filas.find(f => f.tabla === tabla));
}

function permisosQA(sql) {
  const publico = sql('postgres', `SELECT count(*) FROM pg_database d CROSS JOIN LATERAL aclexplode(coalesce(d.datacl,acldefault('d',d.datdba))) a WHERE d.datname='${DESTINO_QA}' AND a.grantee=0 AND a.privilege_type='CONNECT';`);
  exigir(publico === '0', 'CONNECT_PUBLIC_NO_REVOCADO');
  const lineas = sql('postgres', `SELECT rolname||'|'||has_database_privilege(rolname,'${DESTINO_QA}','CONNECT') FROM pg_roles WHERE rolname IN (${ROLES_SIN_CONNECT.map(r => `'${r}'`).join(',')}) ORDER BY rolname;`).split('\n');
  exigir(JSON.stringify(lineas) === JSON.stringify(ROLES_SIN_CONNECT.map(r => `${r}|false`)), 'CONNECT_RUNTIME_NO_REVOCADO');
  const registrada = sql('ag016_control', `SELECT count(*) FROM demo.espacios WHERE id='${DESTINO_QA}';`);
  exigir(registrada === '0', 'QA_PRESENTE_EN_REGISTRO_RUNTIME');
  return { connectPublic: false, roles: ROLES_SIN_CONNECT.map(rol => ({ rol, connect: false })), registradaEnRuntime: false,
    alcance: 'ACL PostgreSQL y registro; no sustituye una conexión efectiva como cada rol.' };
}

/** Solo el coordinador ejecuta este flujo fuera de las cuatro ventanas de carga. */
async function ejecutarRestauracion() {
  const inicio = new Date().toISOString(), reloj = performance.now();
  const resultado = { tipo: 'RESTAURACION_DESDE_ARCHIVO_PERSISTIDO', inicio, fin: null, estado: 'FAIL',
    etapa: 'contexto', destino: DESTINO_QA, mediciones: {}, controles: {},
    limite: 'Sin copia nueva, sin plaintext en disco/log, sin limpieza al fallar. Fuente actual se coteja consigo misma; QA con el snapshot guardado. RPO/RTO no contractuales.' };
  let rutas, raiz, directorioCreado = false, plaintext, clave;
  try {
    const laboratorio = await import('./laboratorio.mjs');
    ({ raiz } = laboratorio);
    const { config, ejecutar, exigirSinCarga, identidad } = laboratorio;
    const sql = (base, consulta) => consultaCapturada(ejecutar, base, consulta);
    exigirSinCarga();
    rutas = rutasRestauracion(raiz, process.env);
    dentroDelWorkspace(raiz, resolve(raiz, 'qa/evidencias/ag016'));
    exigir(!existsSync(rutas.directorio), 'EVIDENCIA_DEBE_SER_NUEVA');
    mkdirSync(rutas.directorio);
    directorioCreado = true;
    resultado.copiaEjecucion = rutas.copia; resultado.ejecucion = rutas.ejecucion;
    resultado.contexto = { proyecto: config.proyecto, compose: 'infraestructura/demo/compose.yaml', postgres: identidad('postgres') };

    resultado.etapa = 'autenticar-archivo';
    const tAutenticar = performance.now();
    const metadatosBytes = leerLimitado(rutas.metadatos, 64 * 1024, raiz);
    let metadatos;
    try { metadatos = validarMetadatos(JSON.parse(metadatosBytes.toString('utf8'))); }
    catch (error) { throw error instanceof ErrorRestauracion ? error : new ErrorRestauracion('METADATOS_JSON_INVALIDO'); }
    const cifrado = leerLimitado(rutas.cifrado, MAX_DUMP_BYTES + SOBRE_BYTES, raiz);
    clave = leerLimitado(resolve(config.env.AG016_SECRETOS_DIR, 'copia.secret'), 32);
    try { plaintext = descifrarArchivo(cifrado, clave, { ...metadatos, estado: 'PASS' }); }
    finally { clave.fill(0); clave = null; }
    resultado.mediciones.autenticarArchivoMs = performance.now() - tAutenticar;
    resultado.base = metadatos.base;
    resultado.archivo = { ruta: relative(raiz, rutas.cifrado).replaceAll('\\', '/'), bytesCifrado: cifrado.length,
      bytesDump: plaintext.length, sha256Cifrado: sha256(cifrado), sha256Metadatos: sha256(metadatosBytes), algoritmo: 'AES-256-GCM' };
    resultado.controles.archivoAutenticadoAntesDeCrearQA = true;

    resultado.etapa = 'precondiciones-base';
    exigirSinCarga();
    exigir(sql('postgres', `SELECT count(*) FROM pg_database WHERE datname='${DESTINO_QA}';`) === '0', 'QA_DEBE_SER_NUEVA');
    exigir(sql('postgres', `SELECT count(*) FROM pg_database WHERE datname='${metadatos.base}';`) === '1', 'FUENTE_ACTUAL_NO_EXISTE');
    const fuenteAntes = snapshot(sql, metadatos.base, 'gestion', TABLAS_FUENTE);
    const controlAntes = snapshot(sql, 'ag016_control', 'demo', TABLAS_CONTROL);
    resultado.controles.qaAusenteAntes = true;

    resultado.etapa = 'crear-qa-sin-connect';
    const tRestore = performance.now();
    // Primero sin conexiones: no existe una ventana de CONNECT público tras CREATE.
    sql('postgres', `CREATE DATABASE ${DESTINO_QA} WITH OWNER gestion_migracion TEMPLATE template0 ALLOW_CONNECTIONS false;`);
    resultado.controles.qaCreada = true;
    sql('postgres', `REVOKE ALL ON DATABASE ${DESTINO_QA} FROM PUBLIC, ${ROLES_SIN_CONNECT.join(', ')};`);
    resultado.permisosAntes = permisosQA(sql);
    sql('postgres', `ALTER DATABASE ${DESTINO_QA} ALLOW_CONNECTIONS true;`);

    resultado.etapa = 'restaurar';
    ejecutarPostgresCapturado(ejecutar, ['pg_restore', '-U', 'ag016_provision', '-d', DESTINO_QA,
      '--role=gestion_migracion', '--exit-on-error', '--single-transaction'],
    { input: plaintext, encoding: null, maxBuffer: 4 * 1024 * 1024 });
    plaintext.fill(0); plaintext = null;
    resultado.etapa = 'invalidar-credenciales-qa';
    sql(DESTINO_QA, "BEGIN; UPDATE gestion.sesiones_acceso SET revocado_en=clock_timestamp(),motivo_revocacion='CIERRE' WHERE revocado_en IS NULL; UPDATE gestion.tokens_refresco SET estado='REVOCADO',revocado_en=clock_timestamp(),motivo_revocacion='CIERRE' WHERE revocado_en IS NULL; COMMIT;");
    resultado.mediciones.restaurarEInvalidarMs = performance.now() - tRestore;

    resultado.etapa = 'cotejar';
    const qa = snapshot(sql, DESTINO_QA, 'gestion', TABLAS_NEGOCIO);
    const fuenteDespues = snapshot(sql, metadatos.base, 'gestion', TABLAS_FUENTE);
    const controlDespues = snapshot(sql, 'ag016_control', 'demo', TABLAS_CONTROL);
    resultado.controles.snapshotRestauradoCoincide = JSON.stringify(qa) === JSON.stringify(metadatos.tablas);
    resultado.controles.fuenteActualIntacta = JSON.stringify(fuenteAntes) === JSON.stringify(fuenteDespues);
    resultado.controles.controlIntacto = JSON.stringify(controlAntes) === JSON.stringify(controlDespues);
    resultado.tablasSnapshot = qa;
    resultado.huellaFuenteActual = { antes: sha256(JSON.stringify(fuenteAntes)), despues: sha256(JSON.stringify(fuenteDespues)) };
    resultado.huellaControl = { antes: sha256(JSON.stringify(controlAntes)), despues: sha256(JSON.stringify(controlDespues)) };
    exigir(resultado.controles.snapshotRestauradoCoincide, 'SNAPSHOT_RESTAURADO_NO_COINCIDE');
    exigir(resultado.controles.fuenteActualIntacta, 'FUENTE_CAMBIO_DURANTE_RESTAURACION');
    exigir(resultado.controles.controlIntacto, 'CONTROL_CAMBIO_DURANTE_RESTAURACION');
    const vivas = sql(DESTINO_QA, "SELECT (SELECT count(*) FROM gestion.sesiones_acceso WHERE revocado_en IS NULL)||'|'||(SELECT count(*) FROM gestion.tokens_refresco WHERE estado='ACTIVO');");
    exigir(/^\d+\|\d+$/.test(vivas), 'COTEJO_SESIONES_RESPUESTA_INVALIDA');
    resultado.sesionesVivasQA = vivas;
    exigir(vivas === '0|0', 'CREDENCIALES_COPIADAS_SIGUEN_ACTIVAS');
    resultado.permisosDespues = permisosQA(sql);
    exigir(sha256(leerLimitado(rutas.cifrado, MAX_DUMP_BYTES + SOBRE_BYTES, raiz)) === resultado.archivo.sha256Cifrado
      && sha256(leerLimitado(rutas.metadatos, 64 * 1024, raiz)) === resultado.archivo.sha256Metadatos, 'ARCHIVO_O_METADATA_CAMBIO');
    resultado.controles.copiaYMetadataIntactas = true;
    const final = identidad('postgres');
    exigir(final.id === resultado.contexto.postgres.id && final.iniciadoEn === resultado.contexto.postgres.iniciadoEn, 'POSTGRES_CAMBIO_DURANTE_RESTAURACION');
    resultado.estado = 'PASS'; resultado.etapa = 'completado';
  } catch (error) {
    // Error de herramientas puede contener SQL/salida/dump: jamás serializarlo.
    resultado.codigo = error instanceof ErrorRestauracion ? error.codigo : 'FALLO_DE_CONTEXTO_LECTURA_O_HERRAMIENTA';
  } finally {
    plaintext?.fill(0); clave?.fill(0);
    resultado.fin = new Date().toISOString(); resultado.mediciones.totalMs = performance.now() - reloj;
    if (directorioCreado) {
      try { writeFileSync(rutas.evidencia, JSON.stringify(resultado, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
      catch { resultado.estado = 'FAIL'; resultado.codigo = 'NO_SE_PUDO_GUARDAR_EVIDENCIA'; }
    }
  }
  console.log(JSON.stringify({ estado: resultado.estado, etapa: resultado.etapa, codigo: resultado.codigo ?? null,
    evidencia: directorioCreado && existsSync(rutas.evidencia) ? relative(raiz, rutas.evidencia).replaceAll('\\', '/') : null }));
  process.exitCode = resultado.estado === 'PASS' ? 0 : 1;
}

// Después de las ventanas: contexto Compose completo + AG016_COPIA_EJECUCION
// existente y AG016_EJECUCION nueva. AG016_BASE_QA ausente o ag016_restore_qa.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await ejecutarRestauracion();
}
