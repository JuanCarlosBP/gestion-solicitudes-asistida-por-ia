import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config, ciclo, sql, guardar } from './laboratorio.mjs';
import { ClienteDemo, exigir } from './cliente.mjs';
const nombre=process.env.AG016_EJECUCION;
if(!nombre||!/^[a-z0-9-]+$/.test(nombre))throw Error('Ejecución obligatoria.');
const archivo=resolve(config.env.AG016_SECRETOS_DIR,'runtime.properties');
const original=readFileSync(archivo,'utf8'),inicio=new Date().toISOString(),controles=[];
const comprobar=(c,criterio)=>{if(!c)throw Error(criterio);controles.push({criterio,estado:'PASS'});};
async function salud(){const fin=Date.now()+90000;while(Date.now()<fin){try{if((await fetch(config.base+'/api/salud',{signal:AbortSignal.timeout(3000)})).status===200)return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('Salud no recuperada');}
let fallo;
try{
 const a=new ClienteDemo(config.base);exigir(await a.reservar(),201,'Reserva previa al límite');exigir(await a.login('SOLICITANTE'),200,'Login');
 writeFileSync(archivo,original.replace(/^almacenamiento.bytes=\d+$/m,'almacenamiento.bytes=1'));
 ciclo('restart','backend');await salud();
 comprobar((await a.crear('Cuota ficticia')).estado===507,'Escritura de negocio rechazada por cuota');
 comprobar((await a.pedir('/api/solicitudes')).estado===200,'Lectura existente disponible');
 const b=new ClienteDemo(config.base);
 comprobar((await b.reservar()).estado===409,'No se admite reserva sobre bases que exceden el umbral');
 comprobar((await a.pedir('/api/autenticacion/cerrar-sesion',{metodo:'POST'})).estado===204,'Cierre real permitido pese a cuota');
 comprobar((await a.liberar()).estado===204,'Liberación permitida pese a cuota');
 const fin=Date.now()+15000;let drenado=false;
 while(Date.now()<fin){if(sql('ag016_control',"SELECT count(*) FROM demo.espacios WHERE estado='RECICLABLE';")!=='0'){drenado=true;break;}await new Promise(r=>setTimeout(r,500));}
 comprobar(drenado,'Drenaje y evento persistentes pese a cuota');
}catch(error){fallo=error.message;}
finally{writeFileSync(archivo,original);ciclo('restart','backend');await salud();}
guardar(nombre+'/resultado.json',{inicio,fin:new Date().toISOString(),estado:fallo?'FAIL':'PASS',controles,fallo,configuracionRestaurada:true});
console.log(JSON.stringify({estado:fallo?'FAIL':'PASS',controles:controles.length,fallo}));if(fallo)process.exitCode=1;
