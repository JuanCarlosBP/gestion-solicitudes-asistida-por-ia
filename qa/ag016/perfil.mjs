import { writeFileSync } from 'node:fs';
import { config, identidad, ciclo, docker, sql, guardar, exigirSinCarga } from './laboratorio.mjs';
import { limitesActuales } from './metricas.mjs';
import { plazoArranque } from './plazo-arranque.mjs';
const perfil=process.env.AG016_PERFIL,nombre=process.env.AG016_EJECUCION;
exigirSinCarga();
const perfiles={A:{mem:[960,512,64,256],cpu:[.55,.25,.05,.05],soMiB:256,soCPU:.10},
 B:{mem:[2048,1024,128,384],cpu:[1.15,.50,.05,.20],soMiB:512,soCPU:.10}};
if(!perfiles[perfil]||!nombre||!/^[a-z0-9-]+$/.test(nombre))throw Error('Perfil A/B y ejecución obligatorios. C exige decisión sustentada en fallos A/B.');
if(sql('ag016_control',"SELECT count(*) FROM demo.espacios WHERE estado NOT IN ('LISTO','RECICLABLE');")!=='0')throw Error('Resolver reservas/drenaje antes de cambiar perfil.');
const inicio=new Date().toISOString(),p=perfiles[perfil],servicios=['backend','postgres','frontend','provisionador'];
for(const s of ['frontend','backend','provisionador','postgres'])ciclo('stop',s);
const cambios=[];
for(const [n,s]of servicios.entries()){
 const i=identidad(s);
 docker(['update','--memory',p.mem[n]+'m','--memory-swap',p.mem[n]+'m','--cpus',String(p.cpu[n]),i.id]);
 cambios.push({servicio:s,id:i.id,memoriaMiB:p.mem[n],cpu:p.cpu[n]});
}
Object.assign(config.env,{PERFIL_RECURSOS:perfil,JAVA_MEMORIA:p.mem[0]+'m',PG_MEMORIA:p.mem[1]+'m',WEB_MEMORIA:p.mem[2]+'m',PROVISION_MEMORIA:p.mem[3]+'m',
 JAVA_CPU:p.cpu[0],PG_CPU:p.cpu[1],WEB_CPU:p.cpu[2],PROVISION_CPU:p.cpu[3],RESERVA_SO_MIB:p.soMiB,RESERVA_SO_CPU:p.soCPU});
writeFileSync(config.envFile,Object.entries(config.env).map(([k,v])=>k+'='+v).join('\n')+'\n');
const plazo=plazoArranque();
ciclo('start','postgres');ciclo('start','provisionador');
while(true){try{sql('ag016_control','SELECT 1;');break;}catch{if(!plazo.pendiente())throw Error('PostgreSQL no disponible dentro del plazo conjunto.');await new Promise(r=>setTimeout(r,500));}}
ciclo('start','backend');ciclo('start','frontend');
let saludable=false;
while(plazo.pendiente()){try{if((await fetch(config.base+'/api/salud',{signal:AbortSignal.timeout(3000)})).status===200){saludable=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
if(!saludable)throw Error('Arranque conjunto sin salud en90s.');
const arranqueConjuntoMs=plazo.comprobar();
const resultado={inicio,fin:new Date().toISOString(),perfil,cambios,arranqueConjuntoMs,limites:limitesActuales(),
 envolventeMiB:p.mem.reduce((a,b)=>a+b,0)+p.soMiB,envolventeCPU:p.cpu.reduce((a,b)=>a+b,0)+p.soCPU,reservaSO:{MiB:p.soMiB,cpu:p.soCPU},
 interpretacion:'Arranque de procesos detenidos, sin purgar cachés del host. Cuotas efectivas por cgroup cuya suma más reserva cabe en perfil; SO/Docker compartido del host no aislado. No equivale a un VPS contratado.'};
guardar(nombre+'/perfil.json',resultado);console.log(JSON.stringify({estado:'PASS',perfil,arranqueMs:resultado.arranqueConjuntoMs}));
