"""Revisión derivada de muestras conservadas. Solo escribe resultados externos al repositorio."""
from pathlib import Path
from datetime import datetime, timezone
import json, hashlib, zipfile
ROOT=Path('/mnt/data/cierre008_revision_final')
RAW=ROOT/'resultados'
OUT=ROOT/'entrega'
OUT.mkdir(exist_ok=True)
def sha(b): return hashlib.sha256(b).hexdigest()
def ms(s): return datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()*1000
manifest=json.loads((RAW/'MANIFIESTO_EXPORTACION.json').read_text())
items=manifest['archivos']
checks=[]
for a in items:
 p=RAW/a['archivo'].replace('\\','/')
 b=p.read_bytes()
 assert len(b)==a['bytes'] and sha(b)==a['sha256'], a['archivo']
 checks.append({'archivo':a['archivo'],'bytes':len(b),'sha256':sha(b),'coincide':True})
assert len(checks)==148
rows=[]
for name in ['a1','a2','b1','b2']:
 folder=RAW/'evidencias'/f'carga-reloj-{name}'
 e=json.loads((folder/'evaluacion-revision-v5.json').read_text())
 assert e['estado']=='PASS' and len(e['criterios'])==80
 assert all(c['estado']=='PASS' for c in e['criterios'])
 budget=1 if name.startswith('a') else 2
 cpu={}
 for phase in ['nominal','pico','operaciones']:
  parts=[x for x in e['recursos']['cpuIO'] if x['fase']==phase]
  grouped={}
  for x in parts:
   t=grouped.setdefault(x['servicio'],{'cpuUs':0,'duracionMs':0,'periodos':0,'limitados':0,'limitadoUs':0,'maxCores':0})
   t['cpuUs']+=x['cpuUsoUs'];t['duracionMs']+=x['duracionMs'];t['periodos']+=x['periodos'];t['limitados']+=x['periodosLimitados'];t['limitadoUs']+=x['limitadoUs'];t['maxCores']=max(t['maxCores'],x['cpuMaximaCores'])
  for x in grouped.values():
   x['coresMedios']=x['cpuUs']/(1000*x['duracionMs'])
   x['porcentajePeriodosLimitados']=100*x['limitados']/x['periodos'] if x['periodos'] else None
  cpu[phase]={'servicios':grouped,'porcentajePresupuestoTotalMedia':sum(v['coresMedios'] for v in grouped.values())/budget*100}
 # CPU sostenida derivada de intervalos consecutivos de todos los cgroups; nunca cruzar un reinicio.
 samples=[json.loads(s) for s in (folder/'recursos.jsonl').read_text().splitlines() if s.strip()]
 origin=ms(e['ventana']['inicio']); segments=[]; chain=[]
 def close():
  if chain: segments.append(chain.copy());chain.clear()
 for prev,cur in zip(samples,samples[1:]):
  start=ms(prev['fecha']);end=ms(cur['fecha']);dt=end-start
  if not (origin+600000 <= start < end < origin+2400000 and 0<dt<=30000): close();continue
  aa={x['servicio']:x for x in prev.get('servicios',[])};bb={x['servicio']:x for x in cur.get('servicios',[])}
  names=['backend','frontend','postgres','provisionador'];valid=True;us=0
  for n in names:
   a=aa.get(n,{});b=bb.get(n,{})
   if a.get('estado')!='running' or b.get('estado')!='running' or (a.get('id'),a.get('iniciadoEn')) != (b.get('id'),b.get('iniciadoEn')): valid=False;break
   u=a.get('cpu',{}).get('usage_usec');v=b.get('cpu',{}).get('usage_usec')
   if not isinstance(u,(int,float)) or not isinstance(v,(int,float)) or v<u:valid=False;break
   us+=v-u
  if not valid: close();continue
  if chain and chain[-1]['hastaMs'] != start:close()
  chain.append({'desdeMs':start,'hastaMs':end,'duracionMs':dt,'cpuUs':us})
 close()
 windows=[]
 for seg in segments:
  for j in range(len(seg)):
   total=0;elapsed=0
   for k in range(j,len(seg)):
    total+=seg[k]['cpuUs'];elapsed+=seg[k]['duracionMs']
    if elapsed>=300000:
     windows.append({'desde':datetime.fromtimestamp(seg[j]['desdeMs']/1000,timezone.utc).isoformat(),'duracionMs':elapsed,'porcentaje':total/(1000*elapsed)/budget*100})
     break
 assert windows, name
 nom=e['recursos']['nominal']
 latency={}
 for fase in ['nominal','pico']:
  selected=[x for x in e['carga']['grupos'] if x['fase']==fase and not x['inducida']]
  latency[fase]={}
  for category,limit in [('lectura',500),('escritura',1000),('acceso',2000)]:
   vals=[x for x in selected if x['umbralMs']==limit]
   worst=max(vals,key=lambda x:x['p95'])
   latency[fase][category]={'maximoDeP95PorOperacionMs':worst['p95'],'operacion':worst['operacion']}
 arranque=next(c['observado'] for c in e['criterios'] if c['codigo']=='ARRANQUE')
 row={'pasada':name.upper(),'perfil':e['perfil'],'duracionMs':e['ventana']['duracionObservadaMs'],'inicio':e['ventana']['inicio'],'fin':e['ventana']['fin'],'criteriosPass':80,
 'cgroupsNominalMaxMiB':nom['maximaMemoriaBytes']/1048576,'reservaSoMiB':nom['reservaSOBytes']/1048576,
 'presupuestoNominalMiB':(nom['maximaMemoriaBytes']+nom['reservaSOBytes'])/1048576,'proporcionRamNominalPct':nom['proporcionRAM']*100,
 'margenNominalPct':nom['margenRAM']*100,'presupuestoTodasFasesMaxMiB':max(x['memoriaMaxBytes'] for x in e['recursos']['porFase'])/1048576+nom['reservaSOBytes']/1048576,
 'cpu':cpu,'maximaMediaCpuVentanas5minNominal':max(windows,key=lambda x:x['porcentaje']),'ventanas5minCalculadas':len(windows),
 'latencia':latency,'arranqueMs':arranque,'conexionesMaximas':e['recursos']['conexionesMaximas'],
 'cadencia':{k:e['auditoriaCadencia'][k] for k in ['recorridos','calentamiento','nominal','pico','peticiones']},
 'slotsAusentesNominalPico':sum(x['slotsAusentes'] for v in e['auditoriaCadencia']['porVisitante'] for x in v['fases'] if x['fase'] in ['nominal','pico']),
 'slotsDuplicadosNominalPico':sum(x['slotsDuplicados'] for v in e['auditoriaCadencia']['porVisitante'] for x in v['fases'] if x['fase'] in ['nominal','pico']),
 'retrasoAgendaNominalPicoMaxMs':max(x['maximoRetrasoInicioMs'] for v in e['auditoriaCadencia']['porVisitante'] for x in v['fases'] if x['fase'] in ['nominal','pico'])}
 rows.append(row)
 (OUT/f'CPU_VENTANAS_{name.upper()}.json').write_text(json.dumps({'metodo':'Primer intervalo consecutivo >=300 s por inicio, limitado a nominal; sin cambio de identidad/proceso; suma de cuatro cgroups, no CPU SO/VM anfitriona. Sin umbral PASS inventado.','ventanas':windows},indent=2,ensure_ascii=False)+'\n')
result={'fuenteZip':'DEVOLVER_CIERRE_008_V3.zip','sha256Zip':sha(Path('/mnt/data/DEVOLVER_CIERRE_008_V3.zip').read_bytes()),'archivosContrastados':len(checks),
'pasadas':rows,'minutosCargaObservada':sum(r['duracionMs'] for r in rows)/60000,
'metodo':'Relectura y recálculo offline; no nuevas cargas. La reserva SO es presupuesto fijo del protocolo, no consumo del anfitrión medido. CPU nominal suma de cgroups; los máximos de p95 NO son un p95 global ni un promedio de pasadas. Las colas internas de Hikari/SO no se instrumentaron directamente.'}
(OUT/'REVISION_CAPACIDAD_008.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
(OUT/'INTEGRIDAD_RECIBIDA.json').write_text(json.dumps({'sha256Zip':result['sha256Zip'],'archivos':checks},indent=2,ensure_ascii=False)+'\n')
for r in rows:
 print(r['pasada'], 'RAM',round(r['presupuestoNominalMiB'],2),round(r['proporcionRamNominalPct'],2),'CPU',round(r['cpu']['nominal']['porcentajePresupuestoTotalMedia'],2),'5minMAX',round(r['maximaMediaCpuVentanas5minNominal']['porcentaje'],2),'login',r['latencia']['nominal']['acceso'],'slots',r['slotsAusentesNominalPico'],'agenda',r['retrasoAgendaNominalPicoMaxMs'])
print(result['sha256Zip'], result['minutosCargaObservada'])
