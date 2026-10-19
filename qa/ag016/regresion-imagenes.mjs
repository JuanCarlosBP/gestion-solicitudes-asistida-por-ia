import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { argumentosCompose, ejecutarDocker } from '../docker-contexto.mjs';
import { prepararDirectorioEvidencias, raizProyecto } from '../rutas-evidencia.mjs';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
const compose=argumentosCompose();
if(compose[2]!=='gestion-solicitudes-ag016-regresion')throw Error('Solo laboratorio AG016 de regresión.');
const nombre=process.env.AG016_EJECUCION;
if(!nombre||!/^[a-z0-9-]+$/.test(nombre))throw Error('Ejecución obligatoria.');
const carpeta=prepararDirectorioEvidencias('qa/evidencias/ag016/'+nombre);
const ruta=resolve(carpeta,'resultado.json');
const ejecutar=args=>execFileSync('docker',args,{cwd:raizProyecto,encoding:'utf8',windowsHide:true,timeout:120000,stdio:['pipe','pipe','pipe']});
const previos=JSON.parse(readFileSync(resolve(raizProyecto,'qa/evidencias/ag016/recursos-previos.json'),'utf8')).contenedores.map(x=>x.split('|')[0]);
function identidad(servicio){
 const id=ejecutar([...compose,'ps','-a','-q',servicio]).trim();
 if(!/^[a-f0-9]{64}$/.test(id))throw Error('ID no único');
 const formato='{{.Id}}|{{index .Config.Labels "com.docker.compose.project"}}|{{index .Config.Labels "com.docker.compose.service"}}';
 if(ejecutar(['inspect','--format',formato,id]).trim()!==id+'|'+compose[2]+'|'+servicio)throw Error('Identidad ajena');
 if(previos.some(p=>id.startsWith(p)))throw Error('Contenedor histórico protegido');
 return {servicio,id};
}
const inicio=new Date().toISOString();
const objetivos=process.argv[2]==='frontend'?['frontend']:['frontend','backend'];
if(process.argv[2]&&process.argv[2]!=='frontend')throw Error('Solo se admite actualizar frontend o ambos servicios sin argumento.');
try{
 const antes=['postgres','backend','frontend'].map(identidad);
 await ejecutarDocker('docker',[...compose,'stop',...objetivos]);
 await ejecutarDocker('docker',[...compose,'start','postgres']);
 ejecutar([...compose,'up','-d','--no-deps','--no-build','--force-recreate',...objetivos]);
 const despues=['postgres','backend','frontend'].map(identidad);
 const fin=Date.now()+90000;let disponible=false;
 while(Date.now()<fin){try{if((await fetch('http://127.0.0.1:18087/api/salud',{signal:AbortSignal.timeout(3000)})).status===200){disponible=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
 if(!disponible)throw Error('Regresión no disponible en90s');
 writeFileSync(ruta,JSON.stringify({inicio,fin:new Date().toISOString(),estado:'PASS',objetivos,antes,despues},null,2),{flag:'wx'});
 console.log('PASS: imágenes de regresión actualizadas y API disponible.');
}catch{writeFileSync(ruta,JSON.stringify({inicio,fin:new Date().toISOString(),estado:'FAIL',mensaje:'Operación incompleta; se omite salida Docker potencialmente sensible.'},null,2),{flag:'wx'});process.exitCode=1;}
