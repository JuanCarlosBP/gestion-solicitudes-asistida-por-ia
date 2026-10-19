import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
export const raiz = resolve(import.meta.dirname, '../..');
export function configuracion() {
  for (const k of ['COMPOSE_PROJECT_NAME','COMPOSE_FILE','AG016_ENTORNO_ARCHIVO'])
    if (!process.env[k]?.trim()) throw new Error('Falta variable obligatoria '+k+'; no hay fallback.');
  if (process.env.COMPOSE_PROJECT_NAME !== 'gestion-solicitudes-ag016') throw new Error('Proyecto no autorizado.');
  const compose=resolve(process.env.COMPOSE_FILE), envFile=resolve(process.env.AG016_ENTORNO_ARCHIVO);
  if (compose!==resolve(raiz,'infraestructura/demo/compose.yaml') || !existsSync(envFile)) throw new Error('Compose/entorno inválidos.');
  const env=Object.fromEntries(readFileSync(envFile,'utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('#')).map(l=>{
    const i=l.indexOf('='); if(i<1)throw Error('Entorno inválido');return [l.slice(0,i),l.slice(i+1)];}));
  const claves=['COMPOSE_PROJECT_NAME','DEMO_ENTORNO','DEMO_PERFILES','AG016_SECRETOS_DIR','BACKEND_IMAGEN','FRONTEND_IMAGEN','FRONTEND_PUERTO',
    'PERFIL_RECURSOS','JAVA_MEMORIA','PG_MEMORIA','WEB_MEMORIA','PROVISION_MEMORIA','RESERVA_SO_MIB',
    'JAVA_CPU','PG_CPU','WEB_CPU','PROVISION_CPU','RESERVA_SO_CPU'];
  for(const k of claves)if(!env[k]?.trim())throw Error('Entorno incompleto: '+k);
  if(env.COMPOSE_PROJECT_NAME!==process.env.COMPOSE_PROJECT_NAME || env.DEMO_ENTORNO!=='local')throw Error('Identidad/entorno inconsistentes.');
  if(!['18086','18087','18088','18089'].includes(env.FRONTEND_PUERTO))throw Error('Puerto fuera de inventario.');
  return {env,compose,envFile,proyecto:env.COMPOSE_PROJECT_NAME,base:'http://127.0.0.1:'+env.FRONTEND_PUERTO};
}
export const config=configuracion();
export function exigirSinCarga(){
  if(existsSync(resolve(raiz,'tmp/ag016/carga-activa.lock')))
    throw Error('Existe una carga activa o pendiente de recuperación; no cambiar su laboratorio.');
}
export function docker(args,opciones={}) {
  return execFileSync('docker',args,{cwd:raiz,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:4*1024*1024,...opciones});
}
export const composeArgs=['compose','--project-name',config.proyecto,'--env-file',config.envFile,'-f',config.compose];
export function identidad(servicio) {
  if(!['postgres','backend','frontend','provisionador'].includes(servicio))throw Error('Servicio no autorizado.');
  const ids=docker([...composeArgs,'ps','-a','-q',servicio]).trim().split(/\s+/).filter(Boolean);
  if(ids.length!==1||!/^[a-f0-9]{64}$/.test(ids[0]))throw Error('Identidad de servicio no única: '+servicio);
  const dato=JSON.parse(docker(['inspect','--format',
    '{"id":{{json .Id}},"proyecto":{{json (index .Config.Labels "com.docker.compose.project")}},"servicio":{{json (index .Config.Labels "com.docker.compose.service")}},"estado":{{json .State.Status}},"iniciadoEn":{{json .State.StartedAt}}}',ids[0]]));
  if(dato.id!==ids[0]||dato.proyecto!==config.proyecto||dato.servicio!==servicio)throw Error('Identidad Docker ajena.');
  return dato;
}
export function ejecutar(servicio,args,opciones={}) {
  const i=identidad(servicio);
  if(i.estado!=='running')throw Error('Servicio no está arrancado: '+servicio);
  return docker(['exec','-i',i.id,...args],opciones);
}
export function ciclo(accion,servicio) {
  if(!['stop','start','restart'].includes(accion))throw Error('Acción fuera de alcance.');
  const i=identidad(servicio);
  return docker([accion,...(servicio==='provisionador'&&accion!=='start'?['--time','35']:[]),i.id]);
}
export function sql(base,consulta) {
  if(!['ag016_control','ag016_demo_01','ag016_demo_02','ag016_demo_03','ag016_restore_qa','ag016_restore_qa_funcional','ag016_restore_qa_funcional_02','ag016_restore_qa_a1','ag016_restore_qa_a2','ag016_restore_qa_b1','ag016_restore_qa_b2','ag016_restore_qa_c1','ag016_restore_qa_c2','ag016_restore_qa_reloj_a1','ag016_restore_qa_reloj_a2','ag016_restore_qa_reloj_b1','ag016_restore_qa_reloj_b2','postgres'].includes(base))throw Error('Base no inventariada.');
  return ejecutar('postgres',['psql','--no-psqlrc','-U','ag016_provision','-d',base,'-v','ON_ERROR_STOP=1','-tA'],{input:consulta}).trim();
}
export function guardar(ruta,datos) {
  const p=resolve(raiz,'qa/evidencias/ag016',ruta);
  if(!p.replaceAll('\\','/').startsWith(resolve(raiz,'qa/evidencias/ag016').replaceAll('\\','/')+'/'))throw Error('Evidencia fuera de AG016.');
  if(existsSync(p))throw Error('La evidencia ya existe: '+ruta);
  mkdirSync(dirname(p),{recursive:true});
  writeFileSync(p,JSON.stringify(datos,null,2)+'\n');
}
