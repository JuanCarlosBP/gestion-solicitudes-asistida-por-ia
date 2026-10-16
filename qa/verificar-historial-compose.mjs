import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { prepararDirectorioEvidencias, raizProyecto, rutaDelProyecto } from './rutas-evidencia.mjs';

const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:18080');
if (base.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)
  || base.username || base.password || base.search || base.hash || base.pathname !== '/')
  throw new Error('QA007 requiere HTTP loopback sin credenciales en URL.');
const evidencia = prepararDirectorioEvidencias();
const ejecutar = promisify(execFile);
const compose = ['compose', '--env-file', rutaDelProyecto(process.env.QA_ENTORNO || 'infraestructura/.env.example'), '-f', 'infraestructura/compose.yaml'];
const controles = [], sesiones = [], mediciones = [];
const marca = 'QA007-' + randomUUID();
let etapa = 'preparación', error;
const docker = async (args) => (await ejecutar('docker', [...compose, ...args],
  { cwd: raizProyecto, windowsHide: true, timeout: 90000, maxBuffer: 1024 * 1024 })).stdout.trim();
const sql = (consulta) => docker(['exec', '-T', 'postgres', 'psql', '-U', 'administrador_local', '-d', 'gestion', '-v', 'ON_ERROR_STOP=1', '-tAc', consulta]);
const uuid = (valor) => { if (!/^[a-f0-9-]{36}$/.test(valor)) throw new Error('UUID fixture inválido'); return valor; };
function comprobar(valor, criterio) {
  if (!valor) throw new Error('Criterio incumplido: ' + criterio);
  controles.push({ criterio, resultado: 'PASS' });
}
async function pedir(ruta, { sesion, metodo = 'GET', cuerpo, clave } = {}) {
  const headers = {};
  if (sesion?.cookies.size) headers.Cookie = [...sesion.cookies].map(([k, v]) => k + '=' + v).join('; ');
  if (sesion?.acceso) headers.Authorization = 'Bearer ' + sesion.acceso;
  if (metodo !== 'GET' && sesion?.cookies.has('XSRF-TOKEN')) headers['X-XSRF-TOKEN'] = decodeURIComponent(sesion.cookies.get('XSRF-TOKEN'));
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  if (clave !== undefined) headers['Idempotency-Key'] = clave;
  const inicio = performance.now();
  const r = await fetch(new URL(ruta, base), { method: metodo, headers, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(15000), redirect: 'error' });
  for (const cookie of r.headers.getSetCookie()) {
    const par = cookie.split(';')[0], i = par.indexOf('='), nombre = par.slice(0, i), valor = par.slice(i + 1);
    if (!valor || /max-age=0(?:;|$)/i.test(cookie)) sesion?.cookies.delete(nombre);
    else sesion?.cookies.set(nombre, valor);
  }
  const texto = await r.text();
  return { estado: r.status, json: texto ? JSON.parse(texto) : null, cabeceras: r.headers, ms: performance.now() - inicio };
}
async function login(rol) {
  const sesion = { cookies: new Map() };
  await pedir('/api/autenticacion/csrf', { sesion });
  const r = await pedir('/api/autenticacion/iniciar-sesion', { sesion, metodo: 'POST',
    cuerpo: { correo: rol.toLowerCase() + '@demo.invalid', contrasena: 'Ejemplo local ' + rol.toLowerCase() + ' 2026' } });
  comprobar(r.estado === 200, 'Login ficticio ' + rol);
  Object.assign(sesion, { acceso: r.json.accessToken, id: r.json.usuario.id }); sesiones.push(sesion); return sesion;
}
const post = (sesion, ruta, cuerpo, clave = randomUUID()) => pedir(ruta, { sesion, metodo: 'POST', cuerpo, clave });
const get = (sesion, ruta) => pedir(ruta, { sesion });
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const editable = (p) => Object.fromEntries(['tipo','denominacion','paisFiscal','identificadorFiscal','correoContacto','telefonoContacto','version'].map(k => [k,p[k]]));
const historialProveedor = (sesion, id) => get(sesion, '/api/proveedores/' + id + '/historial');
const historialSolicitud = (sesion, id) => get(sesion, '/api/solicitudes/' + id + '/historial');
const cantidad = async (tipo, id) => Number(await sql("SELECT count(*) FROM gestion.eventos_historial WHERE tipo_recurso='" + tipo + "' AND recurso_id='" + uuid(id) + "'"));
const paginas = ['elementos','pagina','tamano','totalElementos','totalPaginas','historiaAnteriorDesconocida'];
const camposEvento = ['id','tipoRecurso','recursoId','accion','actor','ocurridoEn','versionAnterior','versionResultante','estadoAnterior','estadoResultante','resumen','origen'];
function comprobarPrivacidad(pagina) {
  comprobar(Object.keys(pagina).every(k => paginas.includes(k)), 'HA04 campos de página cerrados');
  for (const evento of pagina.elementos) {
    comprobar(Object.keys(evento).every(k => camposEvento.includes(k)), 'HA04 evento solo campos mínimos');
    comprobar(Object.keys(evento.actor).every(k => ['id','nombreVisible'].includes(k)), 'HA04 actor mínimo');
    comprobar(!JSON.stringify(evento).includes('PRIVADO007'), 'HA04 sin datos privados de fixture');
  }
}
try {
  const admin = await login('ADMINISTRADOR'), solicitante = await login('SOLICITANTE');
  const supervisor = await login('SUPERVISOR'), auditor = await login('AUDITOR');
  etapa = 'proveedores';
  const datos = { tipo: 'PROFESIONAL', denominacion: marca, paisFiscal: 'ES', identificadorFiscal: 'PRIVADO007-' + randomUUID(),
    correoContacto: 'PRIVADO007@demo.invalid', telefonoContacto: '+34 600000007' };
  const clave = randomUUID(), alta = await post(admin, '/api/proveedores', datos, clave);
  comprobar(alta.estado === 201, 'HA02 alta proveedor201');
  let p = alta.json;
  const hp = '/api/proveedores/' + p.id + '/historial';
  const uno = await get(auditor, hp);
  comprobar(uno.estado === 200 && uno.json.totalElementos === 1 && !uno.json.historiaAnteriorDesconocida, 'HA01 alta nueva con cobertura conocida');
  comprobar(uno.json.elementos[0].accion === 'PROVEEDOR_CREADO', 'HA02 acción de alta exacta');
  comprobar(uno.json.elementos[0].actor.id === admin.id && uno.json.elementos[0].versionResultante === 0, 'HA02 actor y versión inicial');
  comprobarPrivacidad(uno.json);
  comprobar((await post(admin, '/api/proveedores', datos, clave)).estado === 201 && await cantidad('PROVEEDOR', p.id) === 1, 'HA02 replay alta sin evento extra');
  const edit = await pedir('/api/proveedores/' + p.id, { sesion: admin, metodo: 'PUT', cuerpo: { ...editable(p), denominacion: marca + ' editado' } });
  comprobar(edit.estado === 200, 'HA02 modificar proveedor'); p = edit.json;
  const bajaClave = randomUUID(), baja = await post(admin, '/api/proveedores/' + p.id + '/desactivar', { version: p.version }, bajaClave);
  comprobar(baja.estado === 200, 'HA02 baja proveedor');
  comprobar((await post(admin, '/api/proveedores/' + p.id + '/desactivar', { version: p.version }, bajaClave)).estado === 200, 'HA02 replay baja');
  p = baja.json;
  const noOp = await post(admin, '/api/proveedores/' + p.id + '/desactivar', { version: p.version });
  comprobar(noOp.estado === 200 && noOp.json.version === p.version && await cantidad('PROVEEDOR', p.id) === 3, 'HA02 no-op no registra hecho falso');
  const reactivada = await post(admin, '/api/proveedores/' + p.id + '/reactivar', { version: p.version });
  comprobar(reactivada.estado === 200, 'HA02 reactivar'); p = reactivada.json;
  const cuatro = await get(auditor, hp);
  comprobar(igual(cuatro.json.elementos.map(e => e.accion), ['PROVEEDOR_REACTIVADO','PROVEEDOR_DESACTIVADO','PROVEEDOR_MODIFICADO','PROVEEDOR_CREADO']), 'HA02 cuatro acciones ordenadas');
  comprobarPrivacidad(cuatro.json);
  for (const s of [solicitante,supervisor]) {
    comprobar((await get(s, hp)).estado === 404, 'HA05 catálogo no concede historial');
    comprobar((await get(s, '/api/historial')).estado === 403, 'HA05 global restringido');
  }
  etapa = 'solicitudes y decisiones';
  const fixture = { proveedorId: p.id, solicitudes: [] };
  for (const decision of ['aprobar','rechazar']) {
    const crearClave = randomUUID(), creada = await post(solicitante, '/api/solicitudes', { asunto: marca + ' ' + decision }, crearClave);
    comprobar(creada.estado === 201, 'HA02 crear borrador');
    const s = creada.json, ruta = '/api/solicitudes/' + s.id;
    comprobar((await historialSolicitud(supervisor, s.id)).estado === 404, 'HA05 supervisor no ve borrador');
    const cuerpo = { asunto: marca + ' ' + decision, descripcion: 'PRIVADO007 descripción',
      proveedorId: p.id, supervisorId: supervisor.id, version: s.version,
      conceptos: [{ id: null, descripcion: 'PRIVADO007 concepto', cantidad: '1', precioUnitario: '10', unidad: 'UNIDAD', posicion: 1 }] };
    const guardada = await pedir(ruta, { sesion: solicitante, metodo: 'PUT', cuerpo });
    comprobar(guardada.estado === 200, 'HA02 guardar borrador');
    comprobar((await historialSolicitud(supervisor, s.id)).estado === 404, 'HA05 asignación borrador sigue oculta');
    const presentarClave = randomUUID(), presentada = await post(solicitante, ruta + '/presentar', { version: guardada.json.version }, presentarClave);
    comprobar(presentada.estado === 200, 'HA02 presentar');
    comprobar((await post(solicitante, ruta + '/presentar', { version: guardada.json.version }, presentarClave)).estado === 200, 'HA02 replay presentación');
    const cuerpoDecision = { version: presentada.json.version, ...(decision === 'aprobar' ? { comentario: 'PRIVADO007 comentario' } : { motivo: 'PRIVADO007 motivo suficiente' }) };
    const decidirClave = randomUUID(), decidida = await post(supervisor, ruta + '/' + decision, cuerpoDecision, decidirClave);
    comprobar(decidida.estado === 200, 'HA03 decisión V5 ' + decision);
    comprobar((await post(supervisor, ruta + '/' + decision, cuerpoDecision, decidirClave)).estado === 200, 'HA03 replay decisión');
    const h = await historialSolicitud(solicitante, s.id);
    comprobar(h.estado === 200 && h.json.totalElementos === 4 && !h.json.historiaAnteriorDesconocida, 'HA01 cuatro hechos reales');
    comprobar(h.json.elementos[0].origen === 'DECISION_V5' && h.json.elementos[0].accion === (decision === 'aprobar' ? 'APROBADA' : 'RECHAZADA'), 'HA03 proyección V5');
    comprobar(await cantidad('SOLICITUD', s.id) === 3, 'HA03 ninguna decisión duplicada V7');
    comprobar(Number(await sql("SELECT count(*) FROM gestion.decisiones_solicitud WHERE solicitud_id='" + uuid(s.id) + "'")) === 1, 'HA03 único registro autoritativo');
    comprobarPrivacidad(h.json);
    comprobar((await historialSolicitud(supervisor, s.id)).estado === 200, 'HA05 supervisor conserva final asignada');
    const detalle = await get(solicitante, ruta);
    comprobar(JSON.stringify(detalle.json).includes('PRIVADO007'), 'HA04 detalle autorizado original conserva textos de negocio');
    fixture.solicitudes.push({ id: s.id, estado: decidida.json.estado });
  }
  etapa = 'filtros paginación y resumen';
  for (const filtro of ['size=0','size=101','page=-1','page=0&page=1','accion=INVENTADA','actor=no-uuid','desde=2026-01-01','desde=2026-02-30T00:00:00Z','desde=2026-10-16T00:00:00Z&hasta=2026-10-15T00:00:00Z','desconocido=1']) {
    comprobar((await get(auditor, hp + '?' + filtro)).estado === 400, 'HA06 filtro inválido controlado ' + filtro);
  }
  const primera = await get(auditor, hp + '?size=2&page=0'), segunda = await get(auditor, hp + '?size=2&page=1');
  comprobar(primera.json.totalElementos === 4 && primera.json.totalPaginas === 2 && segunda.json.totalElementos === 4, 'HA06 conteo y páginas');
  comprobar(new Set([...primera.json.elementos,...segunda.json.elementos].map(e => e.id)).size === 4, 'HA06 páginas sin duplicar en conjunto estable');
  const filtrada = await get(auditor, hp + '?accion=PROVEEDOR_CREADO&actor=' + admin.id);
  comprobar(filtrada.json.totalElementos === 1 && !filtrada.json.historiaAnteriorDesconocida, 'HA06 aviso calculado antes de filtros');
  const fecha = encodeURIComponent(filtrada.json.elementos[0].ocurridoEn);
  comprobar((await get(auditor, hp + '?desde=' + fecha + '&hasta=' + fecha)).json.totalElementos === 1, 'HA06 intervalo inclusivo');
  comprobar((await get(auditor, hp + '?page=99')).json.elementos.length === 0, 'HA06 página vacía acotada');
  for (const [nombre,sesion] of [['admin',admin],['auditor',auditor],['solicitante',solicitante],['supervisor',supervisor]]) {
    const resumen = await get(sesion, '/api/resumen');
    comprobar(resumen.estado === 200, 'HA07 resumen disponible ' + nombre);
    const condicion = ['admin','auditor'].includes(nombre) ? 'true' : nombre === 'solicitante' ? "autor_id='" + uuid(sesion.id) + "'" : "supervisor_id='" + uuid(sesion.id) + "' AND estado<>'BORRADOR'";
    const conteos = JSON.parse(await sql("SELECT json_build_object('BORRADOR',count(*) FILTER (WHERE estado='BORRADOR'),'PRESENTADA',count(*) FILTER (WHERE estado='PRESENTADA'),'APROBADA',count(*) FILTER (WHERE estado='APROBADA'),'RECHAZADA',count(*) FILTER (WHERE estado='RECHAZADA'),'total',count(*)) FROM gestion.solicitudes WHERE " + condicion));
    comprobar(igual(resumen.json.solicitudes, conteos), 'HA07 contadores coinciden BD visible ' + nombre);
    if (['admin','auditor'].includes(nombre)) comprobar(resumen.json.accionesPendientes.borradoresPropios === 0 && resumen.json.accionesPendientes.presentadasAsignadas === 0, 'HA07 rol lector sin pendientes propios');
  }
  for (const ruta of ['/api/historial','/api/resumen',hp,'/api/solicitudes/' + fixture.solicitudes[0].id + '/historial']) comprobar((await pedir(ruta)).estado === 401, 'HA05 autenticación requerida ' + ruta.split('/')[2]);
  comprobar((await historialProveedor(auditor,randomUUID())).estado === 404, 'HA05 proveedor inexistente404');
  comprobar((await historialSolicitud(auditor,randomUUID())).estado === 404, 'HA05 solicitud inexistente404');
  const global = await get(auditor,'/api/historial?tipoRecurso=PROVEEDOR&recursoId=' + p.id);
  comprobar(global.estado === 200 && global.json.totalElementos === 4 && global.json.historiaAnteriorDesconocida, 'HA06 global filtrado y límite histórico');
  comprobar(global.cabeceras.get('cache-control')?.includes('no-store'), 'HA04 no-store');
  const anterior = process.env.QA_HISTORIAL_ANTERIOR;
  let anteriorId;
  if (anterior && existsSync(rutaDelProyecto(anterior))) {
    const datosAnteriores = JSON.parse(readFileSync(rutaDelProyecto(anterior),'utf8').replace(/^\uFEFF/,''));
    for (const s of datosAnteriores.solicitudes || []) {
      anteriorId ??= s.id;
      const h = await historialSolicitud(auditor,s.id);
      comprobar(h.estado === 200 && h.json.historiaAnteriorDesconocida, 'HA01 recurso anterior sin historia inventada');
      comprobar(h.json.elementos.every(e => e.origen === 'DECISION_V5'), 'HA03 hechos previos solo V5');
    }
  }
  if (!anteriorId) {
    // Fixture artificial de cobertura incompleta para CI desde base nueva.
    // No representa un acontecimiento real ni reconstruye historia de negocio.
    anteriorId = randomUUID();
    await sql("INSERT INTO gestion.solicitudes(id,numero,autor_id,asunto,moneda,estado,total,version,creado_en,actualizado_en) VALUES ('" + uuid(anteriorId) + "','SOL-2026-'||lpad(nextval('gestion.numero_solicitud_seq')::text,6,'0'),'" + uuid(solicitante.id) + "','Fixture ficticia sin creación registrada007','EUR','BORRADOR',0,0,now(),now())");
    const incompleta = await historialSolicitud(auditor, anteriorId);
    comprobar(incompleta.estado === 200 && incompleta.json.historiaAnteriorDesconocida && incompleta.json.totalElementos === 0, 'HA01 fixture artificial sin creación registrada no inventa eventos');
  }
  fixture.historiaAnteriorId = anteriorId;
  etapa = 'medición local';
  for (let i=0;i<20;i++) {
    const r = await get(auditor,'/api/historial?size=100');
    comprobar(r.estado === 200 && r.json.elementos.length <= 100, 'HA06 consulta acotada');
    mediciones.push(r.ms);
  }
  const volumen = JSON.parse(await sql("SELECT json_build_object('eventosV7',(SELECT count(*) FROM gestion.eventos_historial),'decisionesV5',(SELECT count(*) FROM gestion.decisiones_solicitud),'bytesV7',pg_total_relation_size('gestion.eventos_historial'))"));
  writeFileSync(resolve(evidencia,'historial-medicion.json'),JSON.stringify({fecha:new Date().toISOString(),volumen,muestrasMs:mediciones,minMs:Math.min(...mediciones),maxMs:Math.max(...mediciones),mediaMs:mediciones.reduce((a,b)=>a+b,0)/mediciones.length,limite:'20 GET locales secuenciales con size100; sin SLA ni benchmark productivo.'},null,2)+'\n');
  writeFileSync(resolve(evidencia,'historial-fixture.json'),JSON.stringify(fixture,null,2)+'\n');
} catch (e) {
  error = e instanceof Error ? e.message : 'Fallo desconocido';
} finally {
  for (const sesion of sesiones) { try { await pedir('/api/autenticacion/cerrar-sesion',{sesion,metodo:'POST'}); } catch { /* no ocultar el resultado principal */ } }
}
const resultado = { fecha:new Date().toISOString(),base:base.origin,resultado:error?'FAIL':'PASS',etapa,controles,error,limite:'Datos ficticios; tokens y cookies solo en memoria. Rollback/revocación/carreras y evolución se complementan con PostgreSQL IT.' };
writeFileSync(resolve(evidencia,'historial-api.json'),JSON.stringify(resultado,null,2)+'\n');
console.log(resultado.resultado + ': ' + controles.length + ' controles API007; etapa ' + etapa + (error ? '; ' + error : ''));
process.exitCode = error ? 1 : 0;
