import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { prepararDirectorioEvidencias, raizProyecto, rutaDelProyecto } from './rutas-evidencia.mjs';

// Solo datos ficticios y loopback. Nunca se escriben cuerpos de login ni tokens.
const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:18080');
if (base.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)
    || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
  throw new Error('Esta comprobación solo permite HTTP loopback, sin credenciales ni parámetros en URL.');
}
const evidencia = prepararDirectorioEvidencias();
const entorno = rutaDelProyecto(process.env.QA_ENTORNO || 'infraestructura/.env.example');
const controles = [];
const ejecutar = promisify(execFile);
const cuentas = ['SOLICITANTE', 'SUPERVISOR', 'AUDITOR', 'ADMINISTRADOR'];
const publico = ['correo', 'id', 'nombreVisible', 'roles'];

function comprobar(condicion, criterio) {
  if (!condicion) throw new Error(`Criterio incumplido: ${criterio}`);
  controles.push({ criterio, resultado: 'PASS' });
}

function jar() {
  return new Map();
}

async function pedir(ruta, { cookies = jar(), metodo = 'GET', cuerpo, token, xsrf = true } = {}) {
  const headers = {};
  if (cookies.size) headers.Cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  if (metodo !== 'GET' && xsrf && cookies.has('XSRF-TOKEN')) {
    headers['X-XSRF-TOKEN'] = decodeURIComponent(cookies.get('XSRF-TOKEN'));
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cuerpo) headers['Content-Type'] = 'application/json';
  const respuesta = await fetch(new URL(ruta, base), {
    method: metodo,
    headers,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(10000),
    redirect: 'error',
  });
  const recibidas = respuesta.headers.getSetCookie();
  for (const cookie of recibidas) {
    const par = cookie.split(';')[0];
    const separador = par.indexOf('=');
    const nombre = par.slice(0, separador);
    const valor = par.slice(separador + 1);
    if (/max-age=0(?:;|$)/i.test(cookie) || !valor) cookies.delete(nombre);
    else cookies.set(nombre, valor);
  }
  const texto = await respuesta.text();
  return { status: respuesta.status, headers: respuesta.headers, recibidas, json: texto ? JSON.parse(texto) : null };
}

async function login(rol = 'SOLICITANTE') {
  const cookies = jar();
  const csrf = await pedir('/api/autenticacion/csrf', { cookies });
  comprobar(csrf.status === 204 && cookies.has('XSRF-TOKEN'), 'CSRF materializado');
  const nombreRol = rol.toLowerCase();
  const respuesta = await pedir('/api/autenticacion/iniciar-sesion', {
    cookies,
    metodo: 'POST',
    cuerpo: { correo: `${nombreRol}@demo.invalid`, contrasena: `Ejemplo local ${nombreRol} 2026` },
  });
  comprobar(respuesta.status === 200, `Login ficticio ${rol}`);
  comprobar(JSON.stringify(Object.keys(respuesta.json).sort()) === JSON.stringify(['accessToken', 'expiraEn', 'tipoToken', 'usuario']), 'Contrato mínimo de acceso');
  comprobar(JSON.stringify(Object.keys(respuesta.json.usuario).sort()) === JSON.stringify(publico), 'Usuario sin datos internos');
  comprobar(respuesta.json.tipoToken === 'Bearer' && respuesta.json.expiraEn > 0 && respuesta.json.expiraEn <= 600, 'Tipo y duración de acceso');
  comprobar(respuesta.json.usuario.roles.includes(rol), `Rol persistido ${rol}`);
  comprobar(respuesta.headers.get('cache-control')?.includes('no-store'), 'Login no-store');
  const refresh = respuesta.recibidas.find((cookie) => cookie.startsWith('REFRESH-TOKEN=')) || '';
  comprobar(/;\s*HttpOnly/i.test(refresh) && /;\s*SameSite=Strict/i.test(refresh)
    && /;\s*Path=\/api\/autenticacion(?:;|$)/i.test(refresh)
    && !/;\s*Domain=/i.test(refresh) && !/;\s*Secure/i.test(refresh)
    && /;\s*Max-Age=\d+/i.test(refresh), 'Atributos cookie loopback local');
  comprobar(!JSON.stringify(respuesta.json).includes(cookies.get('REFRESH-TOKEN')), 'Refresh ausente de JSON');
  const claims = JSON.parse(Buffer.from(respuesta.json.accessToken.split('.')[1], 'base64url').toString('utf8'));
  comprobar(['iss', 'aud', 'sub', 'iat', 'nbf', 'exp', 'jti', 'sid', 'roles'].every((claim) => Object.hasOwn(claims, claim)), 'Claims JWT mínimos');
  comprobar(!['correo', 'password', 'hash', 'contrasena', 'refreshToken'].some((claim) => Object.hasOwn(claims, claim)), 'JWT sin datos innecesarios');
  return { cookies, acceso: respuesta.json.accessToken, usuario: respuesta.json.usuario };
}

async function yo(acceso) {
  return pedir('/api/identidad/yo', { token: acceso });
}

async function cerrar(sesion) {
  const respuesta = await pedir('/api/autenticacion/cerrar-sesion', { cookies: sesion.cookies, metodo: 'POST' });
  comprobar(respuesta.status === 204 && !sesion.cookies.has('REFRESH-TOKEN'), 'Cierre 204 y borrado cookie');
  comprobar(respuesta.headers.get('cache-control')?.includes('no-store'), 'Cierre no-store');
  comprobar(respuesta.headers.get('clear-site-data')?.includes('"cache"'), 'Clear-Site-Data limitado a caché');
  comprobar((await yo(sesion.acceso)).status === 401, 'JWT rechazado después del cierre');
}

async function esperarSalud() {
  const limite = Date.now() + 60000;
  while (Date.now() < limite) {
    try {
      const respuesta = await pedir('/api/salud');
      if (respuesta.status === 200 && respuesta.json.estado === 'DISPONIBLE') return;
    } catch { /* El backend está reiniciándose. */ }
    await new Promise((continuar) => setTimeout(continuar, 1000));
  }
  throw new Error('La API no recuperó salud tras el reinicio en sesenta segundos.');
}

let error;
try {
  for (const rol of cuentas) {
    const sesion = await login(rol);
    const identidad = await yo(sesion.acceso);
    comprobar(identidad.status === 200 && identidad.json.id === sesion.usuario.id
      && identidad.json.roles.includes(rol), `Identidad real ${rol}`);
    comprobar(JSON.stringify(Object.keys(identidad.json).sort()) === JSON.stringify(publico), 'Identidad sin datos de sesión');
    await cerrar(sesion);
  }

  const sesion = await login();
  await ejecutar('docker', ['compose', '--env-file', entorno, '-f', 'infraestructura/compose.yaml', 'restart', 'backend'], {
    cwd: raizProyecto, windowsHide: true, timeout: 60000,
  });
  await esperarSalud();
  comprobar((await yo(sesion.acceso)).status === 401, 'Reinicio invalida JWT de clave efímera anterior');
  const anterior = new Map(sesion.cookies);
  const renovada = await pedir('/api/autenticacion/renovar', { cookies: sesion.cookies, metodo: 'POST' });
  comprobar(renovada.status === 200, 'Refresh persistido sobrevive al reinicio');
  comprobar(sesion.cookies.get('REFRESH-TOKEN') !== anterior.get('REFRESH-TOKEN'), 'Rotación tras reinicio');
  comprobar((await yo(renovada.json.accessToken)).status === 200, 'JWT nuevo válido tras reinicio');
  comprobar(renovada.json.usuario.id === sesion.usuario.id, 'Usuario idempotente tras reinicio');
  const reutilizada = await pedir('/api/autenticacion/renovar', { cookies: anterior, metodo: 'POST' });
  comprobar(reutilizada.status === 401 && !anterior.has('REFRESH-TOKEN'), 'Reutilización rechazada y cookie borrada');
  comprobar((await yo(renovada.json.accessToken)).status === 401, 'Reutilización invalida JWT de familia');
  const familia = await pedir('/api/autenticacion/renovar', { cookies: sesion.cookies, metodo: 'POST' });
  comprobar(familia.status === 401, 'Reutilización invalida refresh reemplazante');

  const intento = jar();
  await pedir('/api/autenticacion/csrf', { cookies: intento });
  const sinCsrf = await pedir('/api/autenticacion/iniciar-sesion', {
    cookies: intento, metodo: 'POST', xsrf: false,
    cuerpo: { correo: 'solicitante@demo.invalid', contrasena: 'Ejemplo local solicitante 2026' },
  });
  comprobar(sinCsrf.status === 403, 'Login sin CSRF rechazado');
} catch (fallo) {
  // No serializar request/response: podrían contener credenciales temporales.
  error = fallo instanceof Error && fallo.message.startsWith('Criterio incumplido:')
    ? fallo.message : 'Fallo de infraestructura o respuesta inesperada durante QA de sesiones.';
  process.exitCode = 1;
} finally {
  const resultado = { fecha: new Date().toISOString(), baseUrl: base.origin,
    resultado: error ? 'FAIL' : 'PASS', controles, error,
    limites: 'Cuentas ficticias de .env.example. HTTP loopback. Tokens solo en memoria del proceso. Reinicia exclusivamente backend; no borra datos.' };
  writeFileSync(resolve(evidencia, 'compose-sesiones.json'), JSON.stringify(resultado, null, 2) + '\n');
  console.log(`${resultado.resultado}: ${controles.length} controles de sesión. Evidencia sin credenciales: ${evidencia}`);
  if (error) console.error(error);
}
