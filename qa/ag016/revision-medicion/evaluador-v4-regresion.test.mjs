import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluarDatos} from './evaluador-v4.mjs';
import {evaluarDatos as evaluarAnterior} from './evaluador-v3-original.mjs';
import {datosSinteticos} from './fixture-sintetico.mjs';
const evaluar=d=>evaluarDatos(d,{sintetico:true});
const cad=(d,v='B')=>evaluar(d).criterios.find(c=>c.codigo===`CADUCIDAD_PERSISTIDA_${v}`);
const barrera=d=>d.eventos.find(e=>e.visitante==='B'&&e.tipo==='BARRERA_CADUCIDAD_CONFIRMADA');
const lectura=d=>d.eventos.find(e=>e.visitante==='B'&&e.tipo==='OBSERVACION_CADUCIDAD');
function caso(){const d=datosSinteticos();barrera(d).duracionMs+=0.0073;return d;}
test('reproducción: v3 rechaza dos lecturas del reloj separadas7,3µs; v4 verifica el orden',()=>{
 const d=caso();assert.equal(evaluarAnterior(d,{sintetico:true}).estado,'FAIL');
 assert.deepEqual(evaluarAnterior(d,{sintetico:true}).problemas,[{codigo:'CADUCIDAD_PERSISTIDA_B',estado:'FAIL'}]);
 const r=evaluar(d);assert.equal(r.estado,'PASS');assert.equal(r.elegibleParaRecomendacion,false);
});
for(const extra of [0,0.0004,0.0073,0.5,1,10,99.99,100])test(`duración engloba prelectura real ${extra}ms sin ampliar plazo`,()=>{
 const d=datosSinteticos();barrera(d).duracionMs+=extra;assert.equal(cad(d).estado,'PASS');
});
for(const [nombre,mutar] of [
 ['inicio reconstruido después de primera lectura',d=>barrera(d).duracionMs=399.99],
 ['inicio reconstruido anterior a referencia',d=>barrera(d).duracionMs=500.01],
 ['duración negativa',d=>barrera(d).duracionMs=-1],
 ['duración NaN',d=>barrera(d).duracionMs=NaN],
 ['duración ausente',d=>delete barrera(d).duracionMs],
 ['fin distinto del observado',d=>barrera(d).finRelativoMs+=0.01],
 ['sonda previa a barrera',d=>d.peticiones.find(p=>p.visitante==='B'&&p.operacion==='inducido-caducidad').relativaMs=barrera(d).finRelativoMs-10],
 ['sonda200',d=>d.peticiones.find(p=>p.visitante==='B'&&p.operacion==='inducido-caducidad').status=200],
 ['GET401 duplicada',d=>d.peticiones.push({...d.peticiones.find(p=>p.visitante==='B'&&p.operacion==='inducido-caducidad')})],
 ['otra generación',d=>lectura(d).observacion.generacion='16008000-0000-4000-8000-000000000001'],
 ['otra identidad backend',d=>lectura(d).observacion.identidad.backend='f'.repeat(64)],
 ['TTL no coherente',d=>lectura(d).observacion.ttlCoherente=false],
 ['límite120s ampliado',d=>barrera(d).limiteRelativoMs+=1],
 ['observación demasiado lenta',d=>lectura(d).observacion.duracionMs=10001],
 ['observación fallida no ocultada',d=>d.eventos.push({tipo:'OBSERVACION_CADUCIDAD_FALLIDA',visitante:'B'})],
 ['barrera duplicada',d=>d.eventos.push({...barrera(d)})],
 ['última observación incongruente',d=>barrera(d).ultimaObservacion.posterior=false],
 ['fin fuera de ventana',d=>{lectura(d).finRelativoMs=3900001;barrera(d).finRelativoMs=3900001;}],
])test('sigue rechazando '+nombre,()=>{const d=caso();mutar(d);assert.notEqual(cad(d).estado,'PASS');});
test('los límites de latencia, RAM y tamaño de ventana siguen intactos',()=>{
 const d=caso();for(const p of d.peticiones)if(p.fase==='nominal'&&p.operacion==='crear')p.ms=1001;
 assert(evaluar(d).problemas.some(p=>p.codigo==='LATENCIA_nominal_crear'&&p.estado==='FAIL'));
 const c=caso();c.fin.duracionObservadaMs=3899999;assert(evaluar(c).problemas.some(p=>p.codigo==='VENTANA_COMPLETA'));
});
