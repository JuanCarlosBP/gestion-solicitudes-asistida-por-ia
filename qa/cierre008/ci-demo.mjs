// Solo ejecutable en un runner efímero de GitHub; nunca utiliza el VPS o el laboratorio Windows.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout as pausa } from 'node:timers/promises';
const root = path.resolve(import.meta.dirname, '../..');
const proyecto = 'gestion-solicitudes-ag016';
const evidencia = path.join(root, 'tmp/evidencias/demo');
let fase = 'precondiciones';
const etapas = [];
let inicio = false;
const env = { ...process.env, COMPOSE_PROJECT_NAME: proyecto,
  COMPOSE_FILE: path.join(root, 'infraestructura/demo/compose.yaml'),
  DEMO_ENTORNO: 'local', PERFIL_RECURSOS: 'B', FRONTEND_PUERTO: '18086',
  AG016_ENTORNO_ARCHIVO: path.join(root, 'tmp/ag016/ci.env'),
  AG016_SECRETOS_DIR: path.join(root, 'tmp/ag016/ci-secretos'), BASE_URL: 'http://127.0.0.1:18086',
  E2E_DEMO: '1', E2E_RESULTS_DIR: path.join(evidencia, 'navegador'),
  E2E_SCREENSHOTS_DIR: path.join(evidencia, 'navegador'),
  QA_EVIDENCE_DIR: evidencia, NG_CLI_ANALYTICS: 'false' };
const cc = ['compose', '--project-name', proyecto, '--env-file', env.AG016_ENTORNO_ARCHIVO, '-f', env.COMPOSE_FILE];
function exigir(v,m) { if(!v) throw Error(m); }
function run(cmd,args,{capture=false,cwd=root,extra={}}={}) {
  const t=Date.now();const r=spawnSync(cmd,args,{cwd,env:{...env,...extra},encoding:'utf8',timeout:15*60000,maxBuffer:16*1048576,stdio:capture?'pipe':'inherit'});
  etapas.push({fase,programa:cmd,codigo:r.status,error:r.error?.code??null,duracionMs:Date.now()-t});
  exigir(!r.error&&r.status===0,`${fase}: ${cmd} código ${r.status??r.error?.code}; revisar el paso y el artefacto.`);
  return r.stdout?.trim()??'';
}
async function salud() {
  const fin=Date.now()+90000;
  while(Date.now()<fin) {try {const r=await fetch(env.BASE_URL+'/api/salud',{signal:AbortSignal.timeout(3000)});if(r.ok&&(await r.json()).estado==='DISPONIBLE')return;}catch{} await pausa(1000);}
  throw Error('La demo no ha quedado disponible dentro de 90 segundos.');
}
try {
  exigir(process.platform==='linux'&&process.env.GITHUB_ACTIONS==='true'&&process.env.RUNNER_OS==='Linux', 'Este ejecutor se limita a GitHub Actions Linux.');
  exigir(process.env.GITHUB_WORKSPACE&&fs.realpathSync(root)===fs.realpathSync(process.env.GITHUB_WORKSPACE),'Workspace ajeno.');
  exigir(/^\d+$/.test(process.env.GITHUB_RUN_ID??'')&&/^\d+$/.test(process.env.GITHUB_RUN_ATTEMPT??''),'Run sin identidad.');
  exigir(!fs.existsSync(env.AG016_ENTORNO_ARCHIVO)&&!fs.existsSync(env.AG016_SECRETOS_DIR),'Configuración previa: no se sobrescribe.');
  exigir(run('docker',['ps','-a','--filter','label=com.docker.compose.project='+proyecto,'--format','{{.ID}}'],{capture:true})==='','Hay un laboratorio previo; no se modifica.');
  fs.mkdirSync(evidencia,{recursive:true});
  fase='construir imágenes desde esta revisión';
  run('docker',['build','-t','gestion-solicitudes-ag016-backend:local','-f','backend/Dockerfile','backend']);
  run('docker',['build','-t','gestion-solicitudes-ag016-frontend:local','-f','frontend/Dockerfile','frontend']);
  fase='crear secretos nuevos exclusivamente de CI';run(process.execPath,['infraestructura/demo/preparar.mjs']);
  // Los bind mounts de Linux respetan UID. No convertir secretos en world-readable.
  const pg='postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826';
  const uid=run('docker',['run','--name','ci008-uid-postgres','--network','none','--entrypoint','id',pg,'-u','postgres'],{capture:true});
  const gid=run('docker',['run','--name','ci008-gid-postgres','--network','none','--entrypoint','id',pg,'-g','postgres'],{capture:true});
  exigir(/^\d+$/.test(uid)&&/^\d+$/.test(gid),'No se conoce el usuario de la imagen PostgreSQL.');
  const secretos=env.AG016_SECRETOS_DIR;
  run('sudo',['chown','10001:10001',...['runtime.properties','provision.properties','semilla.secret','identidad-privada.pem','identidad-publica.pem'].map(f=>path.join(secretos,f))]);
  run('sudo',['chown',uid+':'+gid,...['admin.secret','migracion.secret','control.secret','app01.secret','app02.secret','app03.secret'].map(f=>path.join(secretos,f))]);
  fase='arrancar PostgreSQL privado';inicio=true;run('docker',[...cc,'up','-d','--wait','--wait-timeout','120','postgres']);
  fase='provisionar tres espacios ficticios';run('docker',[...cc,'run','--no-deps','--name','ci008-provision-inicial','--entrypoint','java','provisionador','-Xmx96m','-jar','/aplicacion/aplicacion.jar','--demo-provisionar']);
  fase='arrancar aplicación y supervisor';run('docker',[...cc,'up','-d','provisionador','backend','frontend']);await salud();
  fase='aislamiento SQL de las tres identidades';
  run(process.execPath,['qa/ag016/verificar-roles.mjs'],{extra:{AG016_EJECUCION:`ci008-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}-roles`}});
  fase='aislamiento HTTP y ciclo de vida';
  run(process.execPath,['qa/cierre008/ci-aislamiento.mjs'],{extra:{AG016_EJECUCION:`ci008-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}-http`}});
  fase='esperar reciclaje antes del navegador';
  const fin=Date.now()+90000;let libres=false;
  while(Date.now()<fin){const r=await fetch(env.BASE_URL+'/api/demo',{signal:AbortSignal.timeout(5000)});const d=await r.json();if(r.ok&&d.disponibles===3){libres=true;break;}await pausa(1000);}
  exigir(libres,'No quedan tres espacios disponibles tras el reciclaje.');
  // Cada suite comienza con el limitador de reservas recuperado: no se reintenta
  // ninguna petición rechazada ni se desactiva el límite de producción.
  fase='separar suites respetando la ventana de limitación de reservas';await pausa(61000);
  fase='navegador real de demo';run('npm',['run','test:e2e'],{cwd:path.join(root,'frontend')});
  fs.writeFileSync(path.join(evidencia,'resultado.json'),JSON.stringify({estado:'PASS',fecha:new Date().toISOString(),entorno:'CI efímera; no VPS',etapas},null,2)+'\n');
} catch(e) {
  console.error('DEMO CI DETENIDA: '+e.message);process.exitCode=1;
  fs.mkdirSync(evidencia,{recursive:true});fs.writeFileSync(path.join(evidencia,'resultado.json'),JSON.stringify({estado:'FAIL',fase,error:e.message,etapas},null,2)+'\n');
} finally {
  if(inicio){const r=spawnSync('docker',[...cc,'stop','frontend','backend','provisionador','postgres'],{cwd:root,env,stdio:'inherit',timeout:120000});if(r.status!==0)process.exitCode=1;}
}
