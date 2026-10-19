import { execFile, execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { raizProyecto, rutaDelProyecto } from './rutas-evidencia.mjs';

const ejecutarProceso = promisify(execFile);
const servicios = new Set(['postgres', 'backend', 'frontend']);

/** Contexto obligatorio: no existe fallback al proyecto histórico ni a un .env de ejemplo. */
export function argumentosCompose() {
  const requerido = (nombre) => {
    const valor = process.env[nombre];
    if (!valor?.trim()) throw new Error(`QA Docker exige ${nombre} explícito.`);
    return valor;
  };
  const proyecto = requerido('COMPOSE_PROJECT_NAME');
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(proyecto) || proyecto === 'gestion-solicitudes-001')
    throw new Error('Proyecto QA inválido o histórico protegido.');
  const archivo = (nombre) => {
    const ruta = rutaDelProyecto(requerido(nombre));
    if (!existsSync(ruta) || !statSync(ruta).isFile())
      throw new Error(`Archivo obligatorio ${nombre} ausente.`);
    return ruta;
  };
  const compose = archivo('COMPOSE_FILE');
  const entorno = archivo('QA_ENTORNO');
  const complemento = archivo('QA_COMPOSE_OVERRIDE');
  if (compose === complemento) throw new Error('El override QA debe ser un archivo independiente.');
  if (proyecto.includes('ag016')) {
    const relativa = (ruta) => relative(raizProyecto, ruta).replaceAll('\\', '/');
    if (proyecto !== 'gestion-solicitudes-ag016-regresion'
      || relativa(compose) !== 'infraestructura/compose.yaml'
      || relativa(entorno) !== 'tmp/ag016/regresion.env'
      || relativa(complemento) !== 'qa/ag016/compose-regresion.yaml')
      throw new Error('El contexto AG-016 no coincide con el laboratorio de regresión autorizado.');
  }
  return ['compose', '--project-name', proyecto, '--env-file', entorno, '-f', compose, '-f', complemento];
}

/**
 * Sustituto acotado de promisify(execFile) para los scripts Compose existentes.
 * Valida cada contenedor inmediatamente antes de operar y usa su ID completo.
 * Las consultas/credenciales y stderr del proceso nunca se adjuntan a errores públicos.
 */
export async function ejecutarDocker(comando, argumentos, opciones = {}) {
  const compose = argumentosCompose();
  if (comando !== 'docker' || opciones.shell || argumentos.length <= compose.length
    || compose.some((valor, indice) => argumentos[indice] !== valor))
    throw new Error('Invocación Docker fuera del contexto QA explícito.');
  const operacion = argumentos.slice(compose.length);
  const accion = operacion[0];
  if (!['exec', 'start', 'stop', 'restart', 'logs', 'config'].includes(accion))
    throw new Error('Operación Docker no autorizada por este helper QA.');
  const configuracion = { ...opciones, cwd: raizProyecto, windowsHide: true, shell: false };
  const ejecutar = async (args, opcionesProceso = configuracion) => {
    try { return await ejecutarProceso('docker', args, opcionesProceso); }
    catch {
      // execFile incluye el comando completo en el error; puede contener SQL o datos de fixture.
      throw new Error(`Docker QA no completó la operación ${accion}; salida sensible omitida.`);
    }
  };
  const comprobar = async (servicio) => {
    if (!servicios.has(servicio)) throw new Error('Servicio QA no autorizado.');
    const lectura = { ...configuracion, encoding: 'utf8', timeout: 15000, maxBuffer: 65536 };
    const encontrados = (await ejecutar([...compose, 'ps', '--all', '--quiet', servicio], lectura)).stdout.trim().split(/\s+/);
    if (encontrados.length !== 1 || !/^[0-9a-f]{64}$/.test(encontrados[0]))
      throw new Error('QA requiere un único contenedor existente por servicio.');
    const id = encontrados[0];
    const formato = '{{.Id}}|{{index .Config.Labels "com.docker.compose.project"}}|{{index .Config.Labels "com.docker.compose.service"}}';
    const identidad = (await ejecutar(['inspect', '--format', formato, id], lectura)).stdout.trim();
    if (identidad !== `${id}|${compose[2]}|${servicio}`)
      throw new Error('ID, proyecto o servicio Docker no coinciden; operación detenida.');
    return id;
  };
  if (accion === 'config') {
    if (operacion.length !== 2 || operacion[1] !== '--quiet')
      throw new Error('QA config solo admite --quiet, sin volcar configuración.');
    return ejecutar(argumentos);
  }
  if (accion === 'exec') {
    if (operacion[1] !== '-T' || operacion.length < 4)
      throw new Error('QA solo admite exec sin TTY y con servicio explícito.');
    const id = await comprobar(operacion[2]);
    return ejecutar(['exec', id, ...operacion.slice(3)]);
  }
  if (accion === 'logs') {
    const nombres = operacion.slice(1).filter((valor) => valor !== '--no-color');
    if (nombres.length === 0 || operacion.slice(1).some((valor) => valor.startsWith('-') && valor !== '--no-color'))
      throw new Error('QA logs exige servicios explícitos y opciones conocidas.');
    for (const servicio of nombres) await comprobar(servicio);
    return ejecutar(argumentos);
  }
  // Ejecutar una operación sobre cada ID evita que una selección por nombre cambie de destino.
  if (operacion.length < 2) throw new Error('La operación QA exige servicios explícitos.');
  const salidas = [];
  for (const servicio of operacion.slice(1)) {
    const id = await comprobar(servicio);
    salidas.push(await ejecutar([accion, id]));
  }
  return { stdout: salidas.map((salida) => salida.stdout).join(''), stderr: salidas.map((salida) => salida.stderr).join('') };
}

/** Variante síncrona de solo exec usada por comprobaciones históricas de evolución SQL. */
export function ejecutarDockerSync(comando, argumentos, opciones = {}) {
  const compose = argumentosCompose();
  if (comando !== 'docker' || opciones.shell || compose.some((valor, indice) => argumentos[indice] !== valor))
    throw new Error('Invocación Docker fuera del contexto QA explícito.');
  const operacion = argumentos.slice(compose.length);
  if (operacion[0] !== 'exec' || operacion[1] !== '-T' || operacion.length < 4 || !servicios.has(operacion[2]))
    throw new Error('QA síncrona solo admite exec sin TTY y servicio explícito.');
  const configuracion = { ...opciones, cwd: raizProyecto, windowsHide: true, shell: false, stdio: 'pipe' };
  const ejecutar = (args, configuracionProceso = configuracion) => {
    try { return execFileSync('docker', args, configuracionProceso); }
    catch { throw new Error('Docker QA no completó exec; salida sensible omitida.'); }
  };
  const lectura = { ...configuracion, encoding: 'utf8', timeout: 15000, maxBuffer: 65536 };
  const encontrados = ejecutar([...compose, 'ps', '--all', '--quiet', operacion[2]], lectura).trim().split(/\s+/);
  if (encontrados.length !== 1 || !/^[0-9a-f]{64}$/.test(encontrados[0]))
    throw new Error('QA requiere un único contenedor existente por servicio.');
  const id = encontrados[0];
  const formato = '{{.Id}}|{{index .Config.Labels "com.docker.compose.project"}}|{{index .Config.Labels "com.docker.compose.service"}}';
  const identidad = ejecutar(['inspect', '--format', formato, id], lectura).trim();
  if (identidad !== `${id}|${compose[2]}|${operacion[2]}`)
    throw new Error('ID, proyecto o servicio Docker no coinciden; operación detenida.');
  return ejecutar(['exec', id, ...operacion.slice(3)]);
}

// Entrada para PowerShell: argumentos como lista, sin shell intermedio ni comandos concatenados.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv[2] === '--contexto' && process.argv.length === 3) {
      console.log(JSON.stringify(argumentosCompose()));
    } else if (process.argv[2] === '--' && process.argv.length > 3) {
      const timeout = Number(process.env.QA_DOCKER_TIMEOUT_MS ?? '90000');
      if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 90000)
        throw new Error('Plazo Docker QA inválido; debe estar entre 1000 y 90000 ms.');
      const salida = await ejecutarDocker('docker', [...argumentosCompose(), ...process.argv.slice(3)],
        { encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024 });
      process.stdout.write(salida.stdout);
    } else throw new Error('Entrada QA no válida; usar --contexto o -- seguido de la operación.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
