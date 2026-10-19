import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { config, raiz, docker, composeArgs, identidad, ejecutar, ciclo, sql, guardar, exigirSinCarga } from './laboratorio.mjs';
const accion=process.argv[2];
const servicios=['postgres','provisionador','backend','frontend'];
const idEjecucion=process.env.AG016_EJECUCION;
if(!idEjecucion || !/^[a-z0-9-]+$/.test(idEjecucion))throw Error('AG016_EJECUCION obligatorio.');
const inicio=new Date().toISOString();
const ruta=resolve(raiz,'qa/evidencias/ag016',idEjecucion);
if(existsSync(ruta))throw Error('Ejecución ya existe.');
mkdirSync(ruta,{recursive:true});
let resultado;
try {
  if(accion==='validar'){
    docker([...composeArgs,'config','--quiet']);
    resultado={resultado:'CONFIGURACION_VALIDA',perfil:config.env.PERFIL_RECURSOS};
  }else if(accion==='iniciar-postgres'){
    const existentes=docker(['ps','-aq','--filter','label=com.docker.compose.project='+config.proyecto]).trim();
    const volumen=docker(['volume','ls','-q','--filter','name=^'+config.proyecto+'_datos-ag016$']).trim();
    if(existentes||volumen)throw Error('La inicialización exige proyecto/volumen nuevos; no reutilizar por accidente.');
    resultado=docker([...composeArgs,'up','-d','--no-deps','--wait','--wait-timeout','120','postgres']);
    identidad('postgres');
  }else if(['construir','construir-frontend'].includes(accion)){
    exigirSinCarga();
    // Fuera de la envolvente; nunca ejecutar mientras se mide.
    if(process.env.AG016_MEDICION_ACTIVA==='true')throw Error('No compilar durante medición.');
    const objetivos=accion==='construir-frontend'?[['frontend',config.env.FRONTEND_IMAGEN]]:[['backend',config.env.BACKEND_IMAGEN],['frontend',config.env.FRONTEND_IMAGEN]];
    for(const [directorio,imagen]of objetivos){
      const contexto=resolve(raiz,'tmp/ag016/imagenes',idEjecucion,directorio);
      mkdirSync(contexto,{recursive:true});
      copyFileSync(resolve(raiz,'infraestructura/demo',directorio+'.Dockerfile'),resolve(contexto,'Dockerfile'));
      if(directorio==='backend')copyFileSync(resolve(raiz,'backend/target/gestion-solicitudes-0.0.1.jar'),resolve(contexto,'aplicacion.jar'));
      else {
        cpSync(resolve(raiz,'frontend/dist/gestion-solicitudes-frontend/browser'),resolve(contexto,'browser'),{recursive:true,errorOnExist:true});
        copyFileSync(resolve(raiz,'infraestructura/demo/nginx-local.conf'),resolve(contexto,'nginx.conf'));
      }
      try{const salida=docker(['build','--progress=plain','-t',imagen,contexto],{timeout:900000,maxBuffer:32*1024*1024});
        writeFileSync(resolve(ruta,directorio+'.txt'),salida);
      }catch(error){writeFileSync(resolve(ruta,directorio+'.txt'),String(error.stdout??'')+'\n'+String(error.stderr??''));throw Error('Construcción fallida: '+directorio);}
    }
    resultado={jarSha256:createHash('sha256').update(readFileSync(resolve(raiz,'backend/target/gestion-solicitudes-0.0.1.jar'))).digest('hex'),backend:docker(['image','inspect','--format','{{.Id}}',config.env.BACKEND_IMAGEN]).trim(),
      frontend:docker(['image','inspect','--format','{{.Id}}',config.env.FRONTEND_IMAGEN]).trim()};
  }else if(['actualizar-aplicacion','actualizar-frontend'].includes(accion)){
    exigirSinCarga();
    if(process.env.AG016_MEDICION_ACTIVA==='true')throw Error('No cambiar imágenes durante medición.');
    const previos=JSON.parse(readFileSync(resolve(raiz,'qa/evidencias/ag016/recursos-previos.json'),'utf8')).contenedores.map(x=>x.split('|')[0]);
    const objetivos=accion==='actualizar-frontend'?['frontend']:['provisionador','backend','frontend'];
    const antes=objetivos.map(identidad);
    if(antes.some(i=>previos.some(p=>i.id.startsWith(p))))throw Error('Contenedor preexistente protegido.');
    identidad('postgres');
    for(const s of ['frontend','backend','provisionador'].filter(s=>objetivos.includes(s)))ciclo('stop',s);
    const comando=docker([...composeArgs,'up','-d','--no-deps','--no-build','--force-recreate',...objetivos]);
    const despues=objetivos.map(identidad);
    resultado={antes,despues,comando};
  }else if(accion==='iniciar-provisionador'){
    identidad('postgres');
    resultado=docker([...composeArgs,'up','-d','--no-deps','--no-recreate','provisionador']);
    identidad('provisionador');
  }else if(accion==='provisionar'){
    resultado=ejecutar('provisionador',['java','-Xmx96m','-jar','/aplicacion/aplicacion.jar','--demo-provisionar'],{timeout:120000});
  }else if(accion==='iniciar-web'){
    identidad('postgres'); identidad('provisionador');
    const t=performance.now();
    const comando=docker([...composeArgs,'up','-d','--no-deps','--no-recreate','backend','frontend']);
    const fin=Date.now()+90000;let disponible=false;
    while(Date.now()<fin){
      for(const servicio of ['backend','frontend'])if(identidad(servicio).estado!=='running')throw Error('Servicio detenido durante arranque: '+servicio);
      try{
        const salud=await fetch(config.base+'/api/salud',{signal:AbortSignal.timeout(3000)});
        const pagina=await fetch(config.base+'/demo',{signal:AbortSignal.timeout(3000)});
        if(salud.status===200&&pagina.status===200){disponible=true;break;}
      }catch{/* Solo sondeo de disponibilidad, no mutaciones. */}
      await new Promise(r=>setTimeout(r,500));
    }
    if(!disponible)throw Error('No disponible dentro de90s.');
    resultado={comando,arranqueMs:performance.now()-t,salud:200,paginaDemo:200};
  }else if(['stop','start','restart'].includes(accion)){
    const servicio=process.argv[3];if(!servicios.includes(servicio))throw Error('Servicio obligatorio.');
    resultado=ciclo(accion,servicio);
  }else if(accion==='cuotas'){
    resultado=[];
    for(const servicio of servicios){
      const i=identidad(servicio);
      const limites=JSON.parse(docker(['inspect','--format',
        '{"memoria":{{.HostConfig.Memory}},"swap":{{.HostConfig.MemorySwap}},"nanoCpus":{{.HostConfig.NanoCpus}},"reinicios":{{.RestartCount}},"oom":{{.State.OOMKilled}}}',i.id]));
      const cgroup=ejecutar(servicio,['/bin/sh','-c','for f in memory.max memory.swap.max cpu.max memory.current memory.stat cpu.stat io.stat; do printf "%s\\n" "$f"; cat "/sys/fs/cgroup/$f"; done']);
      resultado.push({servicio,id:i.id,limites,cgroup});
    }
  }else if(accion==='estado'){
    resultado={espacios:sql('ag016_control',"SELECT id||'|'||estado||'|'||generacion::text FROM demo.espacios ORDER BY id;"),
      salud:await fetch(config.base+'/api/salud').then(async r=>({estado:r.status,cuerpo:await r.json()}))};
  }else throw Error('Acción no autorizada.');
  guardar(idEjecucion+'/ejecucion.json',{inicio,fin:new Date().toISOString(),accion,resultado,estado:'PASS'});
  console.log(JSON.stringify({accion,estado:'PASS',evidencia:idEjecucion}));
}catch(error){
  guardar(idEjecucion+'/ejecucion.json',{inicio,fin:new Date().toISOString(),accion,estado:'FAIL',mensaje:error.message});
  console.error('Operación fallida; evidencia '+idEjecucion);process.exitCode=1;
}
