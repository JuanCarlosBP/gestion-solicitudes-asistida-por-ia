import { config, identidad, ciclo, sql, guardar, docker } from './laboratorio.mjs';
import { ClienteDemo, exigir } from './cliente.mjs';
const nombre=process.env.AG016_EJECUCION;
if(!nombre||!/^[a-z0-9-]+$/.test(nombre))throw Error('Ejecución obligatoria.');
const inicio=new Date().toISOString(),controles=[];
const comprobar=(valor,criterio)=>{if(!valor)throw Error(criterio);controles.push({criterio,resultado:'PASS'});};
const pausa=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const finSalud=Date.now()+90000;
 while(true){try{if((await fetch(config.base+'/api/salud')).status===200)break;}catch{}if(Date.now()>finSalud)throw Error('API no disponible');await pausa(500);}
 const i=identidad('provisionador');
 const entrada=JSON.parse(docker(['inspect','--format','{{json .Config.Entrypoint}}',i.id]));
 comprobar(i.estado==='running'&&entrada.includes('--demo-supervisar'),'Supervisor real persistente sin HTTP');
 const a=new ClienteDemo(config.base);
 exigir(await a.reservar(),201,'Reserva');exigir(await a.login('SOLICITANTE'),200,'Autenticación');
 const anterior=a.copiar(),contexto={...a.contexto};
 comprobar(['ag016_demo_01','ag016_demo_02','ag016_demo_03'].includes(contexto.espacio),'Espacio recibido dentro del inventario cerrado');
 exigir(await a.crear('Reciclaje automático ficticio'),201,'Crear');
 exigir(await a.liberar(),204,'Liberar');
 const t=performance.now(),fin=Date.now()+120000;let nuevo;
 while(Date.now()<fin){
  const fila=sql('ag016_control',`SELECT estado||'|'||generacion::text FROM demo.espacios WHERE id='${contexto.espacio}';`);
  if(fila.startsWith('BLOQUEADO|'))throw Error('Reciclaje automático bloqueado');
  if(fila.startsWith('LISTO|')){nuevo=fila.split('|')[1];break;}
  await pausa(500);
 }
 comprobar(nuevo&&nuevo!==contexto.generacion,'Liberación produce generación nueva automáticamente');
 comprobar((await anterior.pedir('/api/solicitudes')).estado===401,'Sesión antigua denegada después del reciclaje');
 comprobar(sql(contexto.espacio,'SELECT count(*) FROM gestion.solicitudes;')==='0','Nueva generación sin solicitudes anteriores');
 const reciclajeMs=performance.now()-t;
 const previoApagado=identidad('provisionador');
 comprobar(previoApagado.estado==='running','Supervisor sigue activo justo antes de enviar señal');
 const apagar=performance.now();ciclo('stop','provisionador');const apagadoMs=performance.now()-apagar;
 const detenido=identidad('provisionador');
 const salida=JSON.parse(docker(['inspect','--format','{"exitCode":{{.State.ExitCode}},"oom":{{.State.OOMKilled}}}',detenido.id]));
 comprobar(detenido.estado==='exited'&&apagadoMs<35000&&!salida.oom&&[0,143].includes(salida.exitCode),'Apagado por señal con salida0/143 sin SIGKILL/OOM dentro de35s');
 comprobar(sql('ag016_control',"SELECT count(*) FROM pg_stat_activity WHERE usename='gestion_migracion';")==='0','Sin conexión migradora después del apagado');
 ciclo('start','provisionador');
 comprobar(identidad('provisionador').estado==='running','Supervisor vuelve a iniciar');
 guardar(nombre+'/resultado.json',{inicio,fin:new Date().toISOString(),estado:'PASS',controles,reciclajeMs,apagadoMs,previoApagado,detenido,salida});
 console.log(JSON.stringify({estado:'PASS',controles:controles.length,reciclajeMs,apagadoMs}));
}catch(error){guardar(nombre+'/resultado.json',{inicio,fin:new Date().toISOString(),estado:'FAIL',controles,fallo:error.message});console.error(error.message);process.exitCode=1;}
