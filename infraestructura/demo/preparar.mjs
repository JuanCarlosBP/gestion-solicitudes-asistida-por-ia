import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { randomBytes, generateKeyPairSync } from 'node:crypto';
const raiz = resolve(import.meta.dirname, '../..');
const requerido = (nombre) => {
  const valor = process.env[nombre];
  if (!valor?.trim()) throw new Error('Variable obligatoria: ' + nombre);
  return valor;
};
const proyecto = requerido('COMPOSE_PROJECT_NAME');
const compose = resolve(requerido('COMPOSE_FILE'));
if (proyecto !== 'gestion-solicitudes-ag016'
  || compose !== resolve(import.meta.dirname, 'compose.yaml')
  || requerido('DEMO_ENTORNO') !== 'local') throw new Error('Laboratorio local AG-016 obligatorio.');
const perfil = requerido('PERFIL_RECURSOS');
const perfiles = {
  A: { java: 960, pg: 512, web: 64, provision: 256, so: 256, cpu: [.55, .25, .05, .05, .10] },
  B: { java: 2048, pg: 1024, web: 128, provision: 384, so: 512, cpu: [1.15, .50, .05, .20, .10] },
};
if (!perfiles[perfil]) throw new Error('Perfil inicial debe ser A o B; C requiere fallo acreditado de ambos.');
const puerto = Number(requerido('FRONTEND_PUERTO'));
if (!Number.isInteger(puerto) || puerto < 18086 || puerto > 18089) throw new Error('Puerto fuera del inventario AG-016.');
const secretos = resolve(requerido('AG016_SECRETOS_DIR'));
const envFile = resolve(requerido('AG016_ENTORNO_ARCHIVO'));
for (const p of [secretos, envFile]) {
  const r = relative(resolve(raiz, 'tmp/ag016'), p);
  if (!r || isAbsolute(r) || r.startsWith('..')) throw new Error('Salida debe estar dentro de tmp/ag016.');
}
if (existsSync(secretos) || existsSync(envFile)) throw new Error('No sobrescribir secretos/configuración existente.');
mkdirSync(secretos, { recursive: true });
const claves = {};
for (const nombre of ['admin','migracion','control','app01','app02','app03']) {
  claves[nombre] = randomBytes(32).toString('base64url');
  writeFileSync(resolve(secretos, nombre + '.secret'), claves[nombre], { mode: 0o600, flag: 'wx' });
}
writeFileSync(resolve(secretos, 'semilla.secret'), randomBytes(32).toString('base64'), { mode: 0o600, flag: 'wx' });
const par = generateKeyPairSync('rsa', { modulusLength: 3072,
  publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
writeFileSync(resolve(secretos, 'identidad-privada.pem'), par.privateKey, { mode: 0o600, flag: 'wx' });
writeFileSync(resolve(secretos, 'identidad-publica.pem'), par.publicKey, { mode: 0o600, flag: 'wx' });
let comun = 'entorno=local\ncontrol.url=jdbc:postgresql://postgres:5432/ag016_control\n'
  + 'control.usuario=ag016_control_app\ncontrol.clave=' + claves.control + '\n'
  + 'semilla.ruta=/run/secrets/semilla.secret\nespacios=ag016_demo_01,ag016_demo_02,ag016_demo_03\n'
  + 'cupo=3\nduracion.minutos=60\npool.maximo=3\npeticiones.minuto=240\nautenticacion.minuto=30\nreservas.minuto=12\nalmacenamiento.bytes=268435456\nmetricas.segundos=10\n';
for (let i=1;i<=3;i++) {
  const id='ag016_demo_0'+i;
  comun += 'espacio.'+id+'.url=jdbc:postgresql://postgres:5432/'+id+'\n'
    +'espacio.'+id+'.usuario=ag016_app_0'+i+'\n'
    +'espacio.'+id+'.clave='+claves['app0'+i]+'\n';
}
writeFileSync(resolve(secretos,'runtime.properties'),comun,{mode:0o600,flag:'wx'});
writeFileSync(resolve(secretos,'provision.properties'),comun
  +'admin.url=jdbc:postgresql://postgres:5432/postgres\nadmin.usuario=ag016_provision\nadmin.clave='+claves.admin+'\n'
  +'migracion.usuario=gestion_migracion\nmigracion.clave='+claves.migracion+'\n',{mode:0o600,flag:'wx'});
const p=perfiles[perfil];
const valores={COMPOSE_PROJECT_NAME:proyecto,DEMO_ENTORNO:'local',DEMO_PERFILES:'demo,demo-local',
  AG016_SECRETOS_DIR:secretos.replaceAll('\\','/'),BACKEND_IMAGEN:'gestion-solicitudes-ag016-backend:local',
  FRONTEND_IMAGEN:'gestion-solicitudes-ag016-frontend:local',FRONTEND_PUERTO:puerto,PERFIL_RECURSOS:perfil,
  JAVA_MEMORIA:p.java+'m',PG_MEMORIA:p.pg+'m',WEB_MEMORIA:p.web+'m',PROVISION_MEMORIA:p.provision+'m',
  RESERVA_SO_MIB:p.so,JAVA_CPU:p.cpu[0],PG_CPU:p.cpu[1],WEB_CPU:p.cpu[2],PROVISION_CPU:p.cpu[3],RESERVA_SO_CPU:p.cpu[4]};
mkdirSync(resolve(envFile,'..'),{recursive:true});
writeFileSync(envFile,Object.entries(valores).map(([k,v])=>k+'='+v).join('\n')+'\n',{mode:0o600,flag:'wx'});
console.log(JSON.stringify({resultado:'PREPARADO',proyecto,perfil,puerto,secretos:'Archivos privados generados; valores omitidos',
  bases:['ag016_control','ag016_demo_01','ag016_demo_02','ag016_demo_03'],restoreAutorizado:'ag016_restore_qa'}));
