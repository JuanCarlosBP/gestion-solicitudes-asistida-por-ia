import { sql, guardar, ejecutar, identidad, docker, exigirSinCarga } from './laboratorio.mjs';
exigirSinCarga();
const nombre=process.env.AG016_EJECUCION;
if(!nombre||!/^[a-z0-9-]+$/.test(nombre))throw Error('Ejecución explícita obligatoria.');
const inicio=new Date().toISOString();
const antes=sql('ag016_control','SELECT id,estado,generacion FROM demo.espacios ORDER BY id;');
// Operación privada de laboratorio: retirar reservas abandonadas por QA fallida.
// No borra historial ni da por drenada una conexión; lo hace el runtime.
const retiradas=sql('ag016_control',`WITH retiradas AS (
 UPDATE demo.espacios SET estado='DRENANDO'
 WHERE id IN ('ag016_demo_01','ag016_demo_02','ag016_demo_03') AND estado='RESERVADO'
 RETURNING id,generacion
) INSERT INTO demo.eventos(id,espacio,generacion,tipo,instante)
 SELECT gen_random_uuid(),id,generacion,'REVOCACION_OPERADOR_QA',clock_timestamp() FROM retiradas RETURNING espacio;`);
const fin=Date.now()+30000;
while(sql('ag016_control',"SELECT count(*) FROM demo.espacios WHERE estado='DRENANDO';")!=='0'){
 if(Date.now()>fin)throw Error('Drenaje pendiente; no provisionar.');
 await new Promise(r=>setTimeout(r,500));
}
const i=identidad('provisionador');
const entrada=JSON.parse(docker(['inspect','--format','{{json .Config.Entrypoint}}',i.id]));
let provision;
if(entrada.includes('--demo-supervisar')){
 if(i.estado!=='running')throw Error('Supervisor detenido; no iniciar un lote paralelo.');
 const plazo=Date.now()+120000;
 while(sql('ag016_control',"SELECT count(*) FROM demo.espacios WHERE estado='LISTO';")!=='3'){
  if(sql('ag016_control',"SELECT count(*) FROM demo.espacios WHERE estado='BLOQUEADO';")!=='0')throw Error('Espacio bloqueado: requiere diagnóstico.');
  if(Date.now()>plazo)throw Error('Supervisor no terminó de preparar tres espacios.');
  await new Promise(r=>setTimeout(r,1000));
 }
 provision='Supervisor permanente: tres espacios LISTO, sin iniciar otra JVM.';
}else{
 provision=ejecutar('provisionador',['java','-Xmx96m','-jar','/aplicacion/aplicacion.jar','--demo-provisionar']);
}
const despues=sql('ag016_control','SELECT id,estado,generacion FROM demo.espacios ORDER BY id;');
guardar(nombre+'/revocacion.json',{inicio,fin:new Date().toISOString(),antes,retiradas,despues,provision,estado:'PASS'});
console.log(JSON.stringify({estado:'PASS',operacion:'revocacion privada QA y provisión',evidencia:nombre}));
