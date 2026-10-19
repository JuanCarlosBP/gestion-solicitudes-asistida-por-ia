import { identidad, ejecutar, sql, docker } from './laboratorio.mjs';
const servicios=['backend','postgres','frontend','provisionador'];
function pares(texto){return Object.fromEntries(texto.trim().split('\n').map(l=>l.trim().split(/\s+/)).filter(p=>p.length===2).map(([k,v])=>[k,Number(v)]));}
export function muestraRecursos(){
 const muestra={fecha:new Date().toISOString(),servicios:[]};
 for(const servicio of servicios){
  const i=identidad(servicio);
  const salida=ejecutar(servicio,['/bin/sh','-c','for f in memory.current memory.swap.current memory.stat memory.events cpu.stat io.stat; do echo "$f"; cat "/sys/fs/cgroup/$f"; done']);
  const bloques={};let actual;
  for(const linea of salida.trim().split('\n')){
   if(/^(memory\.(current|swap.current|stat|events)|cpu.stat|io.stat)$/.test(linea)){actual=linea;bloques[actual]=[];}
   else if(actual)bloques[actual].push(linea);
  }
  const datos={servicio,id:i.id,estado:i.estado,iniciadoEn:i.iniciadoEn,memoriaBytes:Number(bloques['memory.current'].join('')),swapBytes:Number(bloques['memory.swap.current'].join('')),
   memoria:pares(bloques['memory.stat'].join('\n')),eventos:pares(bloques['memory.events'].join('\n')),cpu:pares(bloques['cpu.stat'].join('\n')),io:bloques['io.stat']};
  if(['backend','provisionador'].includes(servicio)){
   const rss=ejecutar(servicio,['/bin/sh','-c','cat /proc/1/smaps_rollup']);
   datos.proceso=Object.fromEntries(rss.split('\n').filter(l=>/^(Rss|Pss|Private_Clean|Private_Dirty|Shared_Clean|Shared_Dirty|Swap):/.test(l)).map(l=>{const p=l.trim().split(/\s+/);return[p[0].replace(':',''),Number(p[1])*1024];}));
  }
  muestra.servicios.push(datos);
 }
 muestra.conexiones=sql('ag016_control',"SELECT datname||'|'||coalesce(state,'proceso')||'|'||count(*) FROM pg_stat_activity WHERE datname IS NOT NULL GROUP BY datname,state ORDER BY datname,state;");
 muestra.bytesBases=sql('ag016_control',"SELECT datname||'|'||pg_database_size(datname) FROM pg_database WHERE datname LIKE 'ag016_%' ORDER BY datname;");
 return muestra;
}
export function limitesActuales(){
 return servicios.map(servicio=>{
  const i=identidad(servicio);
  return {servicio,id:i.id,iniciadoEn:i.iniciadoEn,...JSON.parse(docker(['inspect','--format','{"imagen":{{json .Image}},"memoria":{{.HostConfig.Memory}},"swap":{{.HostConfig.MemorySwap}},"nanoCpus":{{.HostConfig.NanoCpus}},"reinicios":{{.RestartCount}},"oom":{{.State.OOMKilled}}}',i.id])),
   cgroup:ejecutar(servicio,['/bin/sh','-c','cat /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory.swap.max /sys/fs/cgroup/cpu.max']).trim()};
 });
}
export function percentiles(valores){
 const a=[...valores].sort((x,y)=>x-y);
 const p=q=>a.length?a[Math.ceil(a.length*q)-1]:null;
 return {muestras:a.length,p50:p(.5),p95:p(.95),p99:p(.99),maximo:a.at(-1)??null};
}
