// Integración del supervisor continuo de 008 en CI efímera. La prueba manual histórica se conserva.
import { randomUUID } from 'node:crypto';
import { config, guardar, sql, ciclo } from '../ag016/laboratorio.mjs';
import { ClienteDemo, exigir } from '../ag016/cliente.mjs';
const nombre=process.env.AG016_EJECUCION;
if(!nombre||!/^[a-z0-9-]+$/.test(nombre))throw Error('AG016_EJECUCION obligatorio.');
const inicio=new Date().toISOString(),controles=[],mediciones=[];
const medir=m=>mediciones.push(m),nuevo=()=>new ClienteDemo(config.base,medir);
const comprobar=(condicion,criterio)=>{if(!condicion)throw Error('Incumplido: '+criterio);controles.push({criterio,resultado:'PASS'});};
async function esperarEstado(id,estado){
 const fin=Date.now()+90000;let muestras=0;
 while(Date.now()<fin){muestras++;if(sql('ag016_control',"SELECT estado FROM demo.espacios WHERE id='"+id+"';")===estado)return muestras;
 await new Promise(r=>setTimeout(r,250));}
 throw Error('Transición esperada no observada: '+estado);
}
let etapa='reserva',error;
try{
 const a=nuevo(),b=nuevo(),c=nuevo(),d=nuevo();
 for(const [i,v]of [a,b,c].entries()){exigir(await v.reservar(),201,'Reserva'+i);comprobar(v.contexto?.reservaId&&v.contexto?.generacion,'Contexto de reserva'+i);}
 comprobar(new Set([a,b,c].map(v=>v.contexto.espacio)).size===3,'Tres espacios exclusivos');
 comprobar((await d.reservar()).estado===409,'Cuarto visitante recibe409sin compartir');
 for(const v of [a,b,c])exigir(await v.login('SOLICITANTE'),200,'Login real');
 etapa='aislamiento';
 const borrador=exigir(await a.crear('AG016 espacio A '+randomUUID()),201,'CrearA');
 comprobar((await b.pedir('/api/solicitudes/'+borrador.id)).estado===404,'B no lee recurso A');
 comprobar((await c.pedir('/api/solicitudes/'+borrador.id)).estado===404,'C no lee recurso A');
 comprobar((await a.pedir('/api/solicitudes',{selector:null})).estado===401,'Contexto ausente denegado');
 comprobar((await a.pedir('/api/solicitudes',{selector:b.selector()})).estado===401,'Selector B con cookieA denegado');
 comprobar((await b.pedir('/api/solicitudes',{bearer:a.token})).estado===401,'JWT A con reservaB denegado');
 comprobar((await b.pedir('/api/solicitudes',{selector:a.selector(),bearer:a.token})).estado===401,'SelectorJWT A no sustituyen cookieB');
 comprobar((await a.pedir('/api/solicitudes',{metodo:'POST',cuerpo:{asunto:'Sin CSRF'},clave:randomUUID(),csrf:false})).estado===403,'CSRF conservado');
 for(let i=0;i<12;i++){
   comprobar((await a.pedir('/api/solicitudes/'+borrador.id)).estado===200,'Conexión reutilizadaA-'+i);
   comprobar((await b.pedir('/api/solicitudes/'+borrador.id)).estado===404,'Conexión reutilizadaB-'+i);
 }
 const viejoRol=a.copiar();
 exigir(await a.login('AUDITOR'),200,'Cambio rol auditor');
 comprobar((await a.pedir('/api/historial')).estado===200,'Auditor historia propia');
 comprobar((await a.crear('Auditor no escribe')).estado===403,'Auditor no obtiene escritura');
 comprobar((await viejoRol.pedir('/api/solicitudes')).estado===401,'Cambio rol revoca sid anterior');
 exigir(await b.login('AUDITOR'),200,'AuditorB');
 const historiaB=exigir(await b.pedir('/api/historial'),200,'HistoriaB');
 comprobar(!JSON.stringify(historiaB).includes(borrador.id),'Historial globalB no incluyeA');
 etapa='reinicio';
 const antes=b.copiar();
 ciclo('restart','backend');
 const fin=Date.now()+90000;let saludable=false;
 while(Date.now()<fin){
   try{if((await nuevo().pedir('/api/salud')).estado===200){saludable=true;break;}}catch{}
   await new Promise(r=>setTimeout(r,500));
 }
 comprobar(saludable,'Reinicio recupera salud dentro90s');
 comprobar((await antes.pedir('/api/historial')).estado===200,'Reserva/JWT persistentes tras reinicio');
 etapa='reciclaje';
 const vieja=a.copiar(),id=a.contexto.espacio,generacion=a.contexto.generacion;
 exigir(await a.liberar(),204,'LiberarA');
 comprobar((await vieja.pedir('/api/historial')).estado===401,'Reserva revocada denegada tras liberar');
 // Se ejecuta el supervisor real, sin exigir observar el estado transitorio RECICLABLE.
 // La revocación y el destino LISTO son comprobaciones separadas, no se admite otro estado.
 await esperarEstado(id,'LISTO');
 comprobar(sql('ag016_control',"SELECT estado FROM demo.espacios WHERE id='"+id+"';")==='LISTO','Supervisor real prepara espacio reciclado');
 const e=nuevo();exigir(await e.reservar(),201,'Reserva nueva');
 comprobar(e.contexto.espacio===id&&e.contexto.generacion!==generacion,'Reasignación cambia generación');
 exigir(await e.login('SOLICITANTE'),200,'Nueva cuenta');
 comprobar((await vieja.pedir('/api/solicitudes')).estado===401,'CookiesJWT anteriores no acceden reasignado');
 const viejoRefresh=e.copiar();viejoRefresh.cookies.set('REFRESH-TOKEN',vieja.cookies.get('REFRESH-TOKEN'));
 comprobar((await viejoRefresh.renovar()).estado===401,'Refresh antiguo con nueva reserva denegado');
 comprobar((await e.pedir('/api/solicitudes/'+borrador.id)).estado===404,'Datos anteriores no aparecen reasignados');
 comprobar((await b.pedir('/api/historial')).estado===200,'B sigue intacto tras reciclajeA');
 for(const v of [b,c,e])exigir(await v.liberar(),204,'Liberación final');
}catch(e){error={etapa,mensaje:e.message};}
guardar(nombre+'/resultado.json',{inicio,fin:new Date().toISOString(),estado:error?'FAIL':'PASS',controles,mediciones,error});
console.log(JSON.stringify({estado:error?'FAIL':'PASS',controles:controles.length,error}));
if(error)process.exitCode=1;
