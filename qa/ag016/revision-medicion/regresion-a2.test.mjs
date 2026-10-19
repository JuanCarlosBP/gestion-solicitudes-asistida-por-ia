import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {evaluarDatos as v4} from './evaluador-v4.mjs';
import {evaluarDatos as v5, recomendarPasadas} from './evaluador-v5.mjs';
import {auditarCadencia,conciliarContadores,agendaHistorica,agendaEntera,FASES,DESFASES} from './auditar-cadencia.mjs';
import plan from './planificador-carga.cjs';
const root=fs.realpathSync('.'),hash=b=>createHash('sha256').update(b).digest('hex');
const source=fs.readFileSync(path.join(root,'qa/ag016/carga.mjs'));
const {leerPasada}=await import(pathToFileURL(path.join(root,'qa/ag016/evaluar.mjs')).href);
const entradas={};
for(const s of ['a1','a2']) {
 const dir=path.join(root,'qa/evidencias/ag016');
 entradas[s]=leerPasada(path.join(dir,'carga-reloj-'+s),path.join(dir,'perfil-reloj-'+s,'perfil.json'));
 assert.deepEqual(entradas[s].datos.problemasLectura,[]);
 for(const f of entradas[s].fuentes)assert.equal(hash(fs.readFileSync(path.join(root,f.archivo))),f.sha256);
}
const a1=entradas.a1.datos,a2=entradas.a2.datos;
const positivo=()=>v5(a2,{planificador:'historico'});
const mutar=fn=>{const d=structuredClone(a2);fn(d);return v5(d,{sintetico:true,planificador:'historico'});};
test('Reproducir exactamente tres FAIL de A2 en v4',()=>{
 const r=v4(a2);assert.equal(r.criterios.length,78);assert.deepEqual(r.problemas.map(p=>p.codigo),['RESULTADO_ARNES','RECORRIDOS_NOMINALES','SLOTS_SIN_SOBRECARGA']);
});
test('Origen real reproduce61 nominales declarados y duplicación de frontera',()=>{
 const x=agendaHistorica(a2.inicio.origenMonoMs,0);assert.deepEqual(x.map(f=>f.objetivos.length),[20,61,30,40]);
 assert.equal(x[2].objetivos[0]-x[1].objetivos.at(-1),4.656612873077393e-10);
});
test('Traza real A2:330recorridos/8250peticiones;180nominales y90pico, sin slot ausente',()=>{
 const r=auditarCadencia(a2);assert.equal(r.estado,'PASS');assert.equal(r.peticiones,8250);assert.equal(r.nominal,180);assert.equal(r.pico,90);
 assert(r.porVisitante.every(v=>v.fases.every(f=>f.slotsAusentes===0&&f.slotsDuplicados===0)));
});
test('A2:conciliación acotada da80/80 sin cambiar muestras,latencias o cuotas',()=>{
 const prev=hash(JSON.stringify(a2));const r=positivo();assert.equal(r.estado,'PASS');assert.equal(r.criterios.length,80);
 assert.equal(r.reconciliacionHistorica.aplicada,true);assert.equal(r.reconciliacionHistorica.original.resultado,'FAIL');
 assert.equal(r.carga.nominal.validos,180);assert.equal(r.ventana.duracionObservadaMs,3900003.3816);
 const original=v4(a2);assert.deepEqual(r.carga.grupos,original.carga.grupos);assert.deepEqual(r.recursos,original.recursos);
 assert.equal(hash(JSON.stringify(a2)),prev);
});
test('A1:80/80 sin conciliación, manteniendo corrección CSRF/reloj anterior',()=>{
 const r=v5(a1,{planificador:'historico'});assert.equal(r.estado,'PASS');assert.equal(r.reconciliacionHistorica.aplicada,false);assert.equal(r.criterios.length,80);
});
test('Un FAIL con contador inválido no se concilia sin procedencia histórica',()=>{
 const r=v5(a2,{planificador:'entero'});assert.equal(r.estado,'FAIL');assert.equal(r.reconciliacionHistorica.aplicada,false);
});
test('La agenda entera mantiene20/60/30/40 y slots únicos en10.000orígenes y3visitantes',()=>{
 let semilla=160082026;
 for(let k=0;k<10000;k++){
  semilla=(Math.imul(1664525,semilla)+1013904223)>>>0;const o=semilla/10000;
  for(let i=0;i<3;i++){
   const r=agendaEntera(o,i);assert.deepEqual(r.map(f=>f.objetivos.length),[20,60,30,40]);
   const ts=r.flatMap(f=>f.objetivos);assert.equal(new Set(ts).size,150);assert(ts.every((v,n)=>n===0||v>ts[n-1]));
  }
 }
});
test('El código corregido cambia exclusivamente el for previsto',()=>{
 const text=source.toString('utf8'),c=plan.corregirFuente(source);assert.equal(c,text.replace(plan.viejo,plan.nuevo));
 assert.equal(c.replace(plan.nuevo,plan.viejo),text);
});
test('La agenda extraída del código real corregido equivale al simulador entero',()=>{
 const c=plan.corregirFuente(source),m=/for \(let relativoMs = ([\s\S]+?)const objetivo = origen \+ relativoMs;/.exec(c);
 assert(m);
 const ejecutar=new Function('origen','fase','DESFASES_VISITANTES_MS','indice',`const ts=[];${m[0]} ts.push(objetivo); } return ts;`);
 for(const origen of [0,0.1,86778.2803,100000.3333,99999999.9991])for(let i=0;i<3;i++){
  assert.deepEqual(FASES.map(f=>ejecutar(origen,f,DESFASES,i)),agendaEntera(origen,i).map(x=>x.objetivos));
 }
});
test('Rechaza fuente inesperada antes de transformar',()=>{assert.throws(()=>plan.corregirFuente(Buffer.concat([source,Buffer.from(' ')])));});
test('Imports absolutos solo para cuatro módulos originales',()=>{
 const c=plan.corregirFuente(source),e=plan.componerEjecutable(c,root);
 assert(!/from '\.\//.test(e));assert.equal((e.match(/from "file:/g)||[]).length,4);
});
const cases=[
 ['HTTP500 real',d=>d.peticiones.find(p=>p.fase==='nominal'&&p.operacion==='crear').status=500],
 ['HTTP429 real',d=>d.peticiones.find(p=>p.fase==='pico'&&p.operacion==='crear').status=429],
 ['Caducidad recibe200',d=>d.peticiones.find(p=>p.operacion==='inducido-caducidad').status=200],
 ['Petición nominal borrada',d=>d.peticiones.splice(d.peticiones.findIndex(p=>p.fase==='nominal'),1)],
 ['Petición nominal duplicada',d=>{const i=d.peticiones.findIndex(p=>p.fase==='nominal');d.peticiones.splice(i,0,{...d.peticiones[i]});}],
 ['Recorrido pico borrado',d=>{let n=25;d.peticiones=d.peticiones.filter(p=>!(n>0&&p.visitante==='A'&&p.fase==='pico'&&(n--)));}],
 ['Cambio fase para esconder extra',d=>d.peticiones.find(p=>p.fase==='pico'&&p.visitante==='A').fase='nominal'],
 ['Timestamp fuera de fase',d=>d.peticiones.find(p=>p.fase==='nominal').relativaMs=2400001],
 ['Timestamp NaN',d=>d.peticiones.find(p=>p.fase==='nominal').relativaMs=NaN],
 ['Ruta operacion desconocida',d=>d.peticiones.find(p=>p.fase==='nominal').operacion='otra'],
 ['Orden de acciones cambiado',d=>{const i=d.peticiones.findIndex(p=>p.fase==='nominal'&&p.visitante==='A');[d.peticiones[i],d.peticiones[i+1]]=[d.peticiones[i+1],d.peticiones[i]];}],
 ['Todas aprobaciones en lugar de alternancia',d=>{for(const p of d.peticiones)if(p.fase==='nominal'&&p.operacion==='rechazar')p.operacion='aprobar';}],
 ['Fallo de aserción con HTTP200',d=>{d.carga.incidencias.push({codigo:'DETALLE_FINAL_NO_COINCIDE',visitante:'A'});}],
 ['FalloPrincipal real',d=>d.carga.falloPrincipal='TRANSPORTE_TIMEOUT'],
 ['Evento fallo no resumido',d=>d.eventos.push({tipo:'INCIDENCIA',codigo:'REAL',visitante:'A'})],
 ['Otra sobrecarga',d=>d.eventos.push({tipo:'RECORRIDO_OMITIDO',visitante:'B',fase:'pico',motivo:'SOBRECARGA'})],
 ['Contadores B inconsistentes',d=>d.carga.recorridos[1].fases.nominal.validos--],
 ['Origen no reproduce redondeo',d=>d.inicio.origenMonoMs=0],
 ['Pausa nominal',d=>d.carga.recorridos[0].fases.nominal.omitidosPorPausa=1],
 ['Fallo de negocio',d=>d.carga.recorridos[0].fases.nominal.fallidos=1],
 ['Truncado pico',d=>d.carga.recorridos[0].fases.pico.truncadosAlCierre=1],
 ['Desfase distinto',d=>d.inicio.fases[1].intervaloMs=30001],
 ['Ventana64min',d=>d.fin.duracionObservadaMs=3840000],
 ['Muestras recursos ausentes',d=>d.recursos=[]],
 ['Timeoutreal genera slot invadido',d=>d.peticiones.find(p=>p.fase==='pico').ms=30000],
 ['Recorrido real en slot equivocado',d=>{for(const p of d.peticiones.filter(p=>p.fase==='pico'&&p.visitante==='A').slice(0,25))p.relativaMs+=10000;}],
 ['Pasada distinta no obtiene excepciónA2',d=>d.carga.ejecucion='carga-reloj-b1'],
 ['Operaciones sin evidencia',d=>d.carga.operaciones=[]],
 ['Contador operativo faltante',d=>delete d.carga.recorridos[0].fases.operaciones],
 ['Pérdida operativa real',d=>d.carga.recorridos[0].fases.operaciones.omitidosPorSobrecarga=1],
 ['Evento sobrecarga fuera del recorrido',d=>d.eventos.find(x=>x.tipo==='RECORRIDO_OMITIDO'&&x.motivo==='SOBRECARGA').fecha='2026-10-16T20:00:00Z'],
];
for(const [name,fn]of cases)test('Mutación sintética rechazada: '+name,()=>{
 const r=mutar(fn);assert.notEqual(r.estado,'PASS');assert.equal(r.elegibleParaRecomendacion,false);
});
test('Sin cuatro pasadas no recomienda VPS',()=>assert.equal(recomendarPasadas([v5(a1,{planificador:'historico'}),positivo()]).perfilCandidato,null));
test('Las fuentes originales permanecen byte a byte tras todas las pruebas',()=>{
 for(const x of Object.values(entradas))for(const f of x.fuentes)assert.equal(hash(fs.readFileSync(path.join(root,f.archivo))),f.sha256);
 assert.equal(hash(fs.readFileSync(path.join(root,'qa/ag016/carga.mjs'))),plan.SHA_ORIGINAL);
});
